namespace AuthService.Models;

public sealed class ApiUsageRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public UserRecord? User { get; set; }
}
