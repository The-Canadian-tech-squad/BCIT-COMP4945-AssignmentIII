namespace QuizService.Options;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string QuizDataFilePath { get; set; } = "Data/quiz-data.json";
}
