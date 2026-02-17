using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Formador}")]
    public class AutoScheduleController : ControllerBase
    {
        private readonly IAutoScheduleService _service;

        public AutoScheduleController(IAutoScheduleService service)
        {
            _service = service;
        }

        /// <summary>
        /// Gera automaticamente o horário completo de uma turma.
        /// </summary>
        [HttpPost("generate")]
        public async Task<ActionResult<AutoScheduleResultDto>> Generate([FromBody] AutoScheduleRequestDto request)
        {
            try
            {
                var result = await _service.GenerateAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
