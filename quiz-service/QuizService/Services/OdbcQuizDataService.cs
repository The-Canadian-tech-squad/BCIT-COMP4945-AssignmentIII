using Microsoft.Extensions.Options;
using QuizService.DTOs;
using QuizService.Options;
using System.Data.Common;
using System.Data.Odbc;
using System.Text.Json;

namespace QuizService.Services;

public sealed class OdbcQuizDataService : IQuizDataService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _connectionString;
    private readonly string _categoriesTable;
    private readonly string _questionsTable;
    private readonly string _individualAnswersTable;
    private readonly string _moderatedAnswersTable;
    private readonly string _usersTable;
    private readonly string _rolesTable;

    public OdbcQuizDataService(IOptions<OracleOdbcOptions> options)
    {
        var value = options.Value;
        _connectionString = value.ConnectionString;
        _categoriesTable = ResolveTableName(value.CategoriesTableName, "CATEGORIES");
        _questionsTable = ResolveTableName(value.QuestionsTableName, "QUESTIONS");
        _individualAnswersTable = ResolveTableName(value.IndividualAnswersTableName, "INDIVIDUAL_ANSWERS");
        _moderatedAnswersTable = ResolveTableName(value.ModeratedAnswersTableName, "MODERATED_ANSWERS");
        _usersTable = ResolveTableName(value.UsersTableName, "USERS");
        _rolesTable = ResolveTableName(value.RolesTableName, "ROLES");
    }

    public async Task<string> CreateCategoryAsync(string categoryName)
    {
        var normalized = categoryName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Category name is required.", nameof(categoryName));
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        using (var exists = connection.CreateCommand())
        {
            exists.CommandText = $"""
                SELECT NAME
                FROM {_categoriesTable}
                WHERE LOWER(NAME) = LOWER(?)
                FETCH FIRST 1 ROWS ONLY
                """;
            exists.Parameters.Add(new OdbcParameter { Value = normalized });

            var value = await exists.ExecuteScalarAsync();
            if (value != null && value != DBNull.Value)
            {
                throw new DuplicateCategoryException($"Category name \"{normalized}\" already exists.");
            }
        }

        using (var command = connection.CreateCommand())
        {
            command.CommandText = $"""
                INSERT INTO {_categoriesTable} (NAME, DISPLAY_ORDER)
                VALUES (?, ?)
                """;
            command.Parameters.Add(new OdbcParameter { Value = normalized });
            command.Parameters.Add(new OdbcParameter { Value = 0 });
            await command.ExecuteNonQueryAsync();
        }

        return normalized;
    }

    public async Task<IReadOnlyList<QuizDto>> GetQuizzesAsync()
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        var categories = await LoadCategoriesAsync(connection, null);
        var questions = await LoadQuestionsAsync(connection, null);
        var questionsByCategory = questions
            .GroupBy(question => question.CategoryId)
            .ToDictionary(group => group.Key, group => group.OrderBy(entry => entry.QuestionId).ToList());

        return categories
            .OrderBy(category => category.Name)
            .Select(category => ToQuizDto(category, questionsByCategory))
            .ToList();
    }

    public async Task<QuizDto?> GetQuizAsync(Guid quizId)
    {
        if (!TryGuidToNumber(quizId, out var categoryId))
        {
            return null;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        var category = (await LoadCategoriesAsync(connection, categoryId)).FirstOrDefault();
        if (category == null)
        {
            return null;
        }

        var questions = await LoadQuestionsAsync(connection, categoryId);
        var byCategory = new Dictionary<long, List<QuestionRow>> { [category.CategoryId] = questions };

        return ToQuizDto(category, byCategory);
    }

    public async Task<QuizDto> CreateQuizAsync(QuizDto quiz)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        var title = quiz.Title.Trim();
        var description = quiz.Description.Trim();
        long categoryId;

        using (var existing = connection.CreateCommand())
        {
            existing.CommandText = $"""
                SELECT CATEGORY_ID
                FROM {_categoriesTable}
                WHERE LOWER(NAME) = LOWER({ToSqlStringLiteral(title)})
                ORDER BY CATEGORY_ID DESC
                FETCH FIRST 1 ROWS ONLY
                """;

            var existingId = await existing.ExecuteScalarAsync();
            if (existingId != null && existingId != DBNull.Value)
            {
                categoryId = Convert.ToInt64(existingId);
                var existingQuestions = await LoadQuestionsAsync(connection, categoryId);
                var byCategory = new Dictionary<long, List<QuestionRow>> { [categoryId] = existingQuestions };

                var existingCategory = new CategoryRow
                {
                    CategoryId = categoryId,
                    Name = title
                };

                return ToQuizDto(existingCategory, byCategory);
            }
        }

        using (var command = connection.CreateCommand())
        {
            command.CommandText = $"""
                INSERT INTO {_categoriesTable} (NAME, DESCRIPTION, DISPLAY_ORDER)
                VALUES (?, ?, ?)
                """;
            command.Parameters.Add(new OdbcParameter { Value = title });
            command.Parameters.Add(new OdbcParameter { Value = description });
            command.Parameters.Add(new OdbcParameter { Value = 0 });
            await command.ExecuteNonQueryAsync();
        }

        using (var query = connection.CreateCommand())
        {
            query.CommandText = $"""
                SELECT CATEGORY_ID
                FROM {_categoriesTable}
                WHERE NAME = ?
                ORDER BY CATEGORY_ID DESC
                FETCH FIRST 1 ROWS ONLY
                """;
            query.Parameters.Add(new OdbcParameter { Value = title });

            var result = await query.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value)
            {
                throw new InvalidOperationException("Quiz category was inserted but CATEGORY_ID could not be resolved.");
            }

            categoryId = Convert.ToInt64(result);
        }

        return new QuizDto
        {
            Id = NumberToGuid(categoryId),
            Category = title,
            Title = title,
            Status = NormalizeStatus(quiz.Status),
            Description = description,
            Questions = []
        };
    }

    public async Task<QuizDto?> UpdateQuizAsync(Guid quizId, QuizDto quiz)
    {
        if (!TryGuidToNumber(quizId, out var categoryId))
        {
            return null;
        }

        var normalizedName = (quiz.Category ?? quiz.Title)?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return null;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        using (var duplicateCheck = connection.CreateCommand())
        {
            duplicateCheck.CommandText = $"""
                SELECT 1
                FROM {_categoriesTable}
                WHERE LOWER(NAME) = LOWER({ToSqlStringLiteral(normalizedName)})
                  AND CATEGORY_ID <> {categoryId}
                FETCH FIRST 1 ROWS ONLY
                """;

            var duplicate = await duplicateCheck.ExecuteScalarAsync();
            if (duplicate != null && duplicate != DBNull.Value)
            {
                throw new DuplicateCategoryException($"Category name \"{normalizedName}\" already exists.");
            }
        }

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE {_categoriesTable}
            SET NAME = {ToSqlStringLiteral(normalizedName)}, UPDATED_AT = CURRENT_TIMESTAMP
            WHERE CATEGORY_ID = {categoryId}
            """;

        var affected = await command.ExecuteNonQueryAsync();
        if (affected <= 0)
        {
            return null;
        }

        return await GetQuizAsync(quizId);
    }

    public async Task<bool> DeleteQuizAsync(Guid quizId)
    {
        if (!TryGuidToNumber(quizId, out var categoryId))
        {
            return false;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var deleteAnswers = connection.CreateCommand())
        {
            deleteAnswers.Transaction = transaction;
            deleteAnswers.CommandText = $"""
            DELETE FROM {_individualAnswersTable}
            WHERE QUESTION_ID IN (SELECT QUESTION_ID FROM {_questionsTable} WHERE CATEGORY_ID = {categoryId})
            """;
            await deleteAnswers.ExecuteNonQueryAsync();
        }

        using (var deleteModeratedAnswers = connection.CreateCommand())
        {
            deleteModeratedAnswers.Transaction = transaction;
            deleteModeratedAnswers.CommandText = $"""
            DELETE FROM {_moderatedAnswersTable}
            WHERE QUESTION_ID IN (SELECT QUESTION_ID FROM {_questionsTable} WHERE CATEGORY_ID = {categoryId})
            """;
            await deleteModeratedAnswers.ExecuteNonQueryAsync();
        }

        using (var deleteQuestions = connection.CreateCommand())
        {
            deleteQuestions.Transaction = transaction;
            deleteQuestions.CommandText = $"""
            DELETE FROM {_questionsTable}
            WHERE CATEGORY_ID = {categoryId}
            """;
            await deleteQuestions.ExecuteNonQueryAsync();
        }

        int deleted;
        using (var deleteCategory = connection.CreateCommand())
        {
            deleteCategory.Transaction = transaction;
            deleteCategory.CommandText = $"""
            DELETE FROM {_categoriesTable}
            WHERE CATEGORY_ID = {categoryId}
            """;
            deleted = await deleteCategory.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return deleted > 0;
    }

    public async Task<QuestionDto?> CreateQuestionAsync(Guid quizId, QuestionDto question, string userId, string userEmail)
    {
        if (!TryGuidToNumber(quizId, out var categoryId))
        {
            return null;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        using (var categoryCheck = connection.CreateCommand())
        {
            categoryCheck.CommandText = $"SELECT 1 FROM {_categoriesTable} WHERE CATEGORY_ID = {categoryId}";
            var categoryExists = await categoryCheck.ExecuteScalarAsync();
            if (categoryExists == null || categoryExists == DBNull.Value)
            {
                return null;
            }
        }

        var options = BuildOptions(question.Options);
        var correctIndex = NormalizeCorrectOptionIndex(question.CorrectOptionIndex, options.Count);
        var uploaderId = await ResolveUploaderUserIdAsync(connection, userId, userEmail);
        var points = Math.Max(question.Points, 1);

        var mediaMeta = JsonSerializer.Serialize(new MediaMeta
        {
            MediaType = question.MediaType.Trim(),
            MediaUrl = question.MediaUrl.Trim(),
            MediaPrompt = question.MediaPrompt.Trim()
        }, JsonOptions);

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO {_questionsTable}
                (CATEGORY_ID, XML_QUESTION, YOUTUBE_URL, QUESTION_TEXT, ANSWERS_OPTION, ANSWERS_KEY, POINTS, UPLOADED_BY, CREATED_AT, UPDATED_AT)
            VALUES
                ({categoryId},
                 TO_CLOB({ToSqlStringLiteral(mediaMeta)}),
                 {ToSqlNullableStringLiteral(question.MediaUrl.Trim())},
                 TO_CLOB({ToSqlStringLiteral(question.Text.Trim())}),
                 TO_CLOB({ToSqlStringLiteral(JsonSerializer.Serialize(options, JsonOptions))}),
                 {ToSqlStringLiteral(IndexToAnswerKey(correctIndex))},
                 {points},
                 {uploaderId},
                 CURRENT_TIMESTAMP,
                 CURRENT_TIMESTAMP)
            """;

        await command.ExecuteNonQueryAsync();

        long questionId;
        using (var query = connection.CreateCommand())
        {
            query.CommandText = $"""
                SELECT QUESTION_ID
                FROM {_questionsTable}
                WHERE CATEGORY_ID = {categoryId}
                  AND UPLOADED_BY = {uploaderId}
                ORDER BY QUESTION_ID DESC
                FETCH FIRST 1 ROWS ONLY
                """;
            var result = await query.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value)
            {
                throw new InvalidOperationException("Question inserted but QUESTION_ID could not be resolved.");
            }

            questionId = Convert.ToInt64(result);
        }

        return new QuestionDto
        {
            Id = NumberToGuid(questionId),
            Text = question.Text.Trim(),
            MediaType = question.MediaType.Trim(),
            MediaUrl = question.MediaUrl.Trim(),
            MediaPrompt = question.MediaPrompt.Trim(),
            Options = options,
            CorrectOptionIndex = correctIndex,
            Points = points
        };
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(Guid questionId, QuestionDto question)
    {
        if (!TryGuidToNumber(questionId, out var numericQuestionId))
        {
            return null;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        using (var questionCheck = connection.CreateCommand())
        {
            questionCheck.CommandText = $"SELECT 1 FROM {_questionsTable} WHERE QUESTION_ID = {numericQuestionId}";
            var exists = await questionCheck.ExecuteScalarAsync();
            if (exists == null || exists == DBNull.Value)
            {
                return null;
            }
        }

        var options = BuildOptions(question.Options);
        var correctIndex = NormalizeCorrectOptionIndex(question.CorrectOptionIndex, options.Count);
        var points = Math.Max(question.Points, 1);

        var mediaMeta = JsonSerializer.Serialize(new MediaMeta
        {
            MediaType = question.MediaType.Trim(),
            MediaUrl = question.MediaUrl.Trim(),
            MediaPrompt = question.MediaPrompt.Trim()
        }, JsonOptions);

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE {_questionsTable}
            SET XML_QUESTION = TO_CLOB({ToSqlStringLiteral(mediaMeta)}),
                YOUTUBE_URL = {ToSqlNullableStringLiteral(question.MediaUrl.Trim())},
                QUESTION_TEXT = TO_CLOB({ToSqlStringLiteral(question.Text.Trim())}),
                ANSWERS_OPTION = TO_CLOB({ToSqlStringLiteral(JsonSerializer.Serialize(options, JsonOptions))}),
                ANSWERS_KEY = {ToSqlStringLiteral(IndexToAnswerKey(correctIndex))},
                POINTS = {points},
                UPDATED_AT = CURRENT_TIMESTAMP
            WHERE QUESTION_ID = {numericQuestionId}
            """;

        await command.ExecuteNonQueryAsync();

        return new QuestionDto
        {
            Id = questionId,
            Text = question.Text.Trim(),
            MediaType = question.MediaType.Trim(),
            MediaUrl = question.MediaUrl.Trim(),
            MediaPrompt = question.MediaPrompt.Trim(),
            Options = options,
            CorrectOptionIndex = correctIndex,
            Points = points
        };
    }

    public async Task<bool> DeleteQuestionAsync(Guid questionId)
    {
        if (!TryGuidToNumber(questionId, out var numericQuestionId))
        {
            return false;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var deleteAnswers = connection.CreateCommand())
        {
            deleteAnswers.Transaction = transaction;
            deleteAnswers.CommandText = $"""
            DELETE FROM {_individualAnswersTable}
            WHERE QUESTION_ID = {numericQuestionId}
            """;
            await deleteAnswers.ExecuteNonQueryAsync();
        }

        int removed;
        using (var deleteQuestion = connection.CreateCommand())
        {
            deleteQuestion.Transaction = transaction;
            deleteQuestion.CommandText = $"""
            DELETE FROM {_questionsTable}
            WHERE QUESTION_ID = {numericQuestionId}
            """;
            removed = await deleteQuestion.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return removed > 0;
    }

    public async Task<UserHistoryDto?> SaveHistoryAsync(Guid quizId, string userId, string userEmail, UserHistoryDto history)
    {
        if (!TryGuidToNumber(quizId, out var categoryId))
        {
            return null;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        var dbUserId = await ResolveUserIdAsync(connection, userId, userEmail);
        if (dbUserId <= 0)
        {
            return null;
        }

        var timestamp = history.CompletedAt == default ? DateTimeOffset.UtcNow : history.CompletedAt;
        var answers = history.Answers ?? [];

        foreach (var answer in answers)
        {
            if (!TryGuidToNumber(answer.QuestionId, out var numericQuestionId))
            {
                continue;
            }

            var key = NormalizeAnswerKey(answer.SelectedOptionId);
            var correctInfo = await GetQuestionCorrectInfoAsync(connection, numericQuestionId);
            if (correctInfo == null || correctInfo.Value.CategoryId != categoryId)
            {
                continue;
            }

            var isCorrect = string.Equals(correctInfo.Value.AnswersKey, key, StringComparison.OrdinalIgnoreCase);
            var score = isCorrect ? Math.Max(correctInfo.Value.Points, 1) : 0;

            using var command = connection.CreateCommand();
            command.CommandText = $"""
                INSERT INTO {_individualAnswersTable}
                    (QUESTION_ID, USER_ID, SELECTED_ANSWER, IS_CORRECT, SCORE, CREATED_AT)
                VALUES
                    (?, ?, ?, ?, ?, ?)
                """;
            command.Parameters.Add(new OdbcParameter { Value = numericQuestionId });
            command.Parameters.Add(new OdbcParameter { Value = dbUserId });
            command.Parameters.Add(new OdbcParameter { Value = key });
            command.Parameters.Add(new OdbcParameter { Value = isCorrect ? 1 : 0 });
            command.Parameters.Add(new OdbcParameter { Value = score });
            command.Parameters.Add(new OdbcParameter { Value = timestamp.UtcDateTime });

            await command.ExecuteNonQueryAsync();
        }

        return new UserHistoryDto
        {
            Id = Guid.NewGuid(),
            QuizId = quizId,
            UserId = dbUserId.ToString(),
            Email = userEmail.ToLowerInvariant(),
            Score = history.Score,
            TotalQuestions = history.TotalQuestions,
            CompletedAt = timestamp,
            Answers = answers
        };
    }

    public async Task<IReadOnlyList<UserHistoryDto>> GetUserHistoriesAsync(string userId, string userEmail)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        var dbUserId = await ResolveUserIdAsync(connection, userId, userEmail);
        if (dbUserId <= 0)
        {
            return [];
        }

        return await LoadHistoriesAsync(connection, dbUserId);
    }

    public async Task<IReadOnlyList<UserHistoryDto>> GetHistoriesAsync()
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        var userIds = new List<long>();
        using (var command = connection.CreateCommand())
        {
            command.CommandText = $"SELECT DISTINCT USER_ID FROM {_individualAnswersTable}";
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                userIds.Add(ReadLong(reader, "USER_ID"));
            }
        }

        var all = new List<UserHistoryDto>();
        foreach (var id in userIds.Distinct())
        {
            all.AddRange(await LoadHistoriesAsync(connection, id));
        }

        return all
            .OrderByDescending(history => history.CompletedAt)
            .ToList();
    }

    private async Task<IReadOnlyList<UserHistoryDto>> LoadHistoriesAsync(OdbcConnection connection, long dbUserId)
    {
        var rows = new List<HistoryRow>();

        using (var command = connection.CreateCommand())
        {
            command.CommandText = $"""
                SELECT ia.ANSWER_ID,
                       ia.QUESTION_ID,
                       ia.USER_ID,
                       ia.SELECTED_ANSWER,
                       ia.IS_CORRECT,
                       ia.SCORE,
                       ia.CREATED_AT,
                       q.CATEGORY_ID,
                       u.EMAIL
                FROM {_individualAnswersTable} ia
                JOIN {_questionsTable} q ON q.QUESTION_ID = ia.QUESTION_ID
                JOIN {_usersTable} u ON u.USER_ID = ia.USER_ID
                WHERE ia.USER_ID = ?
                ORDER BY ia.CREATED_AT DESC, ia.ANSWER_ID DESC
                """;
            command.Parameters.Add(new OdbcParameter { Value = dbUserId });

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                rows.Add(new HistoryRow
                {
                    AnswerId = ReadLong(reader, "ANSWER_ID"),
                    QuestionId = ReadLong(reader, "QUESTION_ID"),
                    UserId = ReadLong(reader, "USER_ID"),
                    SelectedAnswer = ReadString(reader, "SELECTED_ANSWER"),
                    IsCorrect = ReadInt(reader, "IS_CORRECT") == 1,
                    Score = ReadInt(reader, "SCORE"),
                    CreatedAt = ReadDateTimeOffset(reader, "CREATED_AT"),
                    CategoryId = ReadLong(reader, "CATEGORY_ID"),
                    Email = ReadString(reader, "EMAIL")
                });
            }
        }

        var grouped = rows
            .GroupBy(row => new { row.CategoryId, row.CreatedAt })
            .OrderByDescending(group => group.Key.CreatedAt)
            .ToList();

        var histories = new List<UserHistoryDto>();
        foreach (var group in grouped)
        {
            var answers = group
                .OrderBy(entry => entry.AnswerId)
                .Select(entry => new UserHistoryAnswerDto
                {
                    QuestionId = NumberToGuid(entry.QuestionId),
                    SelectedOptionId = entry.SelectedAnswer.ToLowerInvariant(),
                    IsCorrect = entry.IsCorrect
                })
                .ToList();

            histories.Add(new UserHistoryDto
            {
                Id = NumberToGuid(group.Min(entry => entry.AnswerId)),
                QuizId = NumberToGuid(group.Key.CategoryId),
                UserId = group.First().UserId.ToString(),
                Email = group.First().Email,
                Score = group.Sum(entry => entry.Score),
                TotalQuestions = group.Count(),
                CompletedAt = group.Key.CreatedAt,
                Answers = answers
            });
        }

        return histories;
    }

    private async Task<List<CategoryRow>> LoadCategoriesAsync(OdbcConnection connection, long? categoryId)
    {
        var rows = new List<CategoryRow>();
        using var command = connection.CreateCommand();

        if (categoryId.HasValue)
        {
            command.CommandText = $"""
                SELECT CATEGORY_ID, NAME
                FROM {_categoriesTable}
                WHERE CATEGORY_ID = {categoryId.Value}
                """;
        }
        else
        {
            command.CommandText = $"""
                SELECT CATEGORY_ID, NAME
                FROM {_categoriesTable}
                """;
        }

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new CategoryRow
            {
                CategoryId = ReadLong(reader, "CATEGORY_ID"),
                Name = ReadString(reader, "NAME")
            });
        }

        return rows;
    }

    private async Task<List<QuestionRow>> LoadQuestionsAsync(OdbcConnection connection, long? categoryId)
    {
        var rows = new List<QuestionRow>();
        using var command = connection.CreateCommand();

        if (categoryId.HasValue)
        {
            command.CommandText = $"""
                SELECT QUESTION_ID, CATEGORY_ID, XML_QUESTION, YOUTUBE_URL, QUESTION_TEXT, ANSWERS_OPTION, ANSWERS_KEY, POINTS
                FROM {_questionsTable}
                WHERE CATEGORY_ID = {categoryId.Value}
                ORDER BY QUESTION_ID
                """;
        }
        else
        {
            command.CommandText = $"""
                SELECT QUESTION_ID, CATEGORY_ID, XML_QUESTION, YOUTUBE_URL, QUESTION_TEXT, ANSWERS_OPTION, ANSWERS_KEY, POINTS
                FROM {_questionsTable}
                ORDER BY QUESTION_ID
                """;
        }

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new QuestionRow
            {
                QuestionId = ReadLong(reader, "QUESTION_ID"),
                CategoryId = ReadLong(reader, "CATEGORY_ID"),
                XmlQuestion = ReadString(reader, "XML_QUESTION"),
                YoutubeUrl = ReadString(reader, "YOUTUBE_URL"),
                QuestionText = ReadString(reader, "QUESTION_TEXT"),
                AnswersOption = ReadString(reader, "ANSWERS_OPTION"),
                AnswersKey = ReadString(reader, "ANSWERS_KEY"),
                Points = ReadInt(reader, "POINTS")
            });
        }

        return rows;
    }

    private async Task<(long CategoryId, string AnswersKey, int Points)?> GetQuestionCorrectInfoAsync(OdbcConnection connection, long questionId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT CATEGORY_ID, ANSWERS_KEY, POINTS
            FROM {_questionsTable}
            WHERE QUESTION_ID = ?
            """;
        command.Parameters.Add(new OdbcParameter { Value = questionId });

        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return (
            ReadLong(reader, "CATEGORY_ID"),
            ReadString(reader, "ANSWERS_KEY"),
            ReadInt(reader, "POINTS")
        );
    }

    private async Task<long> ResolveUploaderUserIdAsync(OdbcConnection connection, string userId, string userEmail)
    {
        var currentUserId = await ResolveUserIdAsync(connection, userId, userEmail);
        if (currentUserId > 0)
        {
            return currentUserId;
        }

        using var adminCommand = connection.CreateCommand();
        adminCommand.CommandText = $"""
            SELECT u.USER_ID
            FROM {_usersTable} u
            JOIN {_rolesTable} r ON r.ROLE_ID = u.ROLE_ID
            WHERE LOWER(r.ROLE_NAME) = 'admin'
            ORDER BY u.USER_ID
            FETCH FIRST 1 ROWS ONLY
            """;
        var adminId = await adminCommand.ExecuteScalarAsync();
        if (adminId != null && adminId != DBNull.Value)
        {
            return Convert.ToInt64(adminId);
        }

        using var fallback = connection.CreateCommand();
        fallback.CommandText = $"SELECT USER_ID FROM {_usersTable} ORDER BY USER_ID FETCH FIRST 1 ROWS ONLY";
        var firstUser = await fallback.ExecuteScalarAsync();
        if (firstUser == null || firstUser == DBNull.Value)
        {
            throw new InvalidOperationException("No users available for questions.UPLOADED_BY.");
        }

        return Convert.ToInt64(firstUser);
    }

    private async Task<long> ResolveUserIdAsync(OdbcConnection connection, string userId, string userEmail)
    {
        if (long.TryParse(userId, out var parsed) && parsed > 0)
        {
            return parsed;
        }

        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT USER_ID FROM {_usersTable} WHERE LOWER(EMAIL) = LOWER(?)";
        command.Parameters.Add(new OdbcParameter { Value = userEmail });

        var value = await command.ExecuteScalarAsync();
        if (value == null || value == DBNull.Value)
        {
            return 0;
        }

        return Convert.ToInt64(value);
    }

    private async Task<long> GetNextIdAsync(OdbcConnection connection, string tableName, string idColumn)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT NVL(MAX({idColumn}), 0) + 1 FROM {tableName}";
        var value = await command.ExecuteScalarAsync();
        return Convert.ToInt64(value);
    }

    private static QuizDto ToQuizDto(CategoryRow category, Dictionary<long, List<QuestionRow>> questionsByCategory)
    {
        var questions = questionsByCategory.TryGetValue(category.CategoryId, out var rows)
            ? rows
            : [];

        return new QuizDto
        {
            Id = NumberToGuid(category.CategoryId),
            Category = category.Name,
            Title = category.Name,
            Status = "Published",
            Description = category.Description,
            Questions = questions.Select(ToQuestionDto).ToList()
        };
    }

    private static QuestionDto ToQuestionDto(QuestionRow row)
    {
        var media = ParseMediaMeta(row.XmlQuestion);
        var options = ParseOptions(row.AnswersOption);

        return new QuestionDto
        {
            Id = NumberToGuid(row.QuestionId),
            Text = row.QuestionText,
            MediaType = media.MediaType,
            MediaUrl = string.IsNullOrWhiteSpace(media.MediaUrl) ? row.YoutubeUrl : media.MediaUrl,
            MediaPrompt = media.MediaPrompt,
            Options = options,
            CorrectOptionIndex = AnswerKeyToIndex(row.AnswersKey),
            Points = Math.Max(row.Points, 1)
        };
    }

    private static MediaMeta ParseMediaMeta(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new MediaMeta();
        }

        try
        {
            return JsonSerializer.Deserialize<MediaMeta>(raw, JsonOptions) ?? new MediaMeta();
        }
        catch
        {
            return new MediaMeta();
        }
    }

    private static List<string> ParseOptions(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        try
        {
            var direct = JsonSerializer.Deserialize<List<string>>(raw, JsonOptions);
            if (direct != null)
            {
                return direct;
            }

            var keyed = JsonSerializer.Deserialize<List<AnswerOption>>(raw, JsonOptions);
            if (keyed != null)
            {
                return keyed.Select(option => option.Text).ToList();
            }
        }
        catch
        {
            // ignore and fall through
        }

        return [];
    }

    private static List<string> BuildOptions(IEnumerable<string> options)
    {
        return (options ?? [])
            .Select(option => option?.Trim() ?? string.Empty)
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

    private static string NormalizeAnswerKey(string selectedOptionId)
    {
        if (string.IsNullOrWhiteSpace(selectedOptionId))
        {
            return "A";
        }

        var key = selectedOptionId.Trim().ToUpperInvariant();
        var c = key[0];
        return c is 'A' or 'B' or 'C' or 'D' ? c.ToString() : "A";
    }

    private static string IndexToAnswerKey(int index)
    {
        return index switch
        {
            0 => "A",
            1 => "B",
            2 => "C",
            3 => "D",
            _ => "A"
        };
    }

    private static int AnswerKeyToIndex(string key)
    {
        return key.Trim().ToUpperInvariant() switch
        {
            "A" => 0,
            "B" => 1,
            "C" => 2,
            "D" => 3,
            _ => 0
        };
    }

    private OdbcConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Oracle ODBC connection string is not configured for quiz-service.");
        }

        return new OdbcConnection(_connectionString);
    }

    private static string ResolveTableName(string configured, string fallback)
    {
        return string.IsNullOrWhiteSpace(configured) ? fallback : configured.Trim();
    }

    private static string ToSqlStringLiteral(string value)
    {
        var normalized = value ?? string.Empty;
        return $"'{normalized.Replace("'", "''")}'";
    }

    private static string ToSqlNullableStringLiteral(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? "NULL" : ToSqlStringLiteral(value);
    }

    private static string ReadString(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? string.Empty : Convert.ToString(value)?.Trim() ?? string.Empty;
    }

    private static int ReadInt(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? 0 : Convert.ToInt32(value);
    }

    private static long ReadLong(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? 0L : Convert.ToInt64(value);
    }

    private static DateTimeOffset ReadDateTimeOffset(DbDataReader reader, string column)
    {
        var value = reader[column];
        if (value == DBNull.Value)
        {
            return DateTimeOffset.UtcNow;
        }

        return value switch
        {
            DateTimeOffset dto => dto,
            DateTime dt => new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)),
            _ => DateTimeOffset.Parse(Convert.ToString(value) ?? string.Empty)
        };
    }

    private static Guid NumberToGuid(long value)
    {
        var bytes = new byte[16];
        var longBytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(longBytes);
        }

        Array.Copy(longBytes, 0, bytes, 8, 8);
        return new Guid(bytes);
    }

    private static bool TryGuidToNumber(Guid guid, out long value)
    {
        var bytes = guid.ToByteArray();
        var longBytes = new byte[8];
        Array.Copy(bytes, 8, longBytes, 0, 8);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(longBytes);
        }

        value = BitConverter.ToInt64(longBytes, 0);
        return value > 0;
    }

    private sealed class CategoryRow
    {
        public long CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    private sealed class QuestionRow
    {
        public long QuestionId { get; set; }
        public long CategoryId { get; set; }
        public string XmlQuestion { get; set; } = string.Empty;
        public string YoutubeUrl { get; set; } = string.Empty;
        public string QuestionText { get; set; } = string.Empty;
        public string AnswersOption { get; set; } = string.Empty;
        public string AnswersKey { get; set; } = "A";
        public int Points { get; set; } = 1;
    }

    private sealed class HistoryRow
    {
        public long AnswerId { get; set; }
        public long QuestionId { get; set; }
        public long UserId { get; set; }
        public string SelectedAnswer { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
        public int Score { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public long CategoryId { get; set; }
        public string Email { get; set; } = string.Empty;
    }

    private sealed class MediaMeta
    {
        public string MediaType { get; set; } = "Image";
        public string MediaUrl { get; set; } = string.Empty;
        public string MediaPrompt { get; set; } = string.Empty;
    }

    private sealed class AnswerOption
    {
        public string Key { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }
}
