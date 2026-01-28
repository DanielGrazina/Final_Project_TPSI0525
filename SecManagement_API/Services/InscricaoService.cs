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

        public async Task<InscricaoDto> InscreverAlunoAsync(CreateInscricaoDto dto)
        {
            // 1. Validar se o Formando existe (tabela Formandos)
            // Declaramos a variável 'formando' AQUI pela primeira e única vez
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == dto.FormandoId);

            if (formando == null) throw new Exception("Formando não encontrado.");

            // 2. Validar Turma
            var turma = await _context.Turmas.FindAsync(dto.TurmaId);
            if (turma == null) throw new Exception("Turma não encontrada.");

            // 3. Validar duplicados
            bool jaInscrito = await _context.Inscricoes
                .AnyAsync(i => i.TurmaId == dto.TurmaId && i.FormandoId == dto.FormandoId);

            if (jaInscrito) throw new Exception("O formando já está inscrito nesta turma.");

            // 4. Detetar se é um candidato (Número começa por CAND-)
            // Reutilizamos a variável 'formando' declarada no passo 1
            bool isCandidato = formando.NumeroAluno.StartsWith("CAND-");

            // 5. Criar Inscrição
            var inscricao = new Inscricao
            {
                TurmaId = dto.TurmaId,
                FormandoId = dto.FormandoId,
                CursoId = turma.CursoId,
                DataInscricao = DateTime.UtcNow,
                // Se for candidato fica Pendente, senão fica Ativo
                Estado = isCandidato ? "Pendente" : "Ativo"
            };

            _context.Inscricoes.Add(inscricao);
            await _context.SaveChangesAsync();

            // 6. Retornar DTO usando o método auxiliar
            return await MapToDto(inscricao.Id);
        }

        public async Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.TurmaId == turmaId)
                .Include(i => i.Turma)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .ToListAsync();

            return list.Select(ToDto);
        }

        public async Task<IEnumerable<InscricaoDto>> GetInscricoesByAlunoAsync(int formandoId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.FormandoId == formandoId)
                .Include(i => i.Turma)
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

        // --- MÉTODOS AUXILIARES QUE FALTAVAM ---

        private async Task<InscricaoDto> MapToDto(int id)
        {
            var i = await _context.Inscricoes
                .Include(x => x.Turma)
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
                TurmaNome = i.Turma?.Nome ?? "N/A",
                FormandoId = i.FormandoId,
                FormandoNome = i.Formando?.User?.Nome ?? "N/A",
                DataInscricao = i.DataInscricao,
                Estado = i.Estado
            };
        }
    }
}