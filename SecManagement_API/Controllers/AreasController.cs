using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AreasController : ControllerBase
    {
        private readonly IPedagogicoService _service;

        public AreasController(IPedagogicoService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AreaDto>>> GetAreas()
        {
            return Ok(await _service.GetAreasAsync());
        }

        [HttpPost]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<AreaDto>> PostArea(CreateAreaDto dto)
        {
            var area = await _service.CreateAreaAsync(dto);
            return Ok(area);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<AreaDto>> PutArea(int id, CreateAreaDto dto)
        {
            try
            {
                return Ok(await _service.UpdateAreaAsync(id, dto));
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<IActionResult> DeleteArea(int id)
        {
            try
            {
                if (await _service.DeleteAreaAsync(id)) return NoContent();
                return NotFound();
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }
    }
}