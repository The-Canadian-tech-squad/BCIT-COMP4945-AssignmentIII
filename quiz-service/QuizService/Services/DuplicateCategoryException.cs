namespace QuizService.Services;

public sealed class DuplicateCategoryException : Exception
{
    public DuplicateCategoryException(string message) : base(message)
    {
    }
}

