using AuthService.Common;
using AuthService.DTOs;
using System.Security.Claims;

namespace AuthService.Services;

public interface IAuthService
{
    Task<ServiceResult<object>> RegisterAsync(RegisterRequestDto request);
    Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ServiceResult<CurrentUserResponseDto>> GetCurrentUserAsync(ClaimsPrincipal principal);
    Task<ServiceResult<IReadOnlyList<AdminUserRowDto>>> GetAdminUsersAsync(ClaimsPrincipal principal);
}
