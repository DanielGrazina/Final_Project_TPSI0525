using SecManagement_API.Models;
using BCrypt.Net; // Garante que tens o BCrypt instalado

namespace SecManagement_API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            context.Database.EnsureCreated();

            // Se já existirem users, não faz nada (assume que a BD já tem dados)
            if (context.Users.Any())
            {
                return;
            }

            // --- 1. USERS & PERFIS ---
            string passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");

            // Formadores
            var userFormador1 = new User { Nome = "João Silva", Email = "joao.formador@213.pt", PasswordHash = passwordHash, Role = "Formador", IsActive = true };
            var userFormador2 = new User { Nome = "Maria Santos", Email = "maria.formador@123.pt", PasswordHash = passwordHash, Role = "Formador", IsActive = true };

            // Formandos
            var userAluno1 = new User { Nome = "Pedro Aluno", Email = "pedro.aluno@123.pt", PasswordHash = passwordHash, Role = "Formando", IsActive = true };
            var userAluno2 = new User { Nome = "Ana Aluna", Email = "ana.aluna@123.pt", PasswordHash = passwordHash, Role = "Formando", IsActive = true };

            // Secretaria/Admin
            var userAdmin = new User { Nome = "Secretaria ATEC", Email = "admin@123.pt", PasswordHash = passwordHash, Role = "Secretaria", IsActive = true };

            context.Users.AddRange(userFormador1, userFormador2, userAluno1, userAluno2, userAdmin);
            context.SaveChanges(); // Save para gerar os IDs dos Users

            // Perfis
            var formadorProfile1 = new Formador { UserId = userFormador1.Id, AreaEspecializacao = "Informática", CorCalendario = "#FF5733" };
            var formadorProfile2 = new Formador { UserId = userFormador2.Id, AreaEspecializacao = "Redes", CorCalendario = "#33FF57" };

            var formandoProfile1 = new Formando { UserId = userAluno1.Id, NumeroAluno = "A001", DataNascimento = new DateTime(2000, 1, 1) };
            var formandoProfile2 = new Formando { UserId = userAluno2.Id, NumeroAluno = "A002", DataNascimento = new DateTime(2001, 5, 20) };

            context.Formadores.AddRange(formadorProfile1, formadorProfile2);
            context.Formandos.AddRange(formandoProfile1, formandoProfile2);
            context.SaveChanges();

            // --- 2. PEDAGÓGICA (Areas, Cursos, Modulos) ---
            var areaInfo = new Area { Nome = "Informática" };
            var areaMec = new Area { Nome = "Mecatrónica" };
            context.Areas.AddRange(areaInfo, areaMec);
            context.SaveChanges();

            var curso = new Curso { Nome = "TPSI de Programação", NivelCurso = "5", AreaId = areaInfo.Id };
            context.Cursos.Add(curso);
            context.SaveChanges();

            var mod1 = new Modulo { Nome = "Algoritmos", CargaHoraria = 50, Nivel = "1" };
            var mod2 = new Modulo { Nome = "Base de Dados", CargaHoraria = 40, Nivel = "1" };
            var mod3 = new Modulo { Nome = "Web Development", CargaHoraria = 60, Nivel = "1" };
            context.Modulos.AddRange(mod1, mod2, mod3);
            context.SaveChanges();

            // --- 3. LOGÍSTICA (Salas) ---
            var sala1 = new Sala { Nome = "Sala 1.01", Capacidade = 20, Tipo = TipoSala.Teorica };
            var sala2 = new Sala { Nome = "Lab Informatica 2", Capacidade = 25, Tipo = TipoSala.Informatica };
            context.Salas.AddRange(sala1, sala2);
            context.SaveChanges();

            // --- 4. EXECUÇÃO (Turma, TurmaModulos, Inscricoes) ---

            // Turma
            var turma = new Turma
            {
                Nome = "TPSI-PAL-0525",
                DataInicio = DateTime.Now.AddDays(-10),
                DataFim = DateTime.Now.AddDays(300),
                Local = "Palmela",
                Estado = "Decorrer", // Importante usar string válida do Enum
                CursoId = curso.Id
            };
            context.Turmas.Add(turma);
            context.SaveChanges();

            // Atribuir Módulos à Turma (Distribuição)
            var tm1 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod1.Id, FormadorId = formadorProfile1.Id, Sequencia = 1 };
            var tm2 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod2.Id, FormadorId = formadorProfile1.Id, Sequencia = 2 };
            var tm3 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod3.Id, FormadorId = formadorProfile2.Id, Sequencia = 3 };
            context.TurmaModulos.AddRange(tm1, tm2, tm3);

            // Inscrever Alunos
            var inscricao1 = new Inscricao { TurmaId = turma.Id, FormandoId = formandoProfile1.Id, CursoId = curso.Id, Estado = "Ativo", DataInscricao = DateTime.Now.AddDays(-10) };
            var inscricao2 = new Inscricao { TurmaId = turma.Id, FormandoId = formandoProfile2.Id, CursoId = curso.Id, Estado = "Ativo", DataInscricao = DateTime.Now.AddDays(-10) };
            context.Inscricoes.AddRange(inscricao1, inscricao2);

            context.SaveChanges();
        }
    }
}