namespace AuthService.Common;

public sealed class ServiceResult<T>
{
    public bool Success { get; private set; }
    public int StatusCode { get; private set; }
    public string Message { get; private set; } = string.Empty;
    public T? Data { get; private set; }

    public static ServiceResult<T> Ok(T data, string message = "") =>
        new() { Success = true, StatusCode = StatusCodes.Status200OK, Data = data, Message = message };

    public static ServiceResult<T> Created(string message) =>
        new() { Success = true, StatusCode = StatusCodes.Status201Created, Message = message };

    public static ServiceResult<T> Fail(string message, int statusCode) =>
        new() { Success = false, StatusCode = statusCode, Message = message };
}
