using Microsoft.EntityFrameworkCore;
using SecManagement_API.Models;
using System.Globalization;
using System.Text;

namespace SecManagement_API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            Console.WriteLine(">> SEED MASSIVO: a iniciar...");

            try
            {
                context.Database.EnsureCreated();

                // Se já foi semeado, não repete (evita duplicar milhares de rows).
                if (context.Users.Any(u => u.Email == "seed.marker@123.pt"))
                {
                    Console.WriteLine(">> Seed já executado (seed.marker encontrado). A sair.");
                    return;
                }

                // CONFIG (ajusta à vontade)
                const int NUM_FORMADORES = 18;
                const int NUM_FORMANDOS = 220;
                const int NUM_SALAS = 16;
                const int TURMAS_POR_CURSO = 4;     // 1 terminada + 2 decorrer + 1 planeada (aprox)
                const int MODULOS_TOTAL = 48;
                const int MODULOS_POR_TURMA = 10;
                const int MAX_ALUNOS_POR_TURMA = 26;
                const int MIN_ALUNOS_POR_TURMA = 12;
                const int SEMANAS_DISPONIBILIDADE = 10; // próximos 10 semanas
                const int SESSOES_POR_MODULO = 3;       // por TurmaModulo, para não explodir

                var rng = new Random(20260210);
                var today = DateTime.UtcNow.Date;

                static DateTime Utc(DateTime dt)
                {
                    if (dt.Kind == DateTimeKind.Utc) return dt;
                    // não uses ToUniversalTime() para Unspecified (pode assumir timezone local)
                    return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                }


                // Password genérica: 123456
                string passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");

                // -------------------------
                // Helpers (idempotentes por chave natural)
                // -------------------------
                User EnsureUser(string nome, string email, string role, bool active = true)
                {
                    var u = context.Users.FirstOrDefault(x => x.Email == email);
                    if (u != null) return u;

                    u = new User
                    {
                        Nome = nome,
                        Email = email,
                        PasswordHash = passwordHash,
                        Role = role,
                        IsActive = active,
                        IsTwoFactorEnabled = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    context.Users.Add(u);
                    context.SaveChanges();
                    return u;
                }

                Formador EnsureFormador(User user, string areaEsp, string corHex)
                {
                    var f = context.Formadores.FirstOrDefault(x => x.UserId == user.Id);
                    if (f != null) return f;

                    f = new Formador
                    {
                        UserId = user.Id,
                        AreaEspecializacao = areaEsp,
                        CorCalendario = corHex
                    };
                    context.Formadores.Add(f);
                    context.SaveChanges();
                    return f;
                }

                Formando EnsureFormando(User user, string numeroAluno, DateTime dataNascimentoUtc)
                {
                    var f = context.Formandos.FirstOrDefault(x => x.UserId == user.Id);
                    if (f != null) return f;

                    f = new Formando
                    {
                        UserId = user.Id,
                        NumeroAluno = numeroAluno,
                        DataNascimento = DateTime.SpecifyKind(dataNascimentoUtc, DateTimeKind.Utc)
                    };
                    context.Formandos.Add(f);
                    context.SaveChanges();
                    return f;
                }

                Area EnsureArea(string nome)
                {
                    var a = context.Areas.FirstOrDefault(x => x.Nome == nome);
                    if (a != null) return a;

                    a = new Area { Nome = nome };
                    context.Areas.Add(a);
                    context.SaveChanges();
                    return a;
                }

                Curso EnsureCurso(string nome, string nivel, Area area)
                {
                    var c = context.Cursos.FirstOrDefault(x => x.Nome == nome);
                    if (c != null) return c;

                    c = new Curso
                    {
                        Nome = nome,
                        NivelCurso = nivel,
                        AreaId = area.Id
                    };
                    context.Cursos.Add(c);
                    context.SaveChanges();
                    return c;
                }

                Modulo EnsureModulo(string nome, int ch, string nivel)
                {
                    var m = context.Modulos.FirstOrDefault(x => x.Nome == nome);
                    if (m != null) return m;

                    m = new Modulo
                    {
                        Nome = nome,
                        CargaHoraria = ch,
                        Nivel = nivel
                    };
                    context.Modulos.Add(m);
                    context.SaveChanges();
                    return m;
                }

                Sala EnsureSala(string nome, TipoSala tipo, int capacidade)
                {
                    var s = context.Salas.FirstOrDefault(x => x.Nome == nome);
                    if (s != null) return s;

                    s = new Sala
                    {
                        Nome = nome,
                        Tipo = tipo,
                        Capacidade = capacidade
                    };
                    context.Salas.Add(s);
                    context.SaveChanges();
                    return s;
                }

                Turma EnsureTurma(
                    string nome,
                    Curso curso,
                    Formador? coordenador,
                    DateTime dataInicioUtc,
                    DateTime dataFimUtc,
                    string local,
                    string estado
                )
                {
                    var t = context.Turmas.FirstOrDefault(x => x.Nome == nome);
                    if (t != null) return t;

                    t = new Turma
                    {
                        Nome = nome,
                        CursoId = curso.Id,
                        CoordenadorId = coordenador?.Id,
                        DataInicio = Utc(dataInicioUtc),
                        DataFim = Utc(dataFimUtc),
                        Local = local,
                        Estado = estado
                    };

                    context.Turmas.Add(t);
                    context.SaveChanges();
                    return t;
                }

                TurmaModulo EnsureTurmaModulo(Turma turma, Modulo modulo, Formador formador, int sequencia)
                {
                    var tm = context.TurmaModulos.FirstOrDefault(x => x.TurmaId == turma.Id && x.ModuloId == modulo.Id);
                    if (tm != null) return tm;

                    tm = new TurmaModulo
                    {
                        TurmaId = turma.Id,
                        ModuloId = modulo.Id,
                        FormadorId = formador.Id,
                        Sequencia = sequencia
                    };

                    context.TurmaModulos.Add(tm);
                    context.SaveChanges();
                    return tm;
                }

                // Evita duplicar avaliação para o mesmo (turma, inscrição, turmaModulo)
                void EnsureAvaliacao(Turma turma, Inscricao inscricao, TurmaModulo tm, decimal nota, string obs)
                {
                    bool existe = context.Avaliacoes.Any(a =>
                        a.TurmaId == turma.Id &&
                        a.InscricaoId == inscricao.Id &&
                        a.TurmaModuloId == tm.Id
                    );
                    if (existe) return;

                    context.Avaliacoes.Add(new Avaliacao
                    {
                        TurmaId = turma.Id,
                        InscricaoId = inscricao.Id,
                        TurmaModuloId = tm.Id,
                        AvaliacaoValor = nota,
                        Observacoes = obs
                    });
                }

                void EnsureSessao(TurmaModulo tm, Sala sala, DateTime ini, DateTime fim)
                {
                    var iniUtc = Utc(ini);
                    var fimUtc = Utc(fim);

                    bool existe = context.Sessoes.Any(s =>
                        s.TurmaModuloId == tm.Id &&
                        s.SalaId == sala.Id &&
                        s.HorarioInicio == iniUtc &&
                        s.HorarioFim == fimUtc
                    );

                    if (existe) return;

                    context.Sessoes.Add(new Sessao
                    {
                        TurmaModuloId = tm.Id,
                        SalaId = sala.Id,
                        HorarioInicio = iniUtc,
                        HorarioFim = fimUtc
                    });
                }


                void EnsureDisponibilidadeFormador(Formador f, DateTime ini, DateTime fim, bool disponivel)
                {
                    var iniUtc = Utc(ini);
                    var fimUtc = Utc(fim);

                    bool existe = context.Disponibilidades.Any(d =>
                        d.TipoEntidade == "Formador" &&
                        d.FormadorId == f.Id &&
                        d.DataInicio == iniUtc &&
                        d.DataFim == fimUtc &&
                        d.Disponivel == disponivel
                    );

                    if (existe) return;

                    context.Disponibilidades.Add(new Disponibilidade
                    {
                        TipoEntidade = "Formador",
                        EntidadeId = f.Id,
                        FormadorId = f.Id,
                        SalaId = null,
                        DataInicio = iniUtc,
                        DataFim = fimUtc,
                        Disponivel = disponivel
                    });
                }


                void EnsureDisponibilidadeSala(Sala s, DateTime ini, DateTime fim, bool disponivel)
                {
                    var iniUtc = Utc(ini);
                    var fimUtc = Utc(fim);

                    bool existe = context.Disponibilidades.Any(d =>
                        d.TipoEntidade == "Sala" &&
                        d.SalaId == s.Id &&
                        d.DataInicio == iniUtc &&
                        d.DataFim == fimUtc &&
                        d.Disponivel == disponivel
                    );

                    if (existe) return;

                    context.Disponibilidades.Add(new Disponibilidade
                    {
                        TipoEntidade = "Sala",
                        EntidadeId = s.Id,
                        SalaId = s.Id,
                        FormadorId = null,
                        DataInicio = iniUtc,
                        DataFim = fimUtc,
                        Disponivel = disponivel
                    });
                }


                // -------------------------
                // 1) USERS FIXOS + MARKER
                // -------------------------
                EnsureUser("Seed Marker", "seed.marker@123.pt", "Admin", true);
                EnsureUser("Super Admin", "superadmin@123.pt", "SuperAdmin", true);
                EnsureUser("Admin ATEC", "admin@123.pt", "Admin", true);
                EnsureUser("Secretaria BackOffice", "secretaria@123.pt", "Secretaria", true);

                // -------------------------
                // 2) ÁREAS / CURSOS / MÓDULOS
                // -------------------------
                var areas = new List<Area>
                {
                    EnsureArea("Informática"),
                    EnsureArea("Redes e Sistemas"),
                    EnsureArea("Gestão"),
                    EnsureArea("Mecatrónica"),
                    EnsureArea("Eletrónica"),
                    EnsureArea("Qualidade")
                };

                // Cursos (alguns por área)
                var cursos = new List<Curso>();
                string[] niveis = { "4", "5" };

                // nomes “realistas”
                var cursosPorArea = new Dictionary<string, string[]>
                {
                    ["Informática"] = new[]
                    {
                        "TPSI - Programação de Sistemas",
                        "Desenvolvimento Web",
                        "Aplicações Mobile",
                        "DevOps e Cloud"
                    },
                    ["Redes e Sistemas"] = new[]
                    {
                        "Administração de Redes",
                        "Cibersegurança Aplicada",
                        "Sistemas Linux e Automação",
                        "Infraestrutura e Virtualização"
                    },
                    ["Gestão"] = new[]
                    {
                        "Gestão de Projetos",
                        "Gestão e Qualidade",
                        "Gestão de Operações",
                        "Gestão de Equipas"
                    },
                    ["Mecatrónica"] = new[]
                    {
                        "Automação Industrial",
                        "Mecatrónica Aplicada",
                        "Robótica e Sensores",
                        "Manutenção Industrial"
                    },
                    ["Eletrónica"] = new[]
                    {
                        "Eletrónica Digital",
                        "Eletrónica Industrial",
                        "Sistemas Embebidos",
                        "IoT e Integração"
                    },
                    ["Qualidade"] = new[]
                    {
                        "Auditorias e Qualidade",
                        "Normas ISO e Processos",
                        "Lean e Melhoria Contínua",
                        "Segurança e Compliance"
                    }
                };

                foreach (var area in areas)
                {
                    var lista = cursosPorArea[area.Nome];
                    for (int i = 0; i < lista.Length; i++)
                    {
                        var nivel = niveis[(i + rng.Next(0, 2)) % 2];
                        cursos.Add(EnsureCurso(lista[i], nivel, area));
                    }
                }

                // Módulos (gerados + alguns fixos)
                var modulos = new List<Modulo>();

                var modulosFixos = new (string nome, int ch, string nivel)[]
                {
                    ("Algoritmos e Estruturas", 50, "1"),
                    ("Base de Dados SQL", 40, "1"),
                    ("Desenvolvimento Web", 60, "1"),
                    ("ASP.NET Core Web API", 60, "2"),
                    ("Segurança Informática", 30, "2"),
                    ("Fundamentos de Redes", 45, "1"),
                    ("Administração Linux", 45, "2"),
                    ("Testes e Qualidade de Software", 30, "2"),
                    ("UML e Modelação", 25, "1"),
                    ("Git e Controlo de Versões", 20, "1"),
                };

                foreach (var m in modulosFixos)
                    modulos.Add(EnsureModulo(m.nome, m.ch, m.nivel));

                // Completar até MODULOS_TOTAL com nomes variados
                string[] temas = {
                    "POO", "Design Patterns", "Docker", "Kubernetes", "CI/CD",
                    "React", "Angular", "Node.js", "Python", "Java", "C#",
                    "Cloud", "Azure", "AWS", "Segurança", "Criptografia",
                    "Redes", "Firewall", "Virtualização", "Linux", "Windows Server",
                    "IoT", "Sensores", "Robótica", "Qualidade", "Lean", "ISO 27001"
                };

                while (context.Modulos.Count() < MODULOS_TOTAL)
                {
                    var tema = temas[rng.Next(temas.Length)];
                    var nome = $"{tema} - {rng.Next(1, 4)}";
                    var ch = rng.Next(20, 61);           // 20..60
                    var nivel = rng.Next(1, 4).ToString(); // 1..3
                    modulos.Add(EnsureModulo(nome, ch, nivel));
                }

                // Refresh lista completa de módulos
                modulos = context.Modulos.AsNoTracking().ToList();

                // -------------------------
                // 3) SALAS
                // -------------------------
                var salas = new List<Sala>();
                var tipos = new[] { TipoSala.Teorica, TipoSala.Informatica, TipoSala.Reuniao, TipoSala.Oficina };

                for (int i = 1; i <= NUM_SALAS; i++)
                {
                    var tipo = tipos[(i - 1) % tipos.Length];
                    var cap = tipo switch
                    {
                        TipoSala.Reuniao => rng.Next(8, 14),
                        TipoSala.Oficina => rng.Next(12, 20),
                        TipoSala.Informatica => rng.Next(18, 28),
                        _ => rng.Next(20, 32)
                    };

                    var nome = tipo switch
                    {
                        TipoSala.Informatica => $"Lab I{i:00}",
                        TipoSala.Reuniao => $"Sala Reuniões {i:00}",
                        TipoSala.Oficina => $"Oficina {i:00}",
                        _ => $"Sala A{i:00}"
                    };

                    salas.Add(EnsureSala(nome, tipo, cap));
                }

                // -------------------------
                // 4) FORMADORES (muitos)
                // -------------------------
                string[] firstNames = { "João", "Maria", "Rui", "Ana", "Sofia", "Tiago", "Bruno", "Carla", "Diana", "Miguel", "Inês", "Pedro", "Paulo", "Rita", "Luís", "Fábio", "Vera", "Nuno" };
                string[] lastNames = { "Silva", "Santos", "Almeida", "Costa", "Ferreira", "Ribeiro", "Martins", "Rocha", "Pereira", "Gomes", "Lopes", "Carvalho", "Sousa", "Barbosa", "Correia" };

                var cores = new[] { "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#22C55E", "#F97316" };
                var formadores = new List<Formador>();

                for (int i = 1; i <= NUM_FORMADORES; i++)
                {
                    var fn = firstNames[rng.Next(firstNames.Length)];
                    var ln = lastNames[rng.Next(lastNames.Length)];
                    var nome = $"{fn} {ln}";
                    var email = $"formador{i:000}@123.pt";

                    var u = EnsureUser(nome, email, "Formador", true);

                    // área de especialização "semi-realista"
                    var esp = (i % 3) switch
                    {
                        0 => "Informática",
                        1 => "Redes",
                        _ => "Bases de Dados"
                    };

                    var f = EnsureFormador(u, esp, cores[i % cores.Length]);
                    formadores.Add(f);
                }

                // -------------------------
                // 5) FORMANDOS (muitos)
                // -------------------------
                var formandos = new List<Formando>();

                for (int i = 1; i <= NUM_FORMANDOS; i++)
                {
                    var fn = firstNames[rng.Next(firstNames.Length)];
                    var ln = lastNames[rng.Next(lastNames.Length)];
                    var nome = $"{fn} {ln}";
                    var email = $"aluno{i:0000}@123.pt";

                    var u = EnsureUser(nome, email, "Formando", true);

                    // Número aluno único
                    var numero = $"A{i:0000}";

                    // nascimento (18-35 anos)
                    var age = rng.Next(18, 36);
                    var dob = today.AddYears(-age).AddDays(rng.Next(0, 365));

                    var a = EnsureFormando(u, numero, dob);
                    formandos.Add(a);
                }

                // Refresh (para IDs certinhos)
                formadores = context.Formadores.Include(f => f.User).AsNoTracking().ToList();
                formandos = context.Formandos.Include(f => f.User).AsNoTracking().ToList();
                salas = context.Salas.AsNoTracking().ToList();
                cursos = context.Cursos.AsNoTracking().ToList();

                // -------------------------
                // 6) TURMAS + TURMA_MODULOS (muitas)
                // -------------------------
                var locais = new[] { "Palmela", "Lisboa", "Setúbal" };
                var turmasCriadas = new List<Turma>();

                // gerar nomes de turmas consistentes por curso
                string Slug(string s)
                {
                    var normalized = s.Normalize(NormalizationForm.FormD);
                    var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray();
                    var clean = new string(chars).Normalize(NormalizationForm.FormC);
                    clean = clean.Replace(" ", "").Replace("-", "").Replace(".", "");
                    clean = new string(clean.Where(char.IsLetterOrDigit).ToArray());
                    return clean.Length > 8 ? clean.Substring(0, 8).ToUpperInvariant() : clean.ToUpperInvariant();
                }

                foreach (var curso in cursos)
                {
                    var slug = Slug(curso.Nome);
                    var local = locais[rng.Next(locais.Length)];

                    for (int i = 1; i <= TURMAS_POR_CURSO; i++)
                    {
                        // Distribuição de estados:
                        // i=1 -> Terminada, i=2/3 -> Decorrer, i=4 -> Planeada
                        string estado;
                        DateTime ini, fim;

                        if (i == 1)
                        {
                            estado = "Terminada";
                            ini = today.AddMonths(-10).AddDays(rng.Next(0, 20));
                            fim = ini.AddMonths(5).AddDays(rng.Next(0, 30));
                        }
                        else if (i == TURMAS_POR_CURSO)
                        {
                            estado = "Planeada";
                            ini = today.AddDays(rng.Next(10, 60));
                            fim = ini.AddMonths(5).AddDays(rng.Next(0, 30));
                        }
                        else
                        {
                            estado = "Decorrer";
                            ini = today.AddMonths(-2).AddDays(rng.Next(0, 15));
                            fim = ini.AddMonths(6).AddDays(rng.Next(0, 30));
                        }

                        var coord = formadores[rng.Next(formadores.Count)];
                        var nomeTurma = $"{slug}-{local.ToUpperInvariant().Substring(0, 3)}-{today.Year % 100:00}{rng.Next(1, 13):00}-{i:00}";

                        var turma = EnsureTurma(nomeTurma, curso, coord, ini, fim, local, estado);
                        turmasCriadas.Add(turma);

                        // Atribuir MODULOS_POR_TURMA módulos distintos
                        var usados = new HashSet<int>();
                        for (int seq = 1; seq <= MODULOS_POR_TURMA; seq++)
                        {
                            Modulo pick;
                            do pick = modulos[rng.Next(modulos.Count)];
                            while (!usados.Add(pick.Id));

                            // escolher formador “responsável” (aleatório)
                            var f = formadores[rng.Next(formadores.Count)];
                            EnsureTurmaModulo(turma, pick, f, seq);
                        }
                    }
                }

                // Refresh para IDs
                turmasCriadas = context.Turmas.AsNoTracking().ToList();
                var turmaModulos = context.TurmaModulos
                    .Include(tm => tm.Turma)
                    .Include(tm => tm.Modulo)
                    .AsNoTracking()
                    .ToList();

                // -------------------------
                // 7) INSCRIÇÕES (muitas, respeitando UNIQUE(CursoId,FormandoId))
                // -------------------------
                // Carregar pares já existentes (se houver)
                var existingPairs = new HashSet<(int cursoId, int formandoId)>(
                    context.Inscricoes.Select(x => new ValueTuple<int, int>(x.CursoId, x.FormandoId)).ToList()
                );

                var inscricoesNovas = new List<Inscricao>();

                // Para cada turma, escolhe um grupo de alunos
                foreach (var turma in turmasCriadas)
                {
                    var qtd = rng.Next(MIN_ALUNOS_POR_TURMA, MAX_ALUNOS_POR_TURMA + 1);
                    var pool = formandos.OrderBy(_ => rng.Next()).Take(qtd).ToList();

                    foreach (var aluno in pool)
                    {
                        // garante que o aluno não está repetido no mesmo curso
                        var key = (turma.CursoId, aluno.Id);
                        if (existingPairs.Contains(key)) continue;

                        string estadoInscricao;
                        int? turmaId;

                        if (turma.Estado == "Planeada")
                        {
                            // candidaturas: metade ainda sem turma atribuída
                            estadoInscricao = "Candidatura";
                            turmaId = (rng.NextDouble() < 0.5) ? null : turma.Id;
                        }
                        else if (turma.Estado == "Decorrer")
                        {
                            estadoInscricao = (rng.NextDouble() < 0.1) ? "Desistiu" : "Ativo";
                            turmaId = turma.Id;
                        }
                        else // Terminada
                        {
                            estadoInscricao = (rng.NextDouble() < 0.12) ? "Desistiu" : "Concluido";
                            turmaId = turma.Id;
                        }

                        inscricoesNovas.Add(new Inscricao
                        {
                            CursoId = turma.CursoId,
                            FormandoId = aluno.Id,
                            TurmaId = turmaId,
                            Estado = estadoInscricao,
                            DataInscricao = Utc(DateTime.UtcNow.AddDays(-rng.Next(0, 120)))
                        });

                        existingPairs.Add(key);
                    }
                }

                if (inscricoesNovas.Count > 0)
                {
                    context.Inscricoes.AddRange(inscricoesNovas);
                    context.SaveChanges();
                }

                // Refresh inscrições
                var inscricoes = context.Inscricoes
                    .Include(i => i.Formando).ThenInclude(f => f.User)
                    .Include(i => i.Turma)
                    .AsNoTracking()
                    .ToList();

                // -------------------------
                // 8) AVALIAÇÕES (muitas)
                // -------------------------
                // Só criar avaliações para inscrições com TurmaId e estado Ativo/Concluido
                var inscricoesParaNotas = inscricoes
                    .Where(i => i.TurmaId != null && (i.Estado == "Ativo" || i.Estado == "Concluido"))
                    .ToList();

                // Index rápido: turmaId -> lista turmaModulos por sequência
                var tmByTurma = turmaModulos
                    .GroupBy(tm => tm.TurmaId)
                    .ToDictionary(g => g.Key, g => g.OrderBy(x => x.Sequencia).ToList());

                foreach (var ins in inscricoesParaNotas)
                {
                    var tId = ins.TurmaId!.Value;
                    if (!tmByTurma.ContainsKey(tId)) continue;

                    var listaTM = tmByTurma[tId];

                    // Quantas notas por aluno?
                    int notas = (ins.Turma?.Estado == "Terminada")
                        ? rng.Next(6, Math.Min(10, listaTM.Count) + 1)
                        : rng.Next(3, Math.Min(7, listaTM.Count) + 1);

                    // Primeiros módulos (simula progresso)
                    var subset = listaTM.Take(notas).ToList();

                    foreach (var tm in subset)
                    {
                        // notas 8..20 com distribuição “realista”
                        decimal baseNota = (decimal)(8 + rng.NextDouble() * 12);
                        if (rng.NextDouble() < 0.08) baseNota = (decimal)(rng.Next(0, 6)); // alguns maus resultados
                        var nota = Math.Round(baseNota, 2);

                        var obs = nota >= 16 ? "Muito bom." :
                                  nota >= 12 ? "Satisfatório." :
                                  nota >= 8 ? "Precisa reforçar." :
                                  "Insuficiente.";

                        EnsureAvaliacao(ins.Turma!, ins, tm, nota, obs);
                    }
                }

                context.SaveChanges();

                // -------------------------
                // 9) SESSÕES (horários) + DISPONIBILIDADES (muitas)
                // -------------------------
                // Sessões: só para turmas Decorrer/Terminada
                var turmasAtivasOuFim = context.Turmas
                    .Where(t => t.Estado == "Decorrer" || t.Estado == "Terminada")
                    .AsNoTracking()
                    .ToList();

                // Map salas por tipo para alternar
                var salasTeor = salas.Where(s => s.Tipo == TipoSala.Teorica).ToList();
                var salasLab = salas.Where(s => s.Tipo == TipoSala.Informatica).ToList();
                if (salasTeor.Count == 0) salasTeor = salas.ToList();
                if (salasLab.Count == 0) salasLab = salas.ToList();

                foreach (var turma in turmasAtivasOuFim)
                {
                    if (!tmByTurma.ContainsKey(turma.Id)) continue;

                    var listaTM = tmByTurma[turma.Id];
                    var start = Utc(turma.DataInicio).Date.AddDays(1);                    // começa “um dia depois”
                    int weekOffset = 0;

                    foreach (var tm in listaTM)
                    {
                        // Cada módulo tem SESSOES_POR_MODULO sessões espaçadas
                        for (int s = 0; s < SESSOES_POR_MODULO; s++)
                        {
                            var dia = start.AddDays(weekOffset * 7 + (s % 3)); // 0,1,2
                            // horários: 09-12 / 14-17 alternado
                            var ini = dia.AddHours((s % 2 == 0) ? 9 : 14);
                            var fim = ini.AddHours(3);

                            var sala = (s % 2 == 0) ? salasTeor[rng.Next(salasTeor.Count)] : salasLab[rng.Next(salasLab.Count)];
                            EnsureSessao(tm, sala, ini, fim);
                        }

                        weekOffset += 1; // próximo módulo “na semana a seguir”
                    }
                }

                // Disponibilidades: para próximos X semanas (Seg-Sex 09-18)
                // + alguns bloqueios aleatórios (manutenção/indisponibilidade)
                var formadoresAtuais = context.Formadores.AsNoTracking().ToList();
                var salasAtuais = context.Salas.AsNoTracking().ToList();

                for (int w = 0; w < SEMANAS_DISPONIBILIDADE; w++)
                {
                    for (int d = 0; d < 5; d++) // seg-sex
                    {
                        var day = today.AddDays(w * 7 + d);
                        var ini = day.AddHours(9);
                        var fim = day.AddHours(18);

                        foreach (var f in formadoresAtuais)
                            EnsureDisponibilidadeFormador(f, ini, fim, true);

                        foreach (var s in salasAtuais)
                            EnsureDisponibilidadeSala(s, ini, fim, true);

                        // Bloqueios (10% dos dias em 1 formador e 1 sala)
                        if (rng.NextDouble() < 0.10)
                        {
                            var f = formadoresAtuais[rng.Next(formadoresAtuais.Count)];
                            EnsureDisponibilidadeFormador(f, day.AddHours(14), day.AddHours(18), false);
                        }

                        if (rng.NextDouble() < 0.08)
                        {
                            var s = salasAtuais[rng.Next(salasAtuais.Count)];
                            EnsureDisponibilidadeSala(s, day.AddHours(9), day.AddHours(13), false);
                        }
                    }
                }

                context.SaveChanges();

                // -------------------------
                // FIM
                // -------------------------
                Console.WriteLine(">> SEED MASSIVO concluído ✅");
                Console.WriteLine($"   Users: {context.Users.Count()} | Formadores: {context.Formadores.Count()} | Formandos: {context.Formandos.Count()}");
                Console.WriteLine($"   Areas: {context.Areas.Count()} | Cursos: {context.Cursos.Count()} | Modulos: {context.Modulos.Count()}");
                Console.WriteLine($"   Turmas: {context.Turmas.Count()} | TurmaModulos: {context.TurmaModulos.Count()}");
                Console.WriteLine($"   Inscricoes: {context.Inscricoes.Count()} | Avaliacoes: {context.Avaliacoes.Count()}");
                Console.WriteLine($"   Salas: {context.Salas.Count()} | Sessoes: {context.Sessoes.Count()} | Disponibilidades: {context.Disponibilidades.Count()}");
            }
            catch (Exception ex)
            {
                Console.WriteLine("!!! ERRO NO SEED MASSIVO:");
                Console.WriteLine(ex.Message);
                if (ex.InnerException != null) Console.WriteLine(ex.InnerException.Message);
            }
        }
    }
}
