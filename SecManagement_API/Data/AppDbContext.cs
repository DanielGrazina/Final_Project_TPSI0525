using Microsoft.EntityFrameworkCore;
using SecManagement_API.Models;

namespace SecManagement_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        public DbSet<Curso> Cursos { get; set; }
        public DbSet<Modulo> Modulos { get; set; }
        public DbSet<Sala> Salas { get; set; }
        public DbSet<Formador> Formadores { get; set; }
        public DbSet<Formando> Formandos { get; set; }
        public DbSet<CursoModulo> CursoModulos { get; set; } // Distribuição
        public DbSet<Aula> Aulas { get; set; } // Horários

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<CursoModulo>()
                .HasOne(cm => cm.Curso)
                .WithMany(c => c.CursoModulos)
                .HasForeignKey(cm => cm.CursoId);

            foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}