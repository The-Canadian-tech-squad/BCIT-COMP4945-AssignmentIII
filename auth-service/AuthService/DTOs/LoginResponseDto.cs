namespace AuthService.DTOs;

public sealed class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public CurrentUserResponseDto User { get; set; } = new();
}
