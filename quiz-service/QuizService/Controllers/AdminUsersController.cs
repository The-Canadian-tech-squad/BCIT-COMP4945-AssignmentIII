using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("admin/users")]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public AdminUsersController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformance([FromQuery] int page = 1, [FromQuery] int pageSize = 1)
    {
        var quizzes = await _quizDataService.GetQuizzesAsync();
        var histories = await _quizDataService.GetHistoriesAsync();
        var quizzesById = quizzes.ToDictionary(quiz => quiz.Id);

        var users = histories
            .GroupBy(history => history.Email, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var orderedHistories = group.OrderByDescending(history => history.CompletedAt).ToList();

                var quizStats = orderedHistories
                    .GroupBy(history => history.QuizId)
                    .Select(historyGroup =>
                    {
                        var bestHistory = historyGroup
                            .OrderByDescending(history => history.Score)
                            .ThenByDescending(history => history.CompletedAt)
                            .First();

                        return new
                        {
                            quizTitle = quizzesById.TryGetValue(historyGroup.Key, out var quiz) ? quiz.Title : "Unknown Quiz",
                            bestScore = $"{bestHistory.Score}/{bestHistory.TotalQuestions}",
                            completedAt = bestHistory.CompletedAt.ToLocalTime().ToString("MMM d, yyyy h:mm tt")
                        };
                    })
                    .OrderBy(entry => entry.quizTitle)
                    .ToList();

                return new
                {
                    email = group.Key,
                    totalAttempts = orderedHistories.Count,
                    totalScore = $"{orderedHistories.Sum(history => history.Score)}/{orderedHistories.Sum(history => history.TotalQuestions)}",
                    lastPlayed = orderedHistories.First().CompletedAt.ToLocalTime().ToString("MMM d, yyyy h:mm tt"),
                    quizStats
                };
            })
            .OrderBy(user => user.email)
            .ToList();

        var safePageSize = Math.Max(pageSize, 1);
        var totalUsers = users.Count;
        var totalPages = Math.Max((int)Math.Ceiling(totalUsers / (double)safePageSize), 1);
        var safePage = Math.Clamp(page, 1, totalPages);
        var items = users
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToList();

        return Ok(new
        {
            page = safePage,
            pageSize = safePageSize,
            totalUsers,
            items
        });
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions([FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        var sessions = await _quizDataService.GetAdminSessionsAsync();

        var ordered = sessions
            .OrderByDescending(entry => entry.StartedAt ?? DateTimeOffset.MinValue)
            .ToList();

        var safePageSize = Math.Max(pageSize, 1);
        var totalSessions = ordered.Count;
        var totalPages = Math.Max((int)Math.Ceiling(totalSessions / (double)safePageSize), 1);
        var safePage = Math.Clamp(page, 1, totalPages);
        var items = ordered
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Select(entry => new
            {
                id = entry.Id,
                sessionCode = entry.SessionCode,
                category = entry.Category,
                hostEmail = entry.HostEmail,
                status = entry.Status,
                startedAt = entry.StartedAt,
                endedAt = entry.EndedAt,
                startedAtText = entry.StartedAt.HasValue ? entry.StartedAt.Value.ToLocalTime().ToString("MMM d, yyyy h:mm tt") : "--",
                endedAtText = entry.EndedAt.HasValue ? entry.EndedAt.Value.ToLocalTime().ToString("MMM d, yyyy h:mm tt") : "--",
                participantCount = entry.ParticipantCount,
                questionCount = entry.QuestionCount
            })
            .ToList();

        return Ok(new
        {
            page = safePage,
            pageSize = safePageSize,
            totalSessions,
            items
        });
    }
}
