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

        public async Task<AvaliacaoDto> LancarNotaAsync(CreateAvaliacaoDto dto)
        {
            // 1. Validar se a Inscrição pertence à Turma
            var inscricao = await _context.Inscricoes
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .Include(i => i.Turma)
                .FirstOrDefaultAsync(i => i.Id == dto.InscricaoId && i.TurmaId == dto.TurmaId);

            if (inscricao == null)
                throw new Exception("O aluno indicado não está inscrito nesta turma.");

            // 2. Validar se o Módulo pertence à Turma
            var modulo = await _context.TurmaModulos
                .Include(tm => tm.Modulo)
                .FirstOrDefaultAsync(tm => tm.Id == dto.TurmaModuloId && tm.TurmaId == dto.TurmaId);

            if (modulo == null)
                throw new Exception("O módulo indicado não pertence a esta turma.");

            // 3. Criar Avaliação
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

            return new AvaliacaoDto
            {
                Id = avaliacao.Id,
                TurmaId = dto.TurmaId,
                TurmaNome = inscricao.Turma?.Nome ?? "",
                InscricaoId = dto.InscricaoId,
                FormandoNome = inscricao.Formando?.User?.Nome ?? "Aluno",
                TurmaModuloId = dto.TurmaModuloId,
                ModuloNome = modulo.Modulo?.Nome ?? "Módulo",
                Avaliacao = avaliacao.AvaliacaoValor,
                Observacoes = avaliacao.Observacoes
            };
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

        public async Task<bool> DeleteNotaAsync(int id)
        {
            var av = await _context.Avaliacoes.FindAsync(id);
            if (av == null) return false;

            _context.Avaliacoes.Remove(av);
            await _context.SaveChangesAsync();
            return true;
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
    }
}