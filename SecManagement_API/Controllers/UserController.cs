using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecManagement_API.DTOs;
using SecManagement_API.Helpers;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        // GET: api/Users
        [HttpGet]
        [Authorize(Roles = $"{Roles.SuperAdmin},{Roles.Admin},{Roles.Secretaria}")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            return Ok(await _userService.GetAllAsync());
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        [Authorize(Roles = $"{Roles.SuperAdmin},{Roles.Admin},{Roles.Secretaria}")]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            var user = await _userService.GetByIdAsync(id);

            if (user == null)
            {
                return NotFound("Utilizador não encontrado.");
            }

            return Ok(user);
        }

        // PUT: api/Users/5
        [HttpPut("{id}")]
        [Authorize(Roles = $"{Roles.SuperAdmin},{Roles.Admin},{Roles.Secretaria}")]
        public async Task<IActionResult> PutUser(int id, [FromBody] UpdateUserDto dto)
        {
            var sucesso = await _userService.UpdateAsync(id, dto);

            if (!sucesso)
            {
                return NotFound("Utilizador não encontrado.");
            }

            return NoContent();
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        [Authorize(Roles = $"{Roles.SuperAdmin},{Roles.Admin}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var sucesso = await _userService.DeleteAsync(id);

            if (!sucesso)
            {
                return NotFound("Utilizador não encontrado.");
            }

            return NoContent();
        }
    }
}