using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.Models;
using SecManagement_API.DTOs;

namespace SecManagement_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // LISTAR TODOS
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        // OBTER UM POR ID
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        // ATUALIZAR UTILIZADOR
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(int id, [FromBody] User userUpdates)
        {
            if (id != userUpdates.Id)
            {
                return BadRequest("O ID no URL não coincide com o corpo do pedido.");
            }

            _context.Entry(userUpdates).State = EntityState.Modified;

            if (string.IsNullOrEmpty(userUpdates.PasswordHash))
            {
                _context.Entry(userUpdates).Property(x => x.PasswordHash).IsModified = false;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // APAGAR UTILIZADOR
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Id == id);
        }
    }
}