namespace QuizService.Models;

public sealed class QuizDataDocument
{
    public List<QuizRecord> Quizzes { get; set; } = [];
    public List<UserHistoryRecord> Histories { get; set; } = [];
}
