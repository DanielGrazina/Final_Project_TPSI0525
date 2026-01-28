using Microsoft.EntityFrameworkCore;
using SecManagement_API.Data;
using SecManagement_API.DTOs;
using SecManagement_API.Models;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class ProfileService : IProfileService
    {
        private readonly AppDbContext _context;

        public ProfileService(AppDbContext context)
        {
            _context = context;
        }

        // --- FORMADORES ---

        public async Task<FormadorProfileDto> GetFormadorProfileAsync(int userId)
        {
            var formador = await _context.Formadores
                .Include(f => f.User).ThenInclude(u => u!.Ficheiros)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formador == null) throw new Exception("Perfil de formador não encontrado.");

            return new FormadorProfileDto
            {
                Id = formador.Id,
                UserId = formador.UserId,
                Nome = formador.User?.Email ?? "N/A", // Ou outro campo de nome se tiveres
                Email = formador.User?.Email ?? "",
                Telefone = formador.User?.Telefone,
                AreaEspecializacao = formador.AreaEspecializacao,
                CorCalendario = formador.CorCalendario,
                Ficheiros = formador.User?.Ficheiros.Select(f => new UserFicheiroDto
                {
                    Id = f.Id,
                    NomeFicheiro = f.NomeFicheiro,
                    ContentType = f.ContentType
                }).ToList() ?? new List<UserFicheiroDto>()
            };
        }

        public async Task<FormadorProfileDto> CreateFormadorProfileAsync(CreateFormadorProfileDto dto)
        {
            // Verifica se User existe
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) throw new Exception("Utilizador não encontrado.");

            // Verifica se já é formador
            if (await _context.Formadores.AnyAsync(f => f.UserId == dto.UserId))
                throw new Exception("Este utilizador já tem perfil de formador.");

            var formador = new Formador
            {
                UserId = dto.UserId,
                AreaEspecializacao = dto.AreaEspecializacao,
                CorCalendario = dto.CorCalendario
            };

            _context.Formadores.Add(formador);

            // Atualizar Role do user se necessário
            user.Role = "Formador";

            await _context.SaveChangesAsync();

            return await GetFormadorProfileAsync(dto.UserId);
        }

        // --- FORMANDOS ---

        public async Task<FormandoProfileDto> GetFormandoProfileAsync(int userId)
        {
            var formando = await _context.Formandos
                .Include(f => f.User).ThenInclude(u => u!.Ficheiros)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formando == null) throw new Exception("Perfil de formando não encontrado.");

            return new FormandoProfileDto
            {
                Id = formando.Id,
                UserId = formando.UserId,
                Email = formando.User?.Email ?? "",
                NumeroAluno = formando.NumeroAluno,
                DataNascimento = formando.DataNascimento,
                Ficheiros = formando.User?.Ficheiros.Select(f => new UserFicheiroDto
                {
                    Id = f.Id,
                    NomeFicheiro = f.NomeFicheiro,
                    ContentType = f.ContentType
                }).ToList() ?? new List<UserFicheiroDto>()
            };
        }

        public async Task<FormandoProfileDto> CreateFormandoProfileAsync(CreateFormandoProfileDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) throw new Exception("Utilizador não encontrado.");

            if (await _context.Formandos.AnyAsync(f => f.UserId == dto.UserId))
                throw new Exception("Este utilizador já tem perfil de formando.");

            var formando = new Formando
            {
                UserId = dto.UserId,
                NumeroAluno = dto.NumeroAluno,
                DataNascimento = dto.DataNascimento
            };

            _context.Formandos.Add(formando);
            user.Role = "Formando";

            await _context.SaveChangesAsync();

            return await GetFormandoProfileAsync(dto.UserId);
        }

        public async Task<FormandoProfileDto> UpdateNumeroAlunoAsync(int userId, string novoNumero)
        {
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formando == null) throw new Exception("Perfil não encontrado.");

            // Validar unicidade
            if (await _context.Formandos.AnyAsync(f => f.NumeroAluno == novoNumero && f.Id != formando.Id))
                throw new Exception("Esse número de aluno já existe.");

            formando.NumeroAluno = novoNumero;
            await _context.SaveChangesAsync();

            // Como estamos dentro do ProfileService, este método JÁ existe aqui
            return await GetFormandoProfileAsync(userId);
        }

        // --- FICHEIROS ---

        public async Task<UserFicheiroDto> UploadFileAsync(int userId, IFormFile file)
        {
            if (file == null || file.Length == 0) throw new Exception("Ficheiro inválido.");

            // Converter IFormFile para byte[]
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);

            var userFicheiro = new UserFicheiro
            {
                UserId = userId,
                NomeFicheiro = file.FileName,
                ContentType = file.ContentType,
                Ficheiro = memoryStream.ToArray()
            };

            _context.UserFicheiros.Add(userFicheiro);
            await _context.SaveChangesAsync();

            return new UserFicheiroDto
            {
                Id = userFicheiro.Id,
                NomeFicheiro = userFicheiro.NomeFicheiro,
                ContentType = userFicheiro.ContentType
            };
        }

        public async Task<UserFicheiroDto?> GetFileDetailsAsync(int fileId)
        {
            var f = await _context.UserFicheiros.FindAsync(fileId);
            if (f == null) return null;

            return new UserFicheiroDto
            {
                Id = f.Id,
                NomeFicheiro = f.NomeFicheiro,
                ContentType = f.ContentType
            };
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)?> GetFileContentAsync(int fileId)
        {
            var f = await _context.UserFicheiros.FindAsync(fileId);
            if (f == null) return null;

            return (f.Ficheiro, f.ContentType, f.NomeFicheiro);
        }

        public async Task<bool> DeleteFileAsync(int fileId)
        {
            var f = await _context.UserFicheiros.FindAsync(fileId);
            if (f == null) return false;

            _context.UserFicheiros.Remove(f);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}