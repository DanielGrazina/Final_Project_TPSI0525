using Microsoft.EntityFrameworkCore;
using SecManagement_API.Models;
using Npgsql;

namespace SecManagement_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // --- AUTH & USERS ---
        public DbSet<User> Users { get; set; }
        public DbSet<Formador> Formadores { get; set; }
        public DbSet<Formando> Formandos { get; set; }
        public DbSet<UserFicheiro> UserFicheiros { get; set; }

        // --- PEDAGÓGICA ---
        public DbSet<Area> Areas { get; set; }
        public DbSet<Curso> Cursos { get; set; }
        public DbSet<Modulo> Modulos { get; set; }
        public DbSet<Turma> Turmas { get; set; }
        public DbSet<TurmaModulo> TurmaModulos { get; set; }
        public DbSet<Inscricao> Inscricoes { get; set; }
        public DbSet<Avaliacao> Avaliacoes { get; set; }

        // --- LOGÍSTICA ---
        public DbSet<Sala> Salas { get; set; }
        public DbSet<Sessao> Sessoes { get; set; }
        public DbSet<Disponibilidade> Disponibilidades { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<TurmaModulo>().ToTable("Turma_Modulos");

            modelBuilder.Entity<Sala>()
                .Property(s => s.Tipo)
                .HasConversion<string>();

            modelBuilder.Entity<Turma>()
                .Property(t => t.Estado)
                .HasConversion<string>();

            modelBuilder.Entity<Inscricao>()
                .Property(i => i.Estado)
                .HasConversion<string>();

            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .HasConversion<string>(); 

            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<Formando>().HasIndex(f => f.NumeroAluno).IsUnique();

            modelBuilder.Entity<Formador>()
                .HasOne(f => f.User)
                .WithOne(u => u.FormadorProfile)
                .HasForeignKey<Formador>(f => f.UserId);

            modelBuilder.Entity<Formando>()
                .HasOne(f => f.User)
                .WithOne(u => u.FormandoProfile)
                .HasForeignKey<Formando>(f => f.UserId);

            foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}