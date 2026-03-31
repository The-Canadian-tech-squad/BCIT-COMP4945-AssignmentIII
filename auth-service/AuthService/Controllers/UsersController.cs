using AuthService.DTOs;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("users")]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _authService;

    public UsersController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(CurrentUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me()
    {
        var result = await _authService.GetCurrentUserAsync(User);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new ErrorResponseDto { Message = result.Message });
        }

        return Ok(result.Data);
    }

    [HttpGet("usage")]
    [ProducesResponseType(typeof(UsageResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Usage()
    {
        var result = await _authService.GetUsageAsync(User);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new ErrorResponseDto { Message = result.Message });
        }

        return Ok(result.Data);
    }

    [HttpPost("decrement-usage")]
    [ProducesResponseType(typeof(UsageResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DecrementUsage()
    {
        var result = await _authService.DecrementUsageAsync(User);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new ErrorResponseDto { Message = result.Message });
        }

        return Ok(result.Data);
    }
}
