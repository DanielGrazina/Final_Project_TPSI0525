using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class TurmaService : ITurmaService
    {
        private readonly AppDbContext _context;

        public TurmaService(AppDbContext context)
        {
            _context = context;
        }

        // --- TURMAS ---

        public async Task<IEnumerable<TurmaDto>> GetAllAsync()
        {
            var turmas = await _context.Turmas
                .Include(t => t.Curso)
                // Incluir Coordenador e o User associado para obter o nome
                .Include(t => t.Coordenador).ThenInclude(f => f.User)
                .ToListAsync();

            return turmas.Select(MapToDto);
        }

        public async Task<TurmaDto?> GetByIdAsync(int id)
        {
            var t = await _context.Turmas
                .Include(x => x.Curso)
                .Include(x => x.Coordenador).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (t == null) return null;

            return MapToDto(t);
        }

        public async Task<TurmaDto> CreateAsync(CreateTurmaDto dto)
        {
            // Validar Curso
            if (!await _context.Cursos.AnyAsync(c => c.Id == dto.CursoId))
                throw new Exception("Curso não encontrado.");

            // Validar Coordenador (se for enviado)
            if (dto.CoordenadorId.HasValue)
            {
                if (!await _context.Formadores.AnyAsync(f => f.Id == dto.CoordenadorId))
                    throw new Exception("Coordenador (Formador) não encontrado.");
            }

            var turma = new Turma
            {
                Nome = dto.Nome,
                CursoId = dto.CursoId,
                CoordenadorId = dto.CoordenadorId, // Novo campo
                DataInicio = dto.DataInicio,
                DataFim = dto.DataFim,
                Local = dto.Local,
                Estado = "Planeada" // Default
            };

            _context.Turmas.Add(turma);
            await _context.SaveChangesAsync();

            // Retornamos usando o GetById para garantir que todos os Includes (nomes) vêm preenchidos
            var novaTurma = await GetByIdAsync(turma.Id);
            return novaTurma!;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var turma = await _context.Turmas.FindAsync(id);
            if (turma == null) return false;

            // Validar dependências
            bool temAlunos = await _context.Inscricoes.AnyAsync(i => i.TurmaId == id);
            bool temModulos = await _context.TurmaModulos.AnyAsync(tm => tm.TurmaId == id);

            if (temAlunos || temModulos)
                throw new Exception("Não é possível apagar turmas com alunos ou módulos associados.");

            _context.Turmas.Remove(turma);
            await _context.SaveChangesAsync();
            return true;
        }

        // --- DISTRIBUIÇÃO (Turma Modulos) ---

        public async Task<TurmaModuloDto> AddModuloAsync(CreateTurmaModuloDto dto)
        {
            if (!await _context.Turmas.AnyAsync(x => x.Id == dto.TurmaId)) throw new Exception("Turma inválida");
            if (!await _context.Modulos.AnyAsync(x => x.Id == dto.ModuloId)) throw new Exception("Módulo inválido");
            if (!await _context.Formadores.AnyAsync(x => x.Id == dto.FormadorId)) throw new Exception("Formador inválido");

            var tm = new TurmaModulo
            {
                TurmaId = dto.TurmaId,
                ModuloId = dto.ModuloId,
                FormadorId = dto.FormadorId,
                Sequencia = dto.Sequencia
            };

            _context.TurmaModulos.Add(tm);
            await _context.SaveChangesAsync();

            // Recarregar para DTO
            var result = await _context.TurmaModulos
                .Include(x => x.Turma)
                .Include(x => x.Modulo)
                .Include(x => x.Formador).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(x => x.Id == tm.Id);

            return MapToDto(result!);
        }

        public async Task<bool> RemoveModuloAsync(int turmaModuloId)
        {
            var tm = await _context.TurmaModulos.FindAsync(turmaModuloId);
            if (tm == null) return false;

            _context.TurmaModulos.Remove(tm);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<TurmaModuloDto>> GetModulosByTurmaAsync(int turmaId)
        {
            var list = await _context.TurmaModulos
                .Where(tm => tm.TurmaId == turmaId)
                .Include(tm => tm.Turma)
                .Include(tm => tm.Modulo)
                .Include(tm => tm.Formador).ThenInclude(f => f.User)
                .ToListAsync();

            return list.Select(MapToDto);
        }

        // --- MÉTODOS AUXILIARES (Helpers) ---

        private static TurmaDto MapToDto(Turma t)
        {
            return new TurmaDto
            {
                Id = t.Id,
                Nome = t.Nome,
                CursoId = t.CursoId,
                CursoNome = t.Curso?.Nome ?? "N/A",

                // Mapeamento do Coordenador
                CoordenadorId = t.CoordenadorId,
                CoordenadorNome = t.Coordenador?.User?.Nome ?? "Sem Coordenador",

                DataInicio = t.DataInicio,
                DataFim = t.DataFim,
                Local = t.Local,
                Estado = t.Estado
            };
        }

        private static TurmaModuloDto MapToDto(TurmaModulo tm)
        {
            return new TurmaModuloDto
            {
                Id = tm.Id,
                TurmaId = tm.TurmaId,
                TurmaNome = tm.Turma?.Nome ?? "",
                ModuloId = tm.ModuloId,
                ModuloNome = tm.Modulo?.Nome ?? "",
                FormadorId = tm.FormadorId,
                FormadorNome = tm.Formador?.User?.Nome ?? "Formador #" + tm.FormadorId,
                Sequencia = tm.Sequencia
            };
        }
    }
}