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
            // 1. Validar Formando
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == dto.FormandoId);
            if (formando == null) throw new Exception("Formando não encontrado.");

            // 2. Validar Curso
            var curso = await _context.Cursos.FindAsync(dto.CursoId);
            if (curso == null) throw new Exception("Curso não encontrado.");

            // 3. Validar duplicados (Já tem candidatura a este curso?)
            bool jaInscrito = await _context.Inscricoes
                .AnyAsync(i => i.CursoId == dto.CursoId && i.FormandoId == dto.FormandoId);
            if (jaInscrito) throw new Exception("Já existe uma candidatura para este curso.");

            // 4. Criar Candidatura (Sem Turma)
            var inscricao = new Inscricao
            {
                CursoId = dto.CursoId,
                FormandoId = dto.FormandoId,
                TurmaId = null, // Fica null até a secretaria decidir
                DataInscricao = DateTime.UtcNow,
                Estado = "Candidatura"
            };

            _context.Inscricoes.Add(inscricao);
            await _context.SaveChangesAsync();

            return await MapToDto(inscricao.Id);
        }

        public async Task<InscricaoDto> AssociarTurmaAsync(int inscricaoId, int turmaId)
        {
            var inscricao = await _context.Inscricoes.FindAsync(inscricaoId);
            if (inscricao == null) throw new Exception("Candidatura não encontrada.");

            var turma = await _context.Turmas.FindAsync(turmaId);
            if (turma == null) throw new Exception("Turma não encontrada.");

            // Verificar se a turma pertence ao mesmo curso da candidatura
            if (turma.CursoId != inscricao.CursoId)
                throw new Exception("Esta turma não pertence ao curso da candidatura.");

            // Atualizar
            inscricao.TurmaId = turmaId;
            inscricao.Estado = "Ativo"; // Passa a ser aluno efetivo

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

            return list.Select(ToDto); // Agora o ToDto existe (ver fundo do ficheiro)
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