using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.DTOs;
using QuizService.Services;

namespace QuizService.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("admin/questions")]
[Route("api/admin/questions")]
public class AdminQuestionsController : ControllerBase
{
    private readonly IQuizDataService _quizDataService;

    public AdminQuestionsController(IQuizDataService quizDataService)
    {
        _quizDataService = quizDataService;
    }

    [HttpPut("{questionId:guid}")]
    public async Task<IActionResult> Update(Guid questionId, [FromBody] QuestionDto request)
    {
        var updated = await _quizDataService.UpdateQuestionAsync(questionId, request);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{questionId:guid}")]
    public async Task<IActionResult> Delete(Guid questionId)
    {
        var deleted = await _quizDataService.DeleteQuestionAsync(questionId);
        return deleted ? NoContent() : NotFound();
    }
}
