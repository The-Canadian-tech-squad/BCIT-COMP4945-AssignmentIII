using Microsoft.Extensions.Options;
using QuizService.Options;
using System.Collections.Concurrent;
using System.Data.Odbc;

namespace QuizService.Services;

public sealed class OdbcModeratedQuizPersistenceService : IModeratedQuizPersistenceService
{
    private readonly string _connectionString;
    private readonly string _usersTable;
    private readonly string _rolesTable;
    private readonly string _questionsTable;
    private readonly string _sessionsTable;
    private readonly string _moderatedAnswersTable;
    private readonly ConcurrentDictionary<string, long> _sessionIds = new(StringComparer.OrdinalIgnoreCase);

    public OdbcModeratedQuizPersistenceService(IOptions<OracleOdbcOptions> options)
    {
        var value = options.Value;
        _connectionString = value.ConnectionString;
        _usersTable = ResolveTableName(value.UsersTableName, "USERS");
        _rolesTable = ResolveTableName(value.RolesTableName, "ROLES");
        _questionsTable = ResolveTableName(value.QuestionsTableName, "QUESTIONS");
        _sessionsTable = "SESSIONS";
        _moderatedAnswersTable = ResolveTableName(value.ModeratedAnswersTableName, "MODERATED_ANSWERS");
    }

    public async Task TrackSessionCreatedAsync(string sessionCode, string hostEmail, string quizId, string quizTitle)
    {
        if (string.IsNullOrWhiteSpace(sessionCode) || string.IsNullOrWhiteSpace(hostEmail))
        {
            return;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        var hostUserId = await EnsureUserIdByEmailAsync(connection, hostEmail.Trim());
        if (hostUserId <= 0)
        {
            return;
        }

        var sessionName = BuildSessionName(sessionCode, quizTitle);

        using (var insert = connection.CreateCommand())
        {
            insert.CommandText = $"""
                INSERT INTO {_sessionsTable} (HOST_USER_ID, SESSION_NAME, STATUS)
                VALUES ({hostUserId}, {ToSqlStringLiteral(sessionName)}, 'active')
                """;
            await insert.ExecuteNonQueryAsync();
        }

        using (var query = connection.CreateCommand())
        {
            query.CommandText = $"""
                SELECT SESSION_ID
                FROM {_sessionsTable}
                WHERE SESSION_NAME = {ToSqlStringLiteral(sessionName)}
                ORDER BY SESSION_ID DESC
                FETCH FIRST 1 ROWS ONLY
                """;

            var sessionIdObj = await query.ExecuteScalarAsync();
            if (sessionIdObj == null || sessionIdObj == DBNull.Value)
            {
                return;
            }

            _sessionIds[sessionCode.Trim().ToUpperInvariant()] = Convert.ToInt64(sessionIdObj);
        }
    }

    public async Task TrackAnswerSubmittedAsync(string sessionCode, string questionId, string participantEmail, int selectedOptionIndex)
    {
        if (string.IsNullOrWhiteSpace(sessionCode) || string.IsNullOrWhiteSpace(questionId) || string.IsNullOrWhiteSpace(participantEmail))
        {
            return;
        }

        if (!TryGuidToNumber(questionId, out var questionDbId) || questionDbId <= 0)
        {
            return;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        var sessionDbId = await ResolveSessionIdAsync(connection, sessionCode);
        if (sessionDbId <= 0)
        {
            return;
        }

        var participantUserId = await EnsureUserIdByEmailAsync(connection, participantEmail.Trim());
        if (participantUserId <= 0)
        {
            return;
        }

        using var questionCommand = connection.CreateCommand();
        questionCommand.CommandText = $"""
            SELECT ANSWERS_KEY, POINTS
            FROM {_questionsTable}
            WHERE QUESTION_ID = {questionDbId}
            """;

        string answersKey;
        var points = 1;

        using (var reader = await questionCommand.ExecuteReaderAsync())
        {
            if (!await reader.ReadAsync())
            {
                return;
            }

            answersKey = ReadString(reader, "ANSWERS_KEY");
            points = Math.Max(ReadInt(reader, "POINTS"), 1);
        }

        var selectedAnswer = IndexToAnswerKey(selectedOptionIndex);
        var isCorrect = string.Equals(selectedAnswer, answersKey, StringComparison.OrdinalIgnoreCase);
        var awardedScore = isCorrect ? points : 0;

        using var insert = connection.CreateCommand();
        insert.CommandText = $"""
            INSERT INTO {_moderatedAnswersTable} (SESSION_ID, QUESTION_ID, PARTICIPANT_ID, SELECTED_ANSWER, IS_CORRECT, SCORE)
            VALUES ({sessionDbId}, {questionDbId}, {participantUserId}, {ToSqlStringLiteral(selectedAnswer)}, {(isCorrect ? 1 : 0)}, {awardedScore})
            """;
        await insert.ExecuteNonQueryAsync();
    }

    public async Task TrackSessionCompletedAsync(string sessionCode)
    {
        if (string.IsNullOrWhiteSpace(sessionCode))
        {
            return;
        }

        using var connection = CreateConnection();
        await connection.OpenAsync();

        var sessionDbId = await ResolveSessionIdAsync(connection, sessionCode);
        if (sessionDbId <= 0)
        {
            return;
        }

        using var update = connection.CreateCommand();
        update.CommandText = $"""
            UPDATE {_sessionsTable}
            SET STATUS = 'completed', END_AT = CURRENT_TIMESTAMP
            WHERE SESSION_ID = {sessionDbId}
            """;
        await update.ExecuteNonQueryAsync();

        _sessionIds.TryRemove(sessionCode.Trim().ToUpperInvariant(), out _);
    }

    private async Task<long> ResolveSessionIdAsync(OdbcConnection connection, string sessionCode)
    {
        var normalizedCode = sessionCode.Trim().ToUpperInvariant();
        if (_sessionIds.TryGetValue(normalizedCode, out var knownId) && knownId > 0)
        {
            return knownId;
        }

        using var query = connection.CreateCommand();
        query.CommandText = $"""
            SELECT SESSION_ID
            FROM {_sessionsTable}
            WHERE SESSION_NAME LIKE {ToSqlStringLiteral($"MOD:{normalizedCode}:%")}
            ORDER BY SESSION_ID DESC
            FETCH FIRST 1 ROWS ONLY
            """;

        var value = await query.ExecuteScalarAsync();
        if (value == null || value == DBNull.Value)
        {
            return 0;
        }

        var resolved = Convert.ToInt64(value);
        _sessionIds[normalizedCode] = resolved;
        return resolved;
    }

    private async Task<long> ResolveUserIdByEmailAsync(OdbcConnection connection, string userEmail)
    {
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return 0;
        }

        using var query = connection.CreateCommand();
        query.CommandText = $"SELECT USER_ID FROM {_usersTable} WHERE LOWER(EMAIL) = LOWER({ToSqlStringLiteral(userEmail)})";

        var value = await query.ExecuteScalarAsync();
        return value == null || value == DBNull.Value ? 0 : Convert.ToInt64(value);
    }

    private async Task<long> EnsureUserIdByEmailAsync(OdbcConnection connection, string userEmail)
    {
        var normalizedEmail = userEmail?.Trim().ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return 0;
        }

        var existingUserId = await ResolveUserIdByEmailAsync(connection, normalizedEmail);
        if (existingUserId > 0)
        {
            return existingUserId;
        }

        var roleId = await ResolveDefaultRoleIdAsync(connection);
        if (roleId <= 0)
        {
            return 0;
        }

        var usernameBase = normalizedEmail.Contains("@")
            ? normalizedEmail.Split('@')[0]
            : normalizedEmail;
        if (string.IsNullOrWhiteSpace(usernameBase))
        {
            usernameBase = "participant";
        }

        var username = $"{usernameBase}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

        try
        {
            using var insert = connection.CreateCommand();
            insert.CommandText = $"""
                INSERT INTO {_usersTable} (USERNAME, EMAIL, PASSWORD_HASH, ROLE_ID)
                VALUES (?, ?, ?, ?)
                """;
            insert.Parameters.Add(new OdbcParameter { Value = username });
            insert.Parameters.Add(new OdbcParameter { Value = normalizedEmail });
            insert.Parameters.Add(new OdbcParameter { Value = "moderated-mode-generated-user" });
            insert.Parameters.Add(new OdbcParameter { Value = roleId });
            await insert.ExecuteNonQueryAsync();
        }
        catch
        {
            // ignore insert race or unique conflicts, then re-resolve
        }

        return await ResolveUserIdByEmailAsync(connection, normalizedEmail);
    }

    private async Task<long> ResolveDefaultRoleIdAsync(OdbcConnection connection)
    {
        using (var preferred = connection.CreateCommand())
        {
            preferred.CommandText = $"""
                SELECT ROLE_ID
                FROM {_rolesTable}
                WHERE LOWER(ROLE_NAME) IN ('general_user', 'user')
                ORDER BY ROLE_ID
                FETCH FIRST 1 ROWS ONLY
                """;
            var preferredId = await preferred.ExecuteScalarAsync();
            if (preferredId != null && preferredId != DBNull.Value)
            {
                return Convert.ToInt64(preferredId);
            }
        }

        using var fallback = connection.CreateCommand();
        fallback.CommandText = $"""
            SELECT ROLE_ID
            FROM {_rolesTable}
            ORDER BY ROLE_ID
            FETCH FIRST 1 ROWS ONLY
            """;
        var fallbackId = await fallback.ExecuteScalarAsync();
        return fallbackId == null || fallbackId == DBNull.Value ? 0 : Convert.ToInt64(fallbackId);
    }

    private OdbcConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Oracle ODBC connection string is not configured for moderated mode persistence.");
        }

        return new OdbcConnection(_connectionString);
    }

    private static bool TryGuidToNumber(string guidText, out long value)
    {
        value = 0;
        if (!Guid.TryParse(guidText, out var guid))
        {
            return false;
        }

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

    private static string BuildSessionName(string sessionCode, string quizTitle)
    {
        var safeTitle = string.IsNullOrWhiteSpace(quizTitle) ? "Quiz Session" : quizTitle.Trim();
        return $"MOD:{sessionCode.Trim().ToUpperInvariant()}:{safeTitle}";
    }

    private static string ResolveTableName(string configured, string fallback)
    {
        return string.IsNullOrWhiteSpace(configured) ? fallback : configured.Trim();
    }

    private static string ToSqlStringLiteral(string value)
    {
        return $"'{(value ?? string.Empty).Replace("'", "''")}'";
    }

    private static string ReadString(System.Data.Common.DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? string.Empty : Convert.ToString(value)?.Trim() ?? string.Empty;
    }

    private static int ReadInt(System.Data.Common.DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? 0 : Convert.ToInt32(value);
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
}
