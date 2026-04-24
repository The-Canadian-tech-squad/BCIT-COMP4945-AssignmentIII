using Microsoft.AspNetCore.Mvc;

namespace QuizService.Controllers;

[ApiController]
[Route("")]
[Route("api")]
public class HealthController : ControllerBase
{
    [HttpGet]
    [HttpGet("health")]
    public IActionResult Get()
    {
        return Ok(new
        {
            service = "quiz-service",
            status = "ok"
        });
    }
}
