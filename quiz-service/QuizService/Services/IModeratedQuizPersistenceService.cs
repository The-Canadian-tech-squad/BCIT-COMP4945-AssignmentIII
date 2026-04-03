namespace QuizService.Services;

public interface IModeratedQuizPersistenceService
{
    Task TrackSessionCreatedAsync(string sessionCode, string hostEmail, string quizId, string quizTitle);
    Task TrackAnswerSubmittedAsync(string sessionCode, string questionId, string participantEmail, int selectedOptionIndex);
    Task TrackSessionCompletedAsync(string sessionCode);
}
