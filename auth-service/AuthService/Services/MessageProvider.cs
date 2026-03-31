namespace AuthService.Services;

public sealed class MessageProvider : IMessageProvider
{
    private readonly ITextFileProvider _textFileProvider;
    private readonly Dictionary<string, string> _messageFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AccountCreated"] = "Resources/Messages/account-created.txt",
        ["AdminRequired"] = "Resources/Messages/admin-required.txt",
        ["CurrentUserLoaded"] = "Resources/Messages/current-user-loaded.txt",
        ["EmailExists"] = "Resources/Messages/email-exists.txt",
        ["InvalidCredentials"] = "Resources/Messages/invalid-credentials.txt",
        ["LoginSuccessful"] = "Resources/Messages/login-successful.txt",
        ["Unauthorized"] = "Resources/Messages/unauthorized.txt",
        ["UsageDecremented"] = "Resources/Messages/usage-decremented.txt",
        ["UsageLoaded"] = "Resources/Messages/usage-loaded.txt",
        ["UsageLimitReached"] = "Resources/Messages/usage-limit-reached.txt",
        ["UsersLoaded"] = "Resources/Messages/users-loaded.txt",
        ["ValidationFailed"] = "Resources/Messages/validation-failed.txt"
    };
    private readonly Dictionary<string, string> _fallbackMessages = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AccountCreated"] = "Account created successfully.",
        ["AdminRequired"] = "Admin access is required.",
        ["CurrentUserLoaded"] = "Current user loaded successfully.",
        ["EmailExists"] = "An account with this email already exists.",
        ["InvalidCredentials"] = "Invalid email or password.",
        ["LoginSuccessful"] = "Login successful.",
        ["Unauthorized"] = "Unauthorized.",
        ["UsageDecremented"] = "Usage decremented successfully.",
        ["UsageLoaded"] = "Usage loaded successfully.",
        ["UsageLimitReached"] = "Usage limit reached.",
        ["UsersLoaded"] = "Users loaded successfully.",
        ["ValidationFailed"] = "Validation failed."
    };

    public MessageProvider(ITextFileProvider textFileProvider)
    {
        _textFileProvider = textFileProvider;
    }

    public string Get(string key)
    {
        if (_messageFiles.TryGetValue(key, out var path))
        {
            var message = _textFileProvider.ReadText(path);
            if (!string.IsNullOrWhiteSpace(message))
            {
                return message;
            }
        }

        return _fallbackMessages.TryGetValue(key, out var fallbackMessage)
            ? fallbackMessage
            : string.Empty;
    }
}
