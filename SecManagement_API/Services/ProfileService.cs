using Microsoft.AspNetCore.Http;
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
        private readonly IHttpContextAccessor _http;

        public ProfileService(AppDbContext context, IHttpContextAccessor http)
        {
            _context = context;
            _http = http;
        }

        private string? BuildAbsoluteUrl(string? maybeRelativeOrAbsolute)
        {
            var s = (maybeRelativeOrAbsolute ?? "").Trim();
            if (string.IsNullOrWhiteSpace(s)) return null;

            // já absoluto
            if (s.StartsWith("http://") || s.StartsWith("https://"))
                return s;

            // garante "/" no início
            if (!s.StartsWith("/")) s = "/" + s;

            var req = _http.HttpContext?.Request;
            if (req == null) return s;

            return $"{req.Scheme}://{req.Host}{s}";
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

                Nome = formador.User?.Nome ?? "N/A",
                Email = formador.User?.Email ?? "",
                Telefone = formador.User?.Telefone,

                NIF = formador.User?.NIF,
                Morada = formador.User?.Morada,
                CC = formador.User?.CC,

                // ✅ devolve absoluto para o <img>
                Avatar = BuildAbsoluteUrl(formador.User?.Avatar),

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
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) throw new Exception("Utilizador não encontrado.");

            if (await _context.Formadores.AnyAsync(f => f.UserId == dto.UserId))
                throw new Exception("Este utilizador já tem perfil de formador.");

            var formador = new Formador
            {
                UserId = dto.UserId,
                AreaEspecializacao = dto.AreaEspecializacao,
                CorCalendario = dto.CorCalendario
            };

            _context.Formadores.Add(formador);

            user.Role = "Formador";
            await _context.SaveChangesAsync();

            return await GetFormadorProfileAsync(dto.UserId);
        }

        public async Task<IEnumerable<FormadorProfileDto>> GetAllFormadoresAsync()
        {
            var list = await _context.Formadores
                .Include(f => f.User).ThenInclude(u => u.Ficheiros)
                .ToListAsync();

            return list.Select(f => new FormadorProfileDto
            {
                Id = f.Id,
                UserId = f.UserId,

                Nome = f.User?.Nome ?? "N/A",
                Email = f.User?.Email ?? "",
                Telefone = f.User?.Telefone,

                NIF = f.User?.NIF,
                Morada = f.User?.Morada,
                CC = f.User?.CC,

                // ✅ absoluto
                Avatar = BuildAbsoluteUrl(f.User?.Avatar),

                AreaEspecializacao = f.AreaEspecializacao,
                CorCalendario = f.CorCalendario,

                Ficheiros = f.User?.Ficheiros
                    .Where(x => x.ContentType.StartsWith("image/"))
                    .Select(file => new UserFicheiroDto
                    {
                        Id = file.Id,
                        NomeFicheiro = file.NomeFicheiro,
                        ContentType = file.ContentType
                    }).ToList() ?? new List<UserFicheiroDto>()
            });
        }

        // --- FORMANDOS ---

        public async Task<FormandoProfileDto> GetFormandoProfileAsync(int userId)
        {
            var formando = await _context.Formandos
                .Include(f => f.User).ThenInclude(u => u!.Ficheiros)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formando == null) throw new Exception("Perfil de formando não encontrado.");

            var inscricaoAtiva = await _context.Inscricoes
                .Include(i => i.Turma)
                .FirstOrDefaultAsync(i => i.FormandoId == formando.Id && i.Estado == "Ativo");

            return new FormandoProfileDto
            {
                Id = formando.Id,
                UserId = formando.UserId,

                Nome = formando.User?.Nome ?? "N/A",
                Telefone = formando.User?.Telefone,
                NIF = formando.User?.NIF,
                Morada = formando.User?.Morada,
                CC = formando.User?.CC,

                // ✅ absoluto
                Avatar = BuildAbsoluteUrl(formando.User?.Avatar),

                Email = formando.User?.Email ?? "",

                NumeroAluno = formando.NumeroAluno,
                DataNascimento = formando.DataNascimento,

                TurmaId = inscricaoAtiva?.TurmaId,
                TurmaNome = inscricaoAtiva?.Turma?.Nome,

                Ficheiros = formando.User?.Ficheiros.Select(f => new UserFicheiroDto
                {
                    Id = f.Id,
                    NomeFicheiro = f.NomeFicheiro,
                    ContentType = f.ContentType
                }).ToList() ?? new List<UserFicheiroDto>()
            };
        }

        public async Task<IEnumerable<FormandoProfileDto>> GetAllFormandosAsync()
        {
            var list = await _context.Formandos
                .Include(f => f.User).ThenInclude(u => u.Ficheiros)
                .ToListAsync();

            var formandoIds = list.Select(f => f.Id).ToList();

            var inscricoesAtivas = await _context.Inscricoes
                .Include(i => i.Turma)
                .Where(i => formandoIds.Contains(i.FormandoId) && i.Estado == "Ativo")
                .ToListAsync();

            var turmaByFormandoId = inscricoesAtivas
                .GroupBy(i => i.FormandoId)
                .ToDictionary(g => g.Key, g => g.First());

            return list.Select(f =>
            {
                turmaByFormandoId.TryGetValue(f.Id, out var ins);

                return new FormandoProfileDto
                {
                    Id = f.Id,
                    UserId = f.UserId,

                    Nome = f.User?.Nome ?? "N/A",
                    Telefone = f.User?.Telefone,
                    NIF = f.User?.NIF,
                    Morada = f.User?.Morada,
                    CC = f.User?.CC,

                    // ✅ absoluto
                    Avatar = BuildAbsoluteUrl(f.User?.Avatar),

                    Email = f.User?.Email ?? "",
                    NumeroAluno = f.NumeroAluno,
                    DataNascimento = f.DataNascimento,

                    TurmaId = ins?.TurmaId,
                    TurmaNome = ins?.Turma?.Nome,

                    Ficheiros = f.User?.Ficheiros
                        .Where(x => x.ContentType.StartsWith("image/"))
                        .Select(file => new UserFicheiroDto
                        {
                            Id = file.Id,
                            NomeFicheiro = file.NomeFicheiro,
                            ContentType = file.ContentType
                        }).ToList() ?? new List<UserFicheiroDto>()
                };
            });
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

        public async Task<IEnumerable<FormandoSearchDto>> SearchFormandosAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query)) return new List<FormandoSearchDto>();

            query = query.ToLower().Trim();

            // 1) Busca Formandos + User a filtrar por nome
            // (Sem navegação inversa Inscricoes, fazemos join manual se necessário, ou usamos a referencia direta)
            var formandosRaw = await _context.Formandos
                .Include(f => f.User)
                .Where(f => f.User.Nome.ToLower().Contains(query))
                .Take(20)
                .ToListAsync();

            if (!formandosRaw.Any()) return new List<FormandoSearchDto>();

            var ids = formandosRaw.Select(f => f.Id).ToList();

            // 2) Busca Inscrição Ativa para estes formandos
            var inscricoes = await _context.Inscricoes
                .Include(i => i.Turma).ThenInclude(t => t.Curso)
                .Where(i => ids.Contains(i.FormandoId) && i.Estado == "Ativo")
                .ToListAsync();

            // 3) Combina em memória
            return formandosRaw.Select(f =>
            {
                var ins = inscricoes.FirstOrDefault(i => i.FormandoId == f.Id);
                return new FormandoSearchDto
                {
                    UserId = f.UserId,
                    Nome = f.User?.Nome ?? "—",
                    NumeroAluno = f.NumeroAluno,
                    TurmaNome = ins?.Turma?.Nome ?? "Sem Turma",
                    CursoNome = ins?.Turma?.Curso?.Nome ?? ""
                };
            }).ToList();
        }

        public async Task<FormandoProfileDto> UpdateNumeroAlunoAsync(int userId, string novoNumero)
        {
            var formando = await _context.Formandos
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formando == null) throw new Exception("Perfil não encontrado.");

            if (await _context.Formandos.AnyAsync(f => f.NumeroAluno == novoNumero && f.Id != formando.Id))
                throw new Exception("Esse número de aluno já existe.");

            formando.NumeroAluno = novoNumero;
            await _context.SaveChangesAsync();

            return await GetFormandoProfileAsync(userId);
        }

        // --- FICHEIROS ---

        public async Task<UserFicheiroDto> UploadFileAsync(int userId, IFormFile file)
        {
            if (file == null || file.Length == 0) throw new Exception("Ficheiro inválido.");

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

        public async Task<UserDto> UpdateDadosPessoaisAsync(int userId, UpdateDadosPessoaisDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Utilizador não encontrado.");

            if (dto.Telefone != null) user.Telefone = dto.Telefone;
            if (dto.NIF != null) user.NIF = dto.NIF;
            if (dto.Morada != null) user.Morada = dto.Morada;
            if (dto.CC != null) user.CC = dto.CC;
            if (dto.Nome != null) user.Nome = dto.Nome;

            await _context.SaveChangesAsync();

            var isFormador = await _context.Formadores.AnyAsync(f => f.UserId == userId);
            var isFormando = await _context.Formandos.AnyAsync(f => f.UserId == userId);

            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role,
                IsActive = user.IsActive,
                IsFormador = isFormador,
                IsFormando = isFormando
            };
        }

        public async Task<string> UpdateAvatarAsync(int userId, IFormFile file)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Utilizador não encontrado.");

            if (file == null || file.Length == 0) throw new Exception("Ficheiro inválido.");

            if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/"))
                throw new Exception("O ficheiro deve ser uma imagem.");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);

            var userFicheiro = new UserFicheiro
            {
                UserId = userId,
                NomeFicheiro = "avatar_" + file.FileName,
                ContentType = file.ContentType,
                Ficheiro = memoryStream.ToArray()
            };

            _context.UserFicheiros.Add(userFicheiro);
            await _context.SaveChangesAsync();

            // ✅ URL público (sem auth) só para imagens
            string publicAvatarPath = $"/api/Profiles/public-file/{userFicheiro.Id}";
            user.Avatar = publicAvatarPath;

            await _context.SaveChangesAsync();

            // ✅ devolve absoluto para o frontend usar imediatamente
            return BuildAbsoluteUrl(publicAvatarPath) ?? publicAvatarPath;
        }
    }
}
