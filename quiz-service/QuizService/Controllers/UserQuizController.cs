using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.Extensions;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize]
[Route("users/me")]
[Route("api/users/me")]
public class UserQuizController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public UserQuizController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpGet("quiz-summary")]
    public async Task<IActionResult> GetQuizSummary()
    {
        var quizzes = await _quizDataService.GetQuizzesAsync();
        var histories = await _quizDataService.GetUserHistoriesAsync(User.GetUserId(), User.GetUserEmail());
        var quizzesById = quizzes.ToDictionary(quiz => quiz.Id);

        var recentResults = histories
            .OrderByDescending(history => history.CompletedAt)
            .Take(3)
            .Select(history => new
            {
                quizTitle = quizzesById.TryGetValue(history.QuizId, out var quiz) ? quiz.Title : "Unknown Quiz",
                score = $"{history.Score}/{history.TotalQuestions}",
                completedAt = history.CompletedAt.ToLocalTime().ToString("MMM d, yyyy h:mm tt")
            })
            .ToList();

        return Ok(new
        {
            totalAttempts = histories.Count,
            totalScore = $"{histories.Sum(history => history.Score)}/{histories.Sum(history => history.TotalQuestions)}",
            recentResults
        });
    }
}
