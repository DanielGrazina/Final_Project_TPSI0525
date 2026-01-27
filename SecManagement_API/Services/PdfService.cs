using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SecManagement_API.Data;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class PdfService : IPdfService
    {
        private readonly AppDbContext _context;

        public PdfService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<byte[]> GenerateFormandoReportAsync(int userId)
        {
            // Buscar Dados Completos do Formando
            var formando = await _context.Formandos
                .Include(f => f.User)
                .Include(f => f.User.Ficheiros) // Para tentar achar a foto
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formando == null) throw new Exception("Formando não encontrado.");

            // Buscar Histórico Escolar (Inscrições + Notas)
            var historico = await _context.Inscricoes
                .Include(i => i.Turma).ThenInclude(t => t.Curso)
                .Where(i => i.FormandoId == formando.Id)
                .ToListAsync();

            // Buscar todas as avaliações deste aluno
            var avaliacoes = await _context.Avaliacoes
                .Include(a => a.TurmaModulo).ThenInclude(tm => tm.Modulo)
                .Where(a => a.Inscricao.FormandoId == formando.Id)
                .ToListAsync();

            // Gerar PDF
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(12));

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text(formando.User?.Nome ?? "Nome Desconhecido").SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);
                            col.Item().Text($"Nº Aluno: {formando.NumeroAluno}");
                            col.Item().Text($"Email: {formando.User?.Email}");
                        });

                        var foto = formando.User?.Ficheiros.FirstOrDefault(f => f.ContentType.StartsWith("image/"));
                        if (foto != null)
                        {
                            row.ConstantItem(100).Image(foto.Ficheiro);
                        }
                    });

                    page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                    {
                        col.Item().Text("Relatório de Formação").FontSize(16).Underline();
                        col.Item().PaddingBottom(10);

                        foreach (var inscricao in historico)
                        {
                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                            {
                                c.Item().Text($"Curso: {inscricao.Turma?.Curso?.Nome}").Bold();
                                c.Item().Text($"Turma: {inscricao.Turma?.Nome} ({inscricao.Turma?.DataInicio:d} - {inscricao.Turma?.DataFim:d})");
                                c.Item().Text($"Estado: {inscricao.Estado}");

                                // Tabela de Notas deste curso
                                var notasCurso = avaliacoes.Where(a => a.TurmaId == inscricao.TurmaId).ToList();

                                if (notasCurso.Any())
                                {
                                    c.Item().PaddingTop(5).Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(); // Módulo
                                            columns.ConstantColumn(50); // Nota
                                        });

                                        table.Header(header =>
                                        {
                                            header.Cell().Text("Módulo").Bold();
                                            header.Cell().Text("Nota").Bold();
                                        });

                                        foreach (var nota in notasCurso)
                                        {
                                            table.Cell().Text(nota.TurmaModulo?.Modulo?.Nome);
                                            table.Cell().Text(nota.AvaliacaoValor.ToString("F2"));
                                        }
                                    });
                                }
                                else
                                {
                                    c.Item().Text("Sem avaliações registadas.").Italic().FontColor(Colors.Grey.Medium);
                                }
                            });
                            col.Item().PaddingBottom(10);
                        }
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Gerado por ATEC Management System - ");
                        x.CurrentPageNumber();
                    });
                });
            })
            .GeneratePdf();
        }

        public async Task<byte[]> GenerateFormadorReportAsync(int userId)
        {
            // Buscar Dados Formador
            var formador = await _context.Formadores
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.UserId == userId);

            if (formador == null) throw new Exception("Formador não encontrado.");

            // Buscar módulos lecionados (Histórico)
            var turmasModulos = await _context.TurmaModulos
                .Include(tm => tm.Turma).ThenInclude(t => t.Curso)
                .Include(tm => tm.Modulo)
                .Where(tm => tm.FormadorId == formador.Id)
                .OrderByDescending(tm => tm.Turma.DataInicio)
                .ToListAsync();

            // Gerar PDF
            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);

                    page.Header().Column(col =>
                    {
                        col.Item().Text(formador.User?.Nome).SemiBold().FontSize(20).FontColor(Colors.Blue.Darken2);
                        col.Item().Text($"Especialização: {formador.AreaEspecializacao}");
                        col.Item().Text($"Email: {formador.User?.Email}");
                    });

                    page.Content().PaddingVertical(20).Column(col =>
                    {
                        col.Item().Text("Histórico de Lecionação").FontSize(16).Bold();
                        col.Item().PaddingBottom(10);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(80); // Data
                                columns.RelativeColumn();   // Curso/Turma
                                columns.RelativeColumn();   // Módulo
                                columns.ConstantColumn(60); // Horas
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellStyle).Text("Início");
                                header.Cell().Element(CellStyle).Text("Turma");
                                header.Cell().Element(CellStyle).Text("Módulo");
                                header.Cell().Element(CellStyle).Text("Carga");

                                static IContainer CellStyle(IContainer container)
                                {
                                    return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                                }
                            });

                            foreach (var item in turmasModulos)
                            {
                                table.Cell().Element(BodyCellStyle).Text(item.Turma?.DataInicio.ToShortDateString());
                                table.Cell().Element(BodyCellStyle).Text($"{item.Turma?.Curso?.Nome}\n({item.Turma?.Nome})");
                                table.Cell().Element(BodyCellStyle).Text(item.Modulo?.Nome);
                                table.Cell().Element(BodyCellStyle).Text($"{item.Modulo?.CargaHoraria}h");

                                static IContainer BodyCellStyle(IContainer container)
                                {
                                    return container.PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                                }
                            }
                        });
                    });

                    page.Footer().AlignCenter().Text(x => x.CurrentPageNumber());
                });
            })
            .GeneratePdf();
        }
    }
}