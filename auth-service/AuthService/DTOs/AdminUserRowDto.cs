namespace AuthService.DTOs;

public sealed class AdminUserRowDto
{
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int RemainingCalls { get; set; }
    public int UsageCount { get; set; }
}
