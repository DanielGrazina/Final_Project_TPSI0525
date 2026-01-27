using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TurmasController : ControllerBase
    {
        private readonly ITurmaService _service;

        public TurmasController(ITurmaService service)
        {
            _service = service;
        }

        // --- CRUD BÁSICO DA TURMA ---

        // GET: api/Turmas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TurmaDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        // GET: api/Turmas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TurmaDto>> GetById(int id)
        {
            var t = await _service.GetByIdAsync(id);
            if (t == null) return NotFound("Turma não encontrada.");
            return Ok(t);
        }

        // POST: api/Turmas
        [HttpPost]
        public async Task<ActionResult<TurmaDto>> Create(CreateTurmaDto dto)
        {
            try
            {
                var t = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = t.Id }, t);
            }
            catch (Exception ex)
            {
                 return BadRequest(ex.Message);
            }
        }

        // DELETE: api/Turmas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                if (await _service.DeleteAsync(id)) return NoContent();
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message); // Retorna erro se tiver alunos
            }
        }

        // --- GESTÃO DE MÓDULOS NA TURMA ---

        // GET: api/Turmas/5/modulos
        [HttpGet("{turmaId}/modulos")]
        public async Task<ActionResult<IEnumerable<TurmaModuloDto>>> GetModulos(int turmaId)
        {
            return Ok(await _service.GetModulosByTurmaAsync(turmaId));
        }

        // POST: api/Turmas/modulos (Adicionar disciplina à turma)
        [HttpPost("modulos")]
        public async Task<ActionResult<TurmaModuloDto>> AddModulo(CreateTurmaModuloDto dto)
        {
            try
            {
                var result = await _service.AddModuloAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE: api/Turmas/modulos/5 (Remover disciplina da turma)
        [HttpDelete("modulos/{id}")]
        public async Task<IActionResult> RemoveModulo(int id)
        {
            if (await _service.RemoveModuloAsync(id)) return NoContent();
            return NotFound();
        }

        // --- GESTÃO DE ALUNOS NA TURMA (INSCRIÇÕES) ---

        // GET: api/Turmas/5/alunos
        [HttpGet("{turmaId}/alunos")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetAlunos(int turmaId)
        {
            return Ok(await _service.GetAlunosByTurmaAsync(turmaId));
        }

        // POST: api/Turmas/alunos (Inscrever aluno)
        [HttpPost("alunos")]
        public async Task<ActionResult<InscricaoDto>> InscreverAluno(CreateInscricaoDto dto)
        {
            try
            {
                var result = await _service.InscreverAlunoAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE: api/Turmas/alunos/5 (Remover inscrição)
        [HttpDelete("alunos/{inscricaoId}")]
        public async Task<IActionResult> RemoveInscricao(int inscricaoId)
        {
            if (await _service.RemoverInscricaoAsync(inscricaoId)) return NoContent();
            return NotFound();
        }
    }
}