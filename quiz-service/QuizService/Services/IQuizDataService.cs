using QuizService.DTOs;

namespace QuizService.Services;

public interface IQuizDataService
{
    Task<string> CreateCategoryAsync(string categoryName);
    Task<IReadOnlyList<QuizDto>> GetQuizzesAsync();
    Task<QuizDto?> GetQuizAsync(Guid quizId);
    Task<QuizDto> CreateQuizAsync(QuizDto quiz);
    Task<QuizDto?> UpdateQuizAsync(Guid quizId, QuizDto quiz);
    Task<bool> DeleteQuizAsync(Guid quizId);
    Task<QuestionDto?> CreateQuestionAsync(Guid quizId, QuestionDto question, string userId, string userEmail);
    Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, QuestionDto question);
    Task<bool> DeleteQuestionAsync(Guid questionId);
    Task<UserHistoryDto?> SaveHistoryAsync(Guid quizId, string userId, string userEmail, UserHistoryDto history);
    Task<IReadOnlyList<UserHistoryDto>> GetUserHistoriesAsync(string userId, string userEmail);
    Task<IReadOnlyList<UserHistoryDto>> GetHistoriesAsync();
}
