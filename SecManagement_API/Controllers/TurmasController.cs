using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TurmasController : ControllerBase
    {
        private readonly ITurmaService _turmaService;
        private readonly IInscricaoService _inscricaoService; // <--- NOVO SERVIÇO INJETADO

        // Construtor aceita agora os dois serviços
        public TurmasController(ITurmaService turmaService, IInscricaoService inscricaoService)
        {
            _turmaService = turmaService;
            _inscricaoService = inscricaoService;
        }

        // --- GESTÃO DE TURMAS ---

        [HttpGet]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<TurmaDto>>> GetTurmas()
        {
            return Ok(await _turmaService.GetAllAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<TurmaDto>> GetTurma(int id)
        {
            var turma = await _turmaService.GetByIdAsync(id);
            if (turma == null) return NotFound("Turma não encontrada.");
            return Ok(turma);
        }

        [HttpPost]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<TurmaDto>> CreateTurma(CreateTurmaDto dto)
        {
            try
            {
                var novaTurma = await _turmaService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetTurma), new { id = novaTurma.Id }, novaTurma);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteTurma(int id)
        {
            try
            {
                if (await _turmaService.DeleteAsync(id)) return NoContent();
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- ENDPOINTS RESTAURADOS (O Frontend agradece!) ---

        // GET: api/Turmas/5/modulos
        [HttpGet("{turmaId}/modulos")]
        public async Task<ActionResult<IEnumerable<TurmaModuloDto>>> GetModulos(int turmaId)
        {
            return Ok(await _turmaService.GetModulosByTurmaAsync(turmaId));
        }

        // GET: api/Turmas/5/alunos
        [HttpGet("{turmaId}/alunos")]
        public async Task<ActionResult<IEnumerable<InscricaoDto>>> GetAlunos(int turmaId)
        {
            // Delegamos a tarefa para o serviço correto
            return Ok(await _inscricaoService.GetAlunosByTurmaAsync(turmaId));
        }

        // --- GESTÃO DE MÓDULOS (Add/Remove) ---

        [HttpPost("modulo")]
        public async Task<ActionResult<TurmaModuloDto>> AddModulo(CreateTurmaModuloDto dto)
        {
            try
            {
                var result = await _turmaService.AddModuloAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("modulo/{turmaModuloId}")]
        public async Task<IActionResult> RemoveModulo(int turmaModuloId)
        {
            if (await _turmaService.RemoveModuloAsync(turmaModuloId)) return NoContent();
            return NotFound();
        }
    }
}