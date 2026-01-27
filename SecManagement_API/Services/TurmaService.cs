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
            return await _context.Turmas
                .Include(t => t.Curso)
                .Select(t => new TurmaDto
                {
                    Id = t.Id,
                    Nome = t.Nome,
                    DataInicio = t.DataInicio,
                    DataFim = t.DataFim,
                    Local = t.Local,
                    Estado = t.Estado,
                    CursoId = t.CursoId,
                    CursoNome = t.Curso != null ? t.Curso.Nome : "N/A"
                })
                .ToListAsync();
        }

        public async Task<TurmaDto?> GetByIdAsync(int id)
        {
            var t = await _context.Turmas
                .Include(x => x.Curso)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (t == null) return null;

            return new TurmaDto
            {
                Id = t.Id,
                Nome = t.Nome,
                DataInicio = t.DataInicio,
                DataFim = t.DataFim,
                Local = t.Local,
                Estado = t.Estado,
                CursoId = t.CursoId,
                CursoNome = t.Curso?.Nome ?? "N/A"
            };
        }

        public async Task<TurmaDto> CreateAsync(CreateTurmaDto dto)
        {
            // Validar Curso
            if (!await _context.Cursos.AnyAsync(c => c.Id == dto.CursoId))
                throw new Exception("Curso não encontrado.");

            var turma = new Turma
            {
                Nome = dto.Nome,
                DataInicio = dto.DataInicio,
                DataFim = dto.DataFim,
                Local = dto.Local,
                CursoId = dto.CursoId,
                Estado = "Planeada"
            };

            _context.Turmas.Add(turma);
            await _context.SaveChangesAsync();

            // Retornar DTO preenchido
            var curso = await _context.Cursos.FindAsync(dto.CursoId);
            return new TurmaDto
            {
                Id = turma.Id,
                Nome = turma.Nome,
                DataInicio = turma.DataInicio,
                DataFim = turma.DataFim,
                Local = turma.Local,
                Estado = turma.Estado,
                CursoId = turma.CursoId,
                CursoNome = curso?.Nome ?? ""
            };
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
            // Validar existencia de Turma, Modulo e Formador
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

            // Recarregar com Includes para devolver nomes
            var result = await _context.TurmaModulos
                .Include(x => x.Turma)
                .Include(x => x.Modulo)
                .Include(x => x.Formador).ThenInclude(f => f.User) // Para ir buscar o Nome do User se necessário
                .FirstOrDefaultAsync(x => x.Id == tm.Id);

            string nomeFormador = "N/A";
            if (result?.Formador != null)
            {
                nomeFormador = result.Formador.User?.Email ?? "Formador #" + result.FormadorId;
            }

            return new TurmaModuloDto
            {
                Id = result!.Id,
                TurmaId = result.TurmaId,
                TurmaNome = result.Turma?.Nome ?? "",
                ModuloId = result.ModuloId,
                ModuloNome = result.Modulo?.Nome ?? "",
                FormadorId = result.FormadorId,
                FormadorNome = nomeFormador,
                Sequencia = result.Sequencia
            };
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

            return list.Select(tm => new TurmaModuloDto
            {
                Id = tm.Id,
                TurmaId = tm.TurmaId,
                TurmaNome = tm.Turma?.Nome ?? "",
                ModuloId = tm.ModuloId,
                ModuloNome = tm.Modulo?.Nome ?? "",
                FormadorId = tm.FormadorId,
                FormadorNome = tm.Formador?.User?.Email ?? "ID: " + tm.FormadorId, // Ajustar para Nome se tiveres
                Sequencia = tm.Sequencia
            });
        }

        // --- INSCRIÇÕES ---

        public async Task<InscricaoDto> InscreverAlunoAsync(CreateInscricaoDto dto)
        {
            // Validar se já está inscrito
            bool jaInscrito = await _context.Inscricoes
                .AnyAsync(i => i.TurmaId == dto.TurmaId && i.FormandoId == dto.FormandoId);

            if (jaInscrito) throw new Exception("O formando já está inscrito nesta turma.");

            // Criar inscrição
            var inscricao = new Inscricao
            {
                TurmaId = dto.TurmaId,
                FormandoId = dto.FormandoId,
                DataInscricao = DateTime.Now,
                Estado = "Ativo",
                // Preenchemos o CursoId redundante com base na Turma
                CursoId = (await _context.Turmas.FindAsync(dto.TurmaId))!.CursoId
            };

            _context.Inscricoes.Add(inscricao);
            await _context.SaveChangesAsync();

            // Preparar retorno
            var loaded = await _context.Inscricoes
                .Include(i => i.Turma)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .FirstOrDefaultAsync(i => i.Id == inscricao.Id);

            return new InscricaoDto
            {
                Id = loaded!.Id,
                TurmaId = loaded.TurmaId,
                TurmaNome = loaded.Turma?.Nome ?? "",
                FormandoId = loaded.FormandoId,
                FormandoNome = loaded.Formando?.User?.Email ?? "Aluno #" + loaded.FormandoId, // Ajustar nome
                DataInscricao = loaded.DataInscricao,
                Estado = loaded.Estado
            };
        }

        public async Task<bool> RemoverInscricaoAsync(int inscricaoId)
        {
            var inscricao = await _context.Inscricoes.FindAsync(inscricaoId);
            if (inscricao == null) return false;

            _context.Inscricoes.Remove(inscricao);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<InscricaoDto>> GetAlunosByTurmaAsync(int turmaId)
        {
            var list = await _context.Inscricoes
                .Where(i => i.TurmaId == turmaId)
                .Include(i => i.Turma)
                .Include(i => i.Formando).ThenInclude(f => f.User)
                .ToListAsync();

            return list.Select(i => new InscricaoDto
            {
                Id = i.Id,
                TurmaId = i.TurmaId,
                TurmaNome = i.Turma?.Nome ?? "",
                FormandoId = i.FormandoId,
                FormandoNome = i.Formando?.User?.Email ?? "Aluno #" + i.FormandoId,
                DataInscricao = i.DataInscricao,
                Estado = i.Estado
            });
        }
    }
}