using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using QuizService.Extensions;
using QuizService.Services;

namespace QuizService.Hubs;

[Authorize]
public sealed class ModeratedQuizHub : Hub
{
    private readonly ModeratedQuizSessionStore _sessionStore;
    private readonly IModeratedQuizPersistenceService _persistenceService;
    private readonly ILogger<ModeratedQuizHub> _logger;

    public ModeratedQuizHub(
        ModeratedQuizSessionStore sessionStore,
        IModeratedQuizPersistenceService persistenceService,
        ILogger<ModeratedQuizHub> logger)
    {
        _sessionStore = sessionStore;
        _persistenceService = persistenceService;
        _logger = logger;
    }

    public async Task<ModeratedSessionSnapshot> HostCreateSession(string quizId, string quizTitle)
    {
        var snapshot = _sessionStore.CreateSession(
            Context.ConnectionId,
            Context.User?.GetUserEmail() ?? "host",
            quizId?.Trim() ?? string.Empty,
            quizTitle?.Trim() ?? "Quiz Session");

        await Groups.AddToGroupAsync(Context.ConnectionId, snapshot.SessionCode);
        await Clients.Caller.SendAsync("SessionUpdated", snapshot);
        await TryPersistSessionCreated(snapshot, Context.User?.GetUserEmail() ?? string.Empty);
        return snapshot;
    }

    public async Task<bool> JoinSessionAsParticipant(string sessionCode, string displayName)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        var normalizedName = (displayName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        if (!_sessionStore.TryJoinParticipant(
                normalizedCode,
                Context.ConnectionId,
                normalizedName,
                Context.User?.GetUserEmail() ?? string.Empty,
                out var snapshot))
        {
            return false;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, normalizedCode);
        await Clients.Group(normalizedCode).SendAsync("SessionUpdated", snapshot);

        if (_sessionStore.TryGetCurrentQuestion(normalizedCode, out var currentQuestion))
        {
            await Clients.Caller.SendAsync("QuestionChanged", currentQuestion);
        }

        if (_sessionStore.TryGetStats(normalizedCode, out var stats))
        {
            await Clients.Caller.SendAsync("AnswerStatsUpdated", stats);
        }

        return true;
    }

    public async Task<bool> HostSetQuestion(string sessionCode, ModeratedQuestionPayload payload)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        if (!_sessionStore.TrySetQuestion(normalizedCode, Context.ConnectionId, payload, out var questionState))
        {
            return false;
        }

        await Clients.Group(normalizedCode).SendAsync("QuestionChanged", questionState);

        if (_sessionStore.TryGetStats(normalizedCode, out var stats))
        {
            await Clients.Group(normalizedCode).SendAsync("AnswerStatsUpdated", stats);
        }

        return true;
    }

    public async Task<bool> HostRevealAnswer(string sessionCode)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        if (!_sessionStore.TryRevealAnswer(normalizedCode, Context.ConnectionId, out var questionState))
        {
            return false;
        }

        await Clients.Group(normalizedCode).SendAsync("QuestionChanged", questionState);
        return true;
    }

    public async Task<bool> HostResumeSession(string sessionCode)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        if (!_sessionStore.TryResumeHostSession(
                normalizedCode,
                Context.ConnectionId,
                Context.User?.GetUserEmail() ?? string.Empty,
                out var snapshot))
        {
            return false;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, normalizedCode);
        await Clients.Group(normalizedCode).SendAsync("SessionUpdated", snapshot);

        if (_sessionStore.TryGetCurrentQuestion(normalizedCode, out var currentQuestion))
        {
            await Clients.Caller.SendAsync("QuestionChanged", currentQuestion);
        }

        if (_sessionStore.TryGetStats(normalizedCode, out var stats))
        {
            await Clients.Caller.SendAsync("AnswerStatsUpdated", stats);
        }

        return true;
    }

    public async Task<bool> HostEndSession(string sessionCode)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        if (!_sessionStore.TryEndSession(normalizedCode, Context.ConnectionId, out var snapshot))
        {
            return false;
        }

        await TryPersistSessionCompleted(normalizedCode);
        await Clients.GroupExcept(normalizedCode, [Context.ConnectionId]).SendAsync("SessionClosed", "Host ended the session.");
        await Clients.Caller.SendAsync("SessionUpdated", snapshot);
        return true;
    }

    public async Task<bool> SubmitAnswer(string sessionCode, int optionIndex)
    {
        var normalizedCode = (sessionCode ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return false;
        }

        var accepted = _sessionStore.TrySubmitAnswer(normalizedCode, Context.ConnectionId, optionIndex, out var stats);
        if (!accepted)
        {
            return false;
        }

        if (_sessionStore.TryGetCurrentQuestion(normalizedCode, out var currentQuestion) &&
            _sessionStore.TryGetParticipant(normalizedCode, Context.ConnectionId, out var participant))
        {
            await TryPersistAnswer(normalizedCode, currentQuestion.QuestionId, participant.UserEmail, optionIndex);
        }

        await Clients.Group(normalizedCode).SendAsync("AnswerStatsUpdated", stats);
        return true;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_sessionStore.TryRemoveConnection(Context.ConnectionId, out var sessionCode, out var hostDisconnected, out var snapshot))
        {
            if (hostDisconnected)
            {
                await Clients.Group(sessionCode).SendAsync("SessionClosed", "Host ended the session.");
                await TryPersistSessionCompleted(sessionCode);
            }
            else
            {
                await Clients.Group(sessionCode).SendAsync("SessionUpdated", snapshot);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task TryPersistSessionCreated(ModeratedSessionSnapshot snapshot, string hostEmail)
    {
        try
        {
            await _persistenceService.TrackSessionCreatedAsync(snapshot.SessionCode, hostEmail, snapshot.QuizId, snapshot.QuizTitle);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to persist moderated session creation. SessionCode={SessionCode}, HostEmail={HostEmail}, QuizId={QuizId}, QuizTitle={QuizTitle}",
                snapshot.SessionCode,
                hostEmail,
                snapshot.QuizId,
                snapshot.QuizTitle);
        }
    }

    private async Task TryPersistAnswer(string sessionCode, string questionId, string participantEmail, int selectedOptionIndex)
    {
        try
        {
            await _persistenceService.TrackAnswerSubmittedAsync(sessionCode, questionId, participantEmail, selectedOptionIndex);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to persist moderated answer. SessionCode={SessionCode}, QuestionId={QuestionId}, ParticipantEmail={ParticipantEmail}, SelectedOptionIndex={SelectedOptionIndex}",
                sessionCode,
                questionId,
                participantEmail,
                selectedOptionIndex);
        }
    }

    private async Task TryPersistSessionCompleted(string sessionCode)
    {
        try
        {
            await _persistenceService.TrackSessionCompletedAsync(sessionCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to persist moderated session completion. SessionCode={SessionCode}",
                sessionCode);
        }
    }
}
