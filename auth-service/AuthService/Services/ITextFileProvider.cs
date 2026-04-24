namespace AuthService.Services;

public interface ITextFileProvider
{
    string ReadText(string relativePath);
}
