using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class InscricaoService : IInscricaoService
    {
        private readonly AppDbContext _context;

        public InscricaoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<InscricaoDto> InscreverAlunoAsync(CreateCandidaturaDto dto)
        {
            // 1. Validar Formando e Incluir User para editar dados
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == dto.FormandoId);

            if (formando == null) throw new Exception("Formando não encontrado.");
            if (formando.User == null) throw new Exception("Utilizador associado não encontrado.");

            // 2. Atualizar Dados Pessoais do User (se enviados)
            bool dadosAlterados = false;
            if (!string.IsNullOrWhiteSpace(dto.Telefone)) { formando.User.Telefone = dto.Telefone; dadosAlterados = true; }
            if (!string.IsNullOrWhiteSpace(dto.NIF)) { formando.User.NIF = dto.NIF; dadosAlterados = true; }
            if (!string.IsNullOrWhiteSpace(dto.Morada)) { formando.User.Morada = dto.Morada; dadosAlterados = true; }
            if (!string.IsNullOrWhiteSpace(dto.CC)) { formando.User.CC = dto.CC; dadosAlterados = true; }

            // 3. Validar Curso
            var curso = await _context.Cursos.FindAsync(dto.CursoId);
            if (curso == null) throw new Exception("Curso não encontrado.");

            // 4. Validar duplicados
            bool jaInscrito = await _context.Inscricoes
                .AnyAsync(i => i.CursoId == dto.CursoId && i.FormandoId == dto.FormandoId);
            if (jaInscrito) throw new Exception("Já existe uma candidatura para este curso.");

            // 5. Criar Candidatura
            var inscricao = new Inscricao
            {
                CursoId = dto.CursoId,
                FormandoId = dto.FormandoId,
                TurmaId = null,
                DataInscricao = DateTime.UtcNow,
                Estado = "Candidatura"
            };

            _context.Inscricoes.Add(inscricao);

            // Guarda tudo (Inscricao + Updates ao User) numa única transação
            await _context.SaveChangesAsync();

            return await MapToDto(inscricao.Id);
        }

        private async Task PromoverParaAlunoEfetivo(int formandoId)
        {
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == formandoId);

            if (formando == null || formando.User == null) return;

            // Atualizar Role para Formando (caso ainda esteja como User/Candidato)
            if (formando.User.Role == "User")
            {
                formando.User.Role = "Formando";
            }

            // Gerar Número de Aluno (se ainda tiver o temporário "CAND-")
            if (formando.NumeroAluno.StartsWith("CAND-"))
            {
                // Formato: T + Mês(2) + Ano(2) + ID_User(padding)
                // Exemplo: Fevereiro 2026, User ID 15 -> T0226015
                var hoje = DateTime.UtcNow;
                string mes = hoje.Month.ToString("00");
                string ano = hoje.Year.ToString().Substring(2, 2); // Últimos 2 dígitos
                string idStr = formando.UserId.ToString().PadLeft(3, '0'); // Garante pelo menos 3 digitos

                string novoNumero = $"T{mes}{ano}{idStr}";

                // Verificar se por azar já existe (raro, mas seguro)
                while (await _context.Formandos.AnyAsync(f => f.NumeroAluno == novoNumero))
                {
                    novoNumero += "X";
                }

                formando.NumeroAluno = novoNumero;
            }

        }

        public async Task<InscricaoDto> AssociarTurmaAsync(int inscricaoId, int turmaId)
        {
            var inscricao = await _context.Inscricoes
                .Include(i => i.Formando) // Precisamos do formando para promover
                .FirstOrDefaultAsync(i => i.Id == inscricaoId);

            if (inscricao == null) throw new Exception("Candidatura não encontrada.");

            var turma = await _context.Turmas.FindAsync(turmaId);
            if (turma == null) throw new Exception("Turma não encontrada.");

            if (turma.CursoId != inscricao.CursoId)
                throw new Exception("Esta turma não pertence ao curso da candidatura.");

            // Atualizar Inscrição
            inscricao.TurmaId = turmaId;
            inscricao.Estado = "Ativo";

            // --- PROMOVER ALUNO E GERAR NÚMERO ---
            await PromoverParaAlunoEfetivo(inscricao.FormandoId);

            await _context.SaveChangesAsync();
            return await MapToDto(inscricao.Id);
        }


        // Obter todas as candidaturas pendentes (sem turma atribuída)
        public async Task<IEnumerable<InscricaoDto>> GetCandidaturasPendentesAsync()
        {
            var list = await _context.Inscricoes
                .Where(i => i.TurmaId == null && i.Estado == "Candidatura")
                .Include(i => i.Curso)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .OrderBy(i => i.DataInscricao)
                .ToListAsync();

            return list.Select(ToDto);
        }

        //Obter candidaturas pendentes filtradas por curso
        public async Task<IEnumerable<InscricaoDto>> GetCandidaturasPendentesPorCursoAsync(int cursoId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.TurmaId == null && i.Estado == "Candidatura" && i.CursoId == cursoId)
                .Include(i => i.Curso)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .OrderBy(i => i.DataInscricao)
                .ToListAsync();

            return list.Select(ToDto);
        }

        public async Task<IEnumerable<InscricaoDto>> AprovarCandidaturasEmLoteAsync(AprovarLoteDto dto)
        {
            var turma = await _context.Turmas.FindAsync(dto.TurmaId);
            if (turma == null) throw new Exception("Turma não encontrada.");

            var inscricoes = await _context.Inscricoes
                .Where(i => dto.InscricaoIds.Contains(i.Id))
                .ToListAsync();

            if (inscricoes.Count == 0) throw new Exception("Nenhuma inscrição encontrada.");
            if (inscricoes.Any(i => i.CursoId != turma.CursoId))
                throw new Exception("Algumas candidaturas não pertencem ao curso desta turma.");

            foreach (var inscricao in inscricoes)
            {
                inscricao.TurmaId = dto.TurmaId;
                inscricao.Estado = "Ativo";

                // --- PROMOVER CADA ALUNO ---
                await PromoverParaAlunoEfetivo(inscricao.FormandoId);
            }

            await _context.SaveChangesAsync();

            // Retorno... (código existente mantem-se igual)
            var ids = inscricoes.Select(i => i.Id).ToList();
            var result = await _context.Inscricoes
                .Where(i => ids.Contains(i.Id))
                .Include(i => i.Turma)
                .Include(i => i.Curso)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .ToListAsync();

            return result.Select(ToDto);
        }

        // Rejeitar uma candidatura (muda estado para "Rejeitado")
        public async Task<InscricaoDto> RejeitarCandidaturaAsync(int inscricaoId, string? motivo = null)
        {
            var inscricao = await _context.Inscricoes.FindAsync(inscricaoId);
            if (inscricao == null) throw new Exception("Candidatura não encontrada.");

            if (inscricao.Estado != "Candidatura")
                throw new Exception("Apenas candidaturas pendentes podem ser rejeitadas.");

            inscricao.Estado = "Rejeitado";
            // Se quiseres guardar o motivo, adiciona um campo na entidade Inscricao

            await _context.SaveChangesAsync();
            return await MapToDto(inscricao.Id);
        }

        public async Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.TurmaId == turmaId)
                .Include(i => i.Turma)
                .Include(i => i.Curso)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .ToListAsync();

            return list.Select(ToDto);
        }

        public async Task<IEnumerable<InscricaoDto>> GetInscricoesByAlunoAsync(int formandoId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.FormandoId == formandoId)
                .Include(i => i.Turma)
                .Include(i => i.Curso)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .ToListAsync();

            return list.Select(ToDto);
        }

        public async Task<bool> RemoverInscricaoAsync(int inscricaoId)
        {
            var inscricao = await _context.Inscricoes.FindAsync(inscricaoId);
            if (inscricao == null) return false;

            _context.Inscricoes.Remove(inscricao);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- MÉTODOS AUXILIARES ---

        private async Task<InscricaoDto> MapToDto(int id)
        {
            var i = await _context.Inscricoes
                .Include(x => x.Turma)
                .Include(x => x.Curso)
                .Include(x => x.Formando).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(x => x.Id == id);

            return ToDto(i!);
        }

        private static InscricaoDto ToDto(Inscricao i)
        {
            return new InscricaoDto
            {
                Id = i.Id,
                TurmaId = i.TurmaId,
                TurmaNome = i.Turma?.Nome ?? "A aguardar colocação",
                CursoId = i.CursoId,
                CursoNome = i.Curso?.Nome ?? "N/A",
                FormandoId = i.FormandoId,
                FormandoNome = i.Formando?.User?.Nome ?? "N/A",
                DataInscricao = i.DataInscricao,
                Estado = i.Estado
            };
        }
    }
}