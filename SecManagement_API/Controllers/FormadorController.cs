using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FormadoresController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FormadoresController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Formadores
        [HttpGet]
        [Authorize(Roles = $"{Roles.Secretaria},{Roles.Admin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<IEnumerable<FormadorDto>>> GetFormadores()
        {
            var list = await _context.Formadores
                .Include(f => f.User)
                .Select(f => new FormadorDto
                {
                    Id = f.Id,
                    Nome = f.User.Nome ?? "",
                    Email = f.User.Email ?? "",
                    TemFoto = false,
                    TemCV = false
                })
                .ToListAsync();

            return Ok(list);
        }
    }
}
