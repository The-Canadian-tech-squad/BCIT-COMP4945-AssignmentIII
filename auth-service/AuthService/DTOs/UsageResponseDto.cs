namespace AuthService.DTOs;

public sealed class UsageResponseDto
{
    public int RemainingCalls { get; set; }
    public int UsageCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
