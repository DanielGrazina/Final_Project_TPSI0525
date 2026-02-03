using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class AvaliacaoService : IAvaliacaoService
    {
        private readonly AppDbContext _context;

        public AvaliacaoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AvaliacaoDto>> GetAllAsync()
        {
            var notas = await _context.Avaliacoes
                .Include(a => a.Inscricao).ThenInclude(i => i.Formando).ThenInclude(f => f.User)
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(a => a.Turma)
                .ToListAsync();

            return notas.Select(ToDto);
        }

        public async Task<AvaliacaoDto> LancarNotaAsync(CreateAvaliacaoDto dto, int userId, string role)
        {
            // Validar Módulo e obter quem é o formador responsável
            var modulo = await _context.TurmaModulos
                .Include(tm => tm.Modulo)
                .Include(tm => tm.Formador)
                .FirstOrDefaultAsync(tm => tm.Id == dto.TurmaModuloId && tm.TurmaId == dto.TurmaId);

            if (modulo == null) throw new Exception("O módulo indicado não pertence a esta turma.");

            // === SEGURANÇA: Verificar se o user tem permissão ===
            if (role == "Formador")
            {
                // Verifica se o user logado é o dono deste módulo
                if (modulo.Formador?.UserId != userId)
                    throw new Exception("Sem permissão: Apenas o formador responsável por este módulo pode lançar notas.");
            }
            else if (role != "Secretaria" && role != "Admin")
            {
                throw new Exception("Sem permissão para lançar notas.");
            }

            // Validar Inscrição
            var inscricao = await _context.Inscricoes
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .Include(i => i.Turma)
                .FirstOrDefaultAsync(i => i.Id == dto.InscricaoId && i.TurmaId == dto.TurmaId);

            if (inscricao == null) throw new Exception("O aluno indicado não está inscrito nesta turma.");

            // Criar
            var avaliacao = new Avaliacao
            {
                TurmaId = dto.TurmaId,
                InscricaoId = dto.InscricaoId,
                TurmaModuloId = dto.TurmaModuloId,
                AvaliacaoValor = dto.Avaliacao,
                Observacoes = dto.Observacoes
            };

            _context.Avaliacoes.Add(avaliacao);
            await _context.SaveChangesAsync();

            return ToDtoCompleto(avaliacao, inscricao, modulo);
        }

        public async Task<AvaliacaoDto> UpdateNotaAsync(int id, CreateAvaliacaoDto dto, int userId, string role)
        {
            var avaliacao = await _context.Avaliacoes
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Formador)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (avaliacao == null) throw new Exception("Avaliação não encontrada.");

            // === SEGURANÇA ===
            if (role == "Formador")
            {
                if (avaliacao.TurmaModulo?.Formador?.UserId != userId)
                    throw new Exception("Sem permissão: Não é o formador responsável por esta nota.");
            }
            else if (role != "Secretaria" && role != "Admin")
            {
                throw new Exception("Sem permissão.");
            }

            // Atualizar campos
            avaliacao.AvaliacaoValor = dto.Avaliacao;
            avaliacao.Observacoes = dto.Observacoes;
            // Nota: Geralmente não deixamos mudar o Aluno ou Turma na edição, apenas a nota.

            await _context.SaveChangesAsync();

            // Recarregar dados para devolver DTO bonito
            return await GetByIdInternalAsync(id);
        }

        public async Task<IEnumerable<AvaliacaoDto>> GetNotasByTurmaAsync(int turmaId)
        {
            var notas = await _context.Avaliacoes
                .Where(a => a.TurmaId == turmaId)
                .Include(a => a.Inscricao).ThenInclude(i => i.Formando).ThenInclude(f => f.User)
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(a => a.Turma)
                .ToListAsync();

            return notas.Select(ToDto);
        }

        public async Task<IEnumerable<AvaliacaoDto>> GetNotasByAlunoAsync(int formandoId)
        {
            // Busca todas as notas de um aluno (em qualquer turma)
            var notas = await _context.Avaliacoes
                .Where(a => a.Inscricao.FormandoId == formandoId)
                .Include(a => a.Inscricao).ThenInclude(i => i.Formando).ThenInclude(f => f.User)
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Include(a => a.Turma)
                .ToListAsync();

            return notas.Select(ToDto);
        }

        public async Task<bool> DeleteNotaAsync(int id, int userId, string role)
        {
            var av = await _context.Avaliacoes
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Formador)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (av == null) return false;

            // === SEGURANÇA ===
            if (role == "Formador")
            {
                if (av.TurmaModulo?.Formador?.UserId != userId)
                    throw new Exception("Sem permissão para apagar esta nota.");
            }
            else if (role != "Secretaria" && role != "Admin")
            {
                throw new Exception("Sem permissão.");
            }

            _context.Avaliacoes.Remove(av);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- HELPERS ---
        private async Task<AvaliacaoDto> GetByIdInternalAsync(int id)
        {
            var a = await _context.Avaliacoes
                 .Include(a => a.Inscricao).ThenInclude(i => i.Formando).ThenInclude(f => f.User)
                 .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Modulo)
                 .Include(a => a.Turma)
                 .FirstOrDefaultAsync(x => x.Id == id);
            return ToDto(a!);
        }
        private static AvaliacaoDto ToDto(Avaliacao a)
        {
            return new AvaliacaoDto
            {
                Id = a.Id,
                TurmaId = a.TurmaId,
                TurmaNome = a.Turma?.Nome ?? "",
                InscricaoId = a.InscricaoId,
                FormandoNome = a.Inscricao?.Formando?.User?.Nome ?? "Desconhecido",
                TurmaModuloId = a.TurmaModuloId,
                ModuloNome = a.TurmaModulo?.Modulo?.Nome ?? "Módulo",
                Avaliacao = a.AvaliacaoValor,
                Observacoes = a.Observacoes
            };
        }
        private static AvaliacaoDto ToDtoCompleto(Avaliacao a, Inscricao i, TurmaModulo tm)
        {
            return new AvaliacaoDto
            {
                Id = a.Id,
                TurmaId = a.TurmaId,
                TurmaNome = i.Turma?.Nome ?? "",
                InscricaoId = a.InscricaoId,
                FormandoNome = i.Formando?.User?.Nome ?? "Aluno",
                TurmaModuloId = a.TurmaModuloId,
                ModuloNome = tm.Modulo?.Nome ?? "Módulo",
                Avaliacao = a.AvaliacaoValor,
                Observacoes = a.Observacoes
            };
        }
    }
}