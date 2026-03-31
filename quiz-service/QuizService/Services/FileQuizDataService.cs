using Microsoft.Extensions.Options;
using QuizService.DTOs;
using QuizService.Models;
using QuizService.Options;
using System.Text.Json;

namespace QuizService.Services;

public sealed class FileQuizDataService : IQuizDataService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly string _dataFilePath;
    private readonly SemaphoreSlim _mutex = new(1, 1);

    public FileQuizDataService(IWebHostEnvironment environment, IOptions<FileStorageOptions> fileStorageOptions)
    {
        var options = fileStorageOptions.Value;
        _dataFilePath = Path.IsPathRooted(options.QuizDataFilePath)
            ? options.QuizDataFilePath
            : Path.Combine(environment.ContentRootPath, options.QuizDataFilePath);
    }

    public async Task<IReadOnlyList<QuizDto>> GetQuizzesAsync()
    {
        var data = await LoadAsync();

        return data.Quizzes
            .OrderBy(quiz => quiz.Category)
            .ThenBy(quiz => quiz.Title)
            .Select(ToQuizDto)
            .ToList();
    }

    public async Task<QuizDto?> GetQuizAsync(Guid quizId)
    {
        var data = await LoadAsync();
        var quiz = data.Quizzes.FirstOrDefault(entry => entry.Id == quizId);
        return quiz == null ? null : ToQuizDto(quiz);
    }

    public async Task<QuizDto> CreateQuizAsync(QuizDto request)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var quiz = new QuizRecord
            {
                Id = Guid.NewGuid(),
                Category = request.Category.Trim(),
                Title = request.Title.Trim(),
                Status = NormalizeStatus(request.Status),
                Description = request.Description.Trim(),
                Questions = []
            };

            data.Quizzes.Add(quiz);
            await SaveInternalAsync(data);
            return ToQuizDto(quiz);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<QuizDto?> UpdateQuizAsync(Guid quizId, QuizDto request)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var quiz = data.Quizzes.FirstOrDefault(entry => entry.Id == quizId);
            if (quiz == null)
            {
                return null;
            }

            quiz.Title = request.Title.Trim();
            quiz.Category = request.Category.Trim();
            quiz.Status = NormalizeStatus(request.Status);
            quiz.Description = request.Description.Trim();

            await SaveInternalAsync(data);
            return ToQuizDto(quiz);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<bool> DeleteQuizAsync(Guid quizId)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var removed = data.Quizzes.RemoveAll(quiz => quiz.Id == quizId) > 0;
            if (!removed)
            {
                return false;
            }

            data.Histories.RemoveAll(history => history.QuizId == quizId);
            await SaveInternalAsync(data);
            return true;
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<QuestionDto?> CreateQuestionAsync(Guid quizId, QuestionDto request)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var quiz = data.Quizzes.FirstOrDefault(entry => entry.Id == quizId);
            if (quiz == null)
            {
                return null;
            }

            var question = BuildQuestionRecord(request, null);
            quiz.Questions.Add(question);
            await SaveInternalAsync(data);
            return ToQuestionDto(question);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, QuestionDto request)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var (_, question) = FindQuestion(data, questionId);
            if (question == null)
            {
                return null;
            }

            question.Text = request.Text.Trim();
            question.MediaType = request.MediaType.Trim();
            question.MediaUrl = request.MediaUrl.Trim();
            question.MediaPrompt = request.MediaPrompt.Trim();
            question.Options = BuildOptions(request.Options);
            question.CorrectOptionIndex = NormalizeCorrectOptionIndex(request.CorrectOptionIndex, question.Options.Count);

            await SaveInternalAsync(data);
            return ToQuestionDto(question);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<bool> DeleteQuestionAsync(Guid questionId)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            foreach (var quiz in data.Quizzes)
            {
                var removed = quiz.Questions.RemoveAll(question => question.Id == questionId) > 0;
                if (!removed)
                {
                    continue;
                }

                foreach (var history in data.Histories.Where(entry => entry.QuizId == quiz.Id))
                {
                    history.Answers.RemoveAll(answer => answer.QuestionId == questionId);
                    history.TotalQuestions = quiz.Questions.Count;
                }

                await SaveInternalAsync(data);
                return true;
            }

            return false;
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<UserHistoryDto?> SaveHistoryAsync(Guid quizId, string userId, string userEmail, UserHistoryDto request)
    {
        await _mutex.WaitAsync();
        try
        {
            var data = await LoadInternalAsync();
            var quiz = data.Quizzes.FirstOrDefault(entry => entry.Id == quizId);
            if (quiz == null)
            {
                return null;
            }

            var history = new UserHistoryRecord
            {
                Id = Guid.NewGuid(),
                QuizId = quizId,
                UserId = userId,
                Email = userEmail.ToLowerInvariant(),
                Score = request.Score,
                TotalQuestions = request.TotalQuestions > 0 ? request.TotalQuestions : quiz.Questions.Count,
                CompletedAt = request.CompletedAt == default ? DateTimeOffset.UtcNow : request.CompletedAt,
                Answers = request.Answers.Select(answer => new UserHistoryAnswerRecord
                {
                    QuestionId = answer.QuestionId,
                    SelectedOptionId = answer.SelectedOptionId,
                    IsCorrect = answer.IsCorrect
                }).ToList()
            };

            data.Histories.Add(history);
            await SaveInternalAsync(data);
            return ToUserHistoryDto(history);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<IReadOnlyList<UserHistoryDto>> GetUserHistoriesAsync(string userId, string userEmail)
    {
        var data = await LoadAsync();

        return data.Histories
            .Where(entry =>
                (!string.IsNullOrWhiteSpace(userId) && string.Equals(entry.UserId, userId, StringComparison.OrdinalIgnoreCase)) ||
                string.Equals(entry.Email, userEmail, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(entry => entry.CompletedAt)
            .Select(ToUserHistoryDto)
            .ToList();
    }

    public async Task<IReadOnlyList<UserHistoryDto>> GetHistoriesAsync()
    {
        var data = await LoadAsync();

        return data.Histories
            .OrderByDescending(entry => entry.CompletedAt)
            .Select(ToUserHistoryDto)
            .ToList();
    }

    private async Task<QuizDataDocument> LoadAsync()
    {
        await _mutex.WaitAsync();
        try
        {
            return await LoadInternalAsync();
        }
        finally
        {
            _mutex.Release();
        }
    }

    private async Task<QuizDataDocument> LoadInternalAsync()
    {
        if (!File.Exists(_dataFilePath))
        {
            return new QuizDataDocument();
        }

        await using var stream = File.OpenRead(_dataFilePath);
        return await JsonSerializer.DeserializeAsync<QuizDataDocument>(stream, JsonOptions) ?? new QuizDataDocument();
    }

    private async Task SaveInternalAsync(QuizDataDocument data)
    {
        var directory = Path.GetDirectoryName(_dataFilePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(_dataFilePath);
        await JsonSerializer.SerializeAsync(stream, data, JsonOptions);
    }

    private static QuizDto ToQuizDto(QuizRecord quiz)
    {
        return new QuizDto
        {
            Id = quiz.Id,
            Category = quiz.Category,
            Title = quiz.Title,
            Status = quiz.Status,
            Description = quiz.Description,
            Questions = quiz.Questions.Select(ToQuestionDto).ToList()
        };
    }

    private static QuestionDto ToQuestionDto(QuestionRecord question)
    {
        return new QuestionDto
        {
            Id = question.Id,
            Text = question.Text,
            MediaType = question.MediaType,
            MediaUrl = question.MediaUrl,
            MediaPrompt = question.MediaPrompt,
            Options = [.. question.Options],
            CorrectOptionIndex = question.CorrectOptionIndex
        };
    }

    private static UserHistoryDto ToUserHistoryDto(UserHistoryRecord history)
    {
        return new UserHistoryDto
        {
            Id = history.Id,
            QuizId = history.QuizId,
            UserId = history.UserId,
            Email = history.Email,
            Score = history.Score,
            TotalQuestions = history.TotalQuestions,
            CompletedAt = history.CompletedAt,
            Answers = history.Answers.Select(answer => new UserHistoryAnswerDto
            {
                QuestionId = answer.QuestionId,
                SelectedOptionId = answer.SelectedOptionId,
                IsCorrect = answer.IsCorrect
            }).ToList()
        };
    }

    private static QuestionRecord BuildQuestionRecord(QuestionDto request, Guid? questionId)
    {
        var options = BuildOptions(request.Options);

        return new QuestionRecord
        {
            Id = questionId ?? Guid.NewGuid(),
            Text = request.Text.Trim(),
            MediaType = request.MediaType.Trim(),
            MediaUrl = request.MediaUrl.Trim(),
            MediaPrompt = request.MediaPrompt.Trim(),
            Options = options,
            CorrectOptionIndex = NormalizeCorrectOptionIndex(request.CorrectOptionIndex, options.Count)
        };
    }

    private static List<string> BuildOptions(IEnumerable<string> options)
    {
        return options
            .Select(option => option.Trim())
            .ToList();
    }

    private static int NormalizeCorrectOptionIndex(int index, int optionCount)
    {
        if (optionCount <= 0)
        {
            return 0;
        }

        return Math.Clamp(index, 0, optionCount - 1);
    }

    private static string NormalizeStatus(string status)
    {
        return string.Equals(status, "Published", StringComparison.OrdinalIgnoreCase)
            ? "Published"
            : "Draft";
    }

    private static (QuizRecord? Quiz, QuestionRecord? Question) FindQuestion(QuizDataDocument data, Guid questionId)
    {
        foreach (var quiz in data.Quizzes)
        {
            var question = quiz.Questions.FirstOrDefault(entry => entry.Id == questionId);
            if (question != null)
            {
                return (quiz, question);
            }
        }

        return (null, null);
    }
}
