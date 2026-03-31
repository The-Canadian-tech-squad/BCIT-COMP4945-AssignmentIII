namespace QuizService.DTOs;

public sealed class QuizDto
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public string Description { get; set; } = string.Empty;
    public List<QuestionDto> Questions { get; set; } = [];
}
