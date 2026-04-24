namespace QuizService.Services;

public sealed class NoopModeratedQuizPersistenceService : IModeratedQuizPersistenceService
{
    public Task TrackSessionCreatedAsync(string sessionCode, string hostEmail, string quizId, string quizTitle)
        => Task.CompletedTask;

    public Task TrackAnswerSubmittedAsync(string sessionCode, string questionId, string participantEmail, int selectedOptionIndex)
        => Task.CompletedTask;

    public Task TrackSessionCompletedAsync(string sessionCode)
        => Task.CompletedTask;
}
