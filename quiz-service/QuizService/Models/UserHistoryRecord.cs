namespace QuizService.Models;

public sealed class UserHistoryRecord
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public List<UserHistoryAnswerRecord> Answers { get; set; } = [];
}

public sealed class UserHistoryAnswerRecord
{
    public Guid QuestionId { get; set; }
    public string SelectedOptionId { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
