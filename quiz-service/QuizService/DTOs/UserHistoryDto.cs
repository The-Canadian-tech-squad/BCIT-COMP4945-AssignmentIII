namespace QuizService.DTOs;

public sealed class UserHistoryDto
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public List<UserHistoryAnswerDto> Answers { get; set; } = [];
}

public sealed class UserHistoryAnswerDto
{
    public Guid QuestionId { get; set; }
    public string SelectedOptionId { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
