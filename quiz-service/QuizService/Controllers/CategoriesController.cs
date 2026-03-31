using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.Extensions;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize]
[Route("categories")]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public CategoriesController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var quizzes = await _quizDataService.GetQuizzesAsync();

        var categories = quizzes
            .GroupBy(quiz => quiz.Category, StringComparer.OrdinalIgnoreCase)
            .Select(group => new
            {
                id = CreateDeterministicGuid(group.Key),
                title = group.First().Category,
                description = $"{group.First().Category} trivia collection.",
                quizCount = group.Count()
            })
            .OrderBy(category => category.title)
            .ToList();

        return Ok(categories);
    }

    [HttpGet("{categoryId:guid}/quizzes")]
    public async Task<IActionResult> ListQuizzes(Guid categoryId)
    {
        var userEmail = User.GetUserEmail();
        var quizzes = await _quizDataService.GetQuizzesAsync();
        var histories = await _quizDataService.GetUserHistoriesAsync(User.GetUserId(), userEmail);

        var results = quizzes
            .Where(quiz => CreateDeterministicGuid(quiz.Category) == categoryId)
            .Select(quiz =>
            {
                var bestHistory = histories
                    .Where(history => history.QuizId == quiz.Id)
                    .OrderByDescending(history => history.Score)
                    .ThenByDescending(history => history.CompletedAt)
                    .FirstOrDefault();

                var mediaType = quiz.Questions.FirstOrDefault()?.MediaType ?? string.Empty;

                return new
                {
                    id = quiz.Id,
                    title = quiz.Title,
                    category = quiz.Category,
                    status = quiz.Status,
                    description = quiz.Description,
                    mediaType,
                    bestScore = bestHistory == null
                        ? $"0/{quiz.Questions.Count}"
                        : $"{bestHistory.Score}/{bestHistory.TotalQuestions}",
                    questionCount = quiz.Questions.Count
                };
            })
            .ToList();

        return Ok(results);
    }

    private static Guid CreateDeterministicGuid(string value)
    {
        var bytes = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(value.Trim().ToLowerInvariant()));
        return new Guid(bytes);
    }
}
