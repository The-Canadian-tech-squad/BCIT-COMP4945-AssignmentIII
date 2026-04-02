using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.DTOs;
using QuizService.Extensions;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("admin/quizzes")]
[Route("api/admin/quizzes")]
public class AdminQuizzesController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public AdminQuizzesController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var quizzes = await _quizDataService.GetQuizzesAsync();

        var results = quizzes
            .OrderBy(quiz => quiz.Title)
            .Select(quiz => new
            {
                id = quiz.Id,
                title = quiz.Title,
                category = quiz.Category,
                status = quiz.Status,
                description = quiz.Description,
                mediaType = quiz.Questions.FirstOrDefault()?.MediaType ?? string.Empty,
                bestScore = $"0/{quiz.Questions.Count}",
                questionCount = quiz.Questions.Count
            })
            .ToList();

        return Ok(results);
    }

    [HttpGet("{quizId:guid}")]
    public async Task<IActionResult> Get(Guid quizId)
    {
        var quiz = await _quizDataService.GetQuizAsync(quizId);
        return quiz == null ? NotFound() : Ok(quiz);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] QuizDto request)
    {
        var createdQuiz = await _quizDataService.CreateQuizAsync(request);
        return CreatedAtAction(nameof(Get), new { quizId = createdQuiz.Id }, createdQuiz);
    }

    [HttpPut("{quizId:guid}")]
    public async Task<IActionResult> Update(Guid quizId, [FromBody] QuizDto request)
    {
        QuizDto? updatedQuiz;
        try
        {
            updatedQuiz = await _quizDataService.UpdateQuizAsync(quizId, request);
        }
        catch (DuplicateCategoryException ex)
        {
            return Conflict(new { message = ex.Message });
        }

        return updatedQuiz == null ? NotFound() : Ok(updatedQuiz);
    }

    [HttpDelete("{quizId:guid}")]
    public async Task<IActionResult> Delete(Guid quizId)
    {
        var deleted = await _quizDataService.DeleteQuizAsync(quizId);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{quizId:guid}/questions")]
    public async Task<IActionResult> CreateQuestion(Guid quizId, [FromBody] QuestionDto request)
    {
        var question = await _quizDataService.CreateQuestionAsync(quizId, request, User.GetUserId(), User.GetUserEmail());
        if (question == null)
        {
            return NotFound();
        }

        return CreatedAtAction(nameof(Get), new { quizId }, question);
    }
}
