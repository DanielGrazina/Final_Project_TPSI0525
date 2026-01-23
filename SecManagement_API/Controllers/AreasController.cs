using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
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
        public async Task<ActionResult<AreaDto>> PostArea(CreateAreaDto dto)
        {
            var area = await _service.CreateAreaAsync(dto);
            return Ok(area);
        }
    }
}