namespace AuthService.Options;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string UsersFilePath { get; set; } = "Data/users.json";
}
