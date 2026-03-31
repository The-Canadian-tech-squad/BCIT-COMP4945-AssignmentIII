using AuthService.DTOs;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAuthService _authService;

    public AdminController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("users")]
    [ProducesResponseType(typeof(IEnumerable<AdminUserRowDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Users()
    {
        var result = await _authService.GetAdminUsersAsync(User);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new ErrorResponseDto { Message = result.Message });
        }

        return Ok(result.Data);
    }
}
