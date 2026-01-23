using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;
using SecManagement_API.Services.Interfaces;

namespace SecManagement_API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string messageBody)
        {
            var email = new MimeMessage();

            // Who sends
            email.From.Add(new MailboxAddress(
                _config["EmailSettings:SenderName"],
                _config["EmailSettings:SenderEmail"]));

            // Who receives
            email.To.Add(MailboxAddress.Parse(toEmail));

            email.Subject = subject;

            // Email body (HTML)
            email.Body = new TextPart(TextFormat.Html) { Text = messageBody };

            // Send via SMTP
            using var smtp = new SmtpClient();
            try
            {
                // Connect to server
                await smtp.ConnectAsync(
                    _config["EmailSettings:Server"],
                    int.Parse(_config["EmailSettings:Port"]!),
                    SecureSocketOptions.StartTls);

                // Authenticate
                await smtp.AuthenticateAsync(
                    _config["EmailSettings:Username"],
                    _config["EmailSettings:Password"]);

                // Send
                await smtp.SendAsync(email);
            }
            catch (Exception ex)
            {
                throw new Exception($"Erro ao enviar email: {ex.Message}");
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }
    }
}