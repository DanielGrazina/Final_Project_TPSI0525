using SecManagement_API.Models;
using Microsoft.EntityFrameworkCore;

namespace SecManagement_API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            Console.WriteLine(">> INICIANDO O SEED DA BASE DE DADOS...");

            try
            {
                // 1. Garante que a BD existe
                context.Database.EnsureCreated();
                Console.WriteLine(">> Base de Dados criada/verificada com sucesso.");

                string passwordHash = "$2a$11$Z8z.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u.u";

                // ==========================================
                // 2. USERS & PERFIS
                // ==========================================

                // ADMIN
                if (!context.Users.Any(u => u.Email == "admin@123.pt"))
                {
                    Console.WriteLine(">> A criar Admin...");
                    context.Users.Add(new User
                    {
                        Nome = "Secretaria ATEC",
                        Email = "admin@123.pt",
                        PasswordHash = passwordHash,
                        Role = "Secretaria",
                        IsActive = true
                    });
                }

                // FORMADOR 1
                var userJoao = context.Users.FirstOrDefault(u => u.Email == "joao.formador@123.pt");
                if (userJoao == null)
                {
                    Console.WriteLine(">> A criar João Formador...");
                    userJoao = new User
                    {
                        Nome = "João Formador",
                        Email = "joao.formador@123.pt",
                        PasswordHash = passwordHash,
                        Role = "Formador",
                        IsActive = true
                    };
                    context.Formadores.Add(new Formador
                    {
                        User = userJoao,
                        AreaEspecializacao = "Informática",
                        CorCalendario = "#FF5733"
                    });
                }
                else if (!context.Formadores.Any(f => f.UserId == userJoao.Id))
                {
                    Console.WriteLine(">> A recuperar perfil do João...");
                    context.Formadores.Add(new Formador { UserId = userJoao.Id, AreaEspecializacao = "Informática", CorCalendario = "#FF5733" });
                }

                // FORMADOR 2
                var userMaria = context.Users.FirstOrDefault(u => u.Email == "maria.formador@123.pt");
                if (userMaria == null)
                {
                    Console.WriteLine(">> A criar Maria Formadora...");
                    userMaria = new User
                    {
                        Nome = "Maria Santos",
                        Email = "maria.formador@123.pt",
                        PasswordHash = passwordHash,
                        Role = "Formador",
                        IsActive = true
                    };
                    context.Formadores.Add(new Formador
                    {
                        User = userMaria,
                        AreaEspecializacao = "Redes",
                        CorCalendario = "#33FF57"
                    });
                }
                else if (!context.Formadores.Any(f => f.UserId == userMaria.Id))
                {
                    context.Formadores.Add(new Formador { UserId = userMaria.Id, AreaEspecializacao = "Redes", CorCalendario = "#33FF57" });
                }

                // ALUNO 1
                var userPedro = context.Users.FirstOrDefault(u => u.Email == "pedro.aluno@123.pt");
                if (userPedro == null)
                {
                    Console.WriteLine(">> A criar Pedro Aluno...");
                    userPedro = new User
                    {
                        Nome = "Pedro Aluno",
                        Email = "pedro.aluno@123.pt",
                        PasswordHash = passwordHash,
                        Role = "Formando",
                        IsActive = true
                    };
                    context.Formandos.Add(new Formando
                    {
                        User = userPedro,
                        NumeroAluno = "A001",
                        DataNascimento = new DateTime(2000, 1, 1)
                    });
                }
                else if (!context.Formandos.Any(f => f.UserId == userPedro.Id))
                {
                    context.Formandos.Add(new Formando { UserId = userPedro.Id, NumeroAluno = "A001", DataNascimento = new DateTime(2000, 1, 1) });
                }

                // Salvar Users
                context.SaveChanges();
                Console.WriteLine(">> Utilizadores salvos.");

                // ==========================================
                // 3. CURSOS E TURMAS
                // ==========================================
                if (!context.Cursos.Any())
                {
                    Console.WriteLine(">> A criar Estrutura Pedagógica...");

                    var areaInfo = new Area { Nome = "Informática" };
                    var areaMec = new Area { Nome = "Mecatrónica" };
                    context.Areas.AddRange(areaInfo, areaMec);

                    var curso = new Curso { Nome = "TPSI de Programação", NivelCurso = "5", Area = areaInfo };
                    context.Cursos.Add(curso);

                    var mod1 = new Modulo { Nome = "Algoritmos", CargaHoraria = 50, Nivel = "1" };
                    var mod2 = new Modulo { Nome = "Base de Dados", CargaHoraria = 40, Nivel = "1" };
                    var mod3 = new Modulo { Nome = "Web Development", CargaHoraria = 60, Nivel = "1" };
                    context.Modulos.AddRange(mod1, mod2, mod3);

                    context.SaveChanges();

                    Console.WriteLine(">> A criar Turmas e Salas...");

                    // Salas com Enum correto
                    var sala1 = new Sala { Nome = "Sala 1.01", Capacidade = 20, Tipo = TipoSala.Teorica };
                    var sala2 = new Sala { Nome = "Lab 2", Capacidade = 25, Tipo = TipoSala.Informatica };
                    context.Salas.AddRange(sala1, sala2);

                    var turma = new Turma
                    {
                        Nome = "TPSI-PAL-0525",
                        DataInicio = DateTime.Now.AddDays(-10),
                        DataFim = DateTime.Now.AddDays(300),
                        Local = "Palmela",
                        Estado = "Decorrer",
                        CursoId = curso.Id
                    };
                    context.Turmas.Add(turma);
                    context.SaveChanges();

                    // Associações
                    var formador1 = context.Formadores.Include(f => f.User).FirstOrDefault(f => f.User.Email == "joao.formador@123.pt");
                    var formador2 = context.Formadores.Include(f => f.User).FirstOrDefault(f => f.User.Email == "maria.formador@123.pt");

                    if (formador1 != null && formador2 != null)
                    {
                        var tm1 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod1.Id, FormadorId = formador1.Id, Sequencia = 1 };
                        var tm2 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod2.Id, FormadorId = formador1.Id, Sequencia = 2 };
                        var tm3 = new TurmaModulo { TurmaId = turma.Id, ModuloId = mod3.Id, FormadorId = formador2.Id, Sequencia = 3 };
                        context.TurmaModulos.AddRange(tm1, tm2, tm3);
                    }

                    var aluno1 = context.Formandos.Include(f => f.User).FirstOrDefault(f => f.User.Email == "pedro.aluno@123.pt");
                    if (aluno1 != null)
                    {
                        context.Inscricoes.Add(new Inscricao
                        {
                            TurmaId = turma.Id,
                            FormandoId = aluno1.Id,
                            CursoId = curso.Id,
                            Estado = "Ativo"
                        });
                    }

                    context.SaveChanges();
                    Console.WriteLine(">> SEED CONCLUÍDO COM SUCESSO.");
                }
                else
                {
                    Console.WriteLine(">> Dados pedagógicos já existem. A saltar esta parte.");
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine($"!!! ERRO NO SEED: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"!!! DETALHE: {ex.InnerException.Message}");
                }
            }
        }
    }
}