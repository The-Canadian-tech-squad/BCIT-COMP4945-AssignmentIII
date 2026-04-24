using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.DTOs;
using QuizService.Extensions;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize]
[Route("quizzes")]
[Route("api/quizzes")]
public class QuizzesController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public QuizzesController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpGet("{quizId:guid}")]
    public async Task<IActionResult> GetQuiz(Guid quizId)
    {
        var quiz = await _quizDataService.GetQuizAsync(quizId);
        return quiz == null ? NotFound() : Ok(quiz);
    }

    [HttpPost("{quizId:guid}/attempts")]
    public async Task<IActionResult> SaveAttempt(Guid quizId, [FromBody] UserHistoryDto request)
    {
        var savedHistory = await _quizDataService.SaveHistoryAsync(quizId, User.GetUserId(), User.GetUserEmail(), request);
        if (savedHistory == null)
        {
            return NotFound();
        }

        var histories = await _quizDataService.GetUserHistoriesAsync(User.GetUserId(), User.GetUserEmail());
        var bestHistory = histories
            .Where(history => history.QuizId == quizId)
            .OrderByDescending(history => history.Score)
            .ThenByDescending(history => history.CompletedAt)
            .First();

        return Ok(new
        {
            message = "Quiz attempt saved successfully.",
            bestScore = $"{bestHistory.Score}/{bestHistory.TotalQuestions}",
            totalAttempts = histories.Count
        });
    }
}
