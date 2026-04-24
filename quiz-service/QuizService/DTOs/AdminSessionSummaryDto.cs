namespace QuizService.DTOs;

public sealed class AdminSessionSummaryDto
{
    public Guid Id { get; set; }
    public string SessionCode { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string HostEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int ParticipantCount { get; set; }
    public int QuestionCount { get; set; }
}
