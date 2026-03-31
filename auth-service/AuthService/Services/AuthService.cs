using AuthService.Common;
using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace AuthService.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IMessageProvider _messageProvider;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IMessageProvider messageProvider)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _messageProvider = messageProvider;
    }

    public async Task<ServiceResult<object>> RegisterAsync(RegisterRequestDto request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var normalizedRole = NormalizeRole(request.Role);

        if (!IsValidRegistration(normalizedEmail, request.Password, normalizedRole))
        {
            return ServiceResult<object>.Fail(_messageProvider.Get("ValidationFailed"), StatusCodes.Status400BadRequest);
        }

        var existingUser = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (existingUser != null)
        {
            return ServiceResult<object>.Fail(_messageProvider.Get("EmailExists"), StatusCodes.Status409Conflict);
        }

        var user = new UserRecord
        {
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = normalizedRole,
            RemainingCalls = 20,
            UsageCount = 0
        };

        await _userRepository.AddAsync(user);
        return ServiceResult<object>.Created(_messageProvider.Get("AccountCreated"));
    }

    public async Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(normalizedEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<LoginResponseDto>.Fail(_messageProvider.Get("ValidationFailed"), StatusCodes.Status400BadRequest);
        }

        var user = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return ServiceResult<LoginResponseDto>.Fail(_messageProvider.Get("InvalidCredentials"), StatusCodes.Status401Unauthorized);
        }

        var response = new LoginResponseDto
        {
            Token = _jwtTokenService.CreateToken(user),
            User = ToCurrentUserDto(user)
        };

        return ServiceResult<LoginResponseDto>.Ok(response, _messageProvider.Get("LoginSuccessful"));
    }

    public async Task<ServiceResult<CurrentUserResponseDto>> GetCurrentUserAsync(ClaimsPrincipal principal)
    {
        var user = await ResolveUserAsync(principal);
        if (user == null)
        {
            return ServiceResult<CurrentUserResponseDto>.Fail(_messageProvider.Get("Unauthorized"), StatusCodes.Status401Unauthorized);
        }

        return ServiceResult<CurrentUserResponseDto>.Ok(ToCurrentUserDto(user), _messageProvider.Get("CurrentUserLoaded"));
    }

    public async Task<ServiceResult<UsageResponseDto>> GetUsageAsync(ClaimsPrincipal principal)
    {
        var user = await ResolveUserAsync(principal);
        if (user == null)
        {
            return ServiceResult<UsageResponseDto>.Fail(_messageProvider.Get("Unauthorized"), StatusCodes.Status401Unauthorized);
        }

        return ServiceResult<UsageResponseDto>.Ok(ToUsageDto(user, _messageProvider.Get("UsageLoaded")));
    }

    public async Task<ServiceResult<UsageResponseDto>> DecrementUsageAsync(ClaimsPrincipal principal)
    {
        var user = await ResolveUserAsync(principal);
        if (user == null)
        {
            return ServiceResult<UsageResponseDto>.Fail(_messageProvider.Get("Unauthorized"), StatusCodes.Status401Unauthorized);
        }

        if (user.RemainingCalls <= 0)
        {
            return ServiceResult<UsageResponseDto>.Fail(_messageProvider.Get("UsageLimitReached"), StatusCodes.Status403Forbidden);
        }

        user.RemainingCalls -= 1;
        user.UsageCount += 1;
        await _userRepository.UpdateAsync(user);

        return ServiceResult<UsageResponseDto>.Ok(ToUsageDto(user, _messageProvider.Get("UsageDecremented")));
    }

    public async Task<ServiceResult<IReadOnlyList<AdminUserRowDto>>> GetAdminUsersAsync(ClaimsPrincipal principal)
    {
        var user = await ResolveUserAsync(principal);
        if (user == null)
        {
            return ServiceResult<IReadOnlyList<AdminUserRowDto>>.Fail(_messageProvider.Get("Unauthorized"), StatusCodes.Status401Unauthorized);
        }

        if (!string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<IReadOnlyList<AdminUserRowDto>>.Fail(_messageProvider.Get("AdminRequired"), StatusCodes.Status403Forbidden);
        }

        var users = await _userRepository.GetAllAsync();
        var rows = users
            .OrderBy(record => record.Email)
            .Select(record => new AdminUserRowDto
            {
                Email = record.Email,
                Role = record.Role,
                RemainingCalls = record.RemainingCalls,
                UsageCount = record.UsageCount
            })
            .ToList();

        return ServiceResult<IReadOnlyList<AdminUserRowDto>>.Ok(rows, _messageProvider.Get("UsersLoaded"));
    }

    private async Task<UserRecord?> ResolveUserAsync(ClaimsPrincipal principal)
    {
        var email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue(JwtRegisteredClaimNames.Email);
        return string.IsNullOrWhiteSpace(email) ? null : await _userRepository.GetByEmailAsync(email);
    }

    private static CurrentUserResponseDto ToCurrentUserDto(UserRecord user) => new()
    {
        Email = user.Email,
        Role = user.Role,
        RemainingCalls = user.RemainingCalls
    };

    private static UsageResponseDto ToUsageDto(UserRecord user, string message) => new()
    {
        RemainingCalls = user.RemainingCalls,
        UsageCount = user.UsageCount,
        Message = message
    };

    private static bool IsValidRegistration(string email, string password, string role)
    {
        return !string.IsNullOrWhiteSpace(email)
            && email.Contains('@')
            && !string.IsNullOrWhiteSpace(password)
            && password.Length >= 3
            && (role == "user" || role == "admin");
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string NormalizeRole(string role)
    {
        var normalizedRole = role.Trim().ToLowerInvariant();
        return normalizedRole is "admin" ? "admin" : "user";
    }
}
