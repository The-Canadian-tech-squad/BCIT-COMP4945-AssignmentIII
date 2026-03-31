namespace AuthService.Services;

public sealed class TextFileProvider : ITextFileProvider
{
    private readonly string _contentRootPath;

    public TextFileProvider(string contentRootPath)
    {
        _contentRootPath = contentRootPath;
    }

    public string ReadText(string relativePath)
    {
        var fullPath = Path.Combine(_contentRootPath, relativePath);
        return File.Exists(fullPath) ? File.ReadAllText(fullPath).Trim() : string.Empty;
    }
}
