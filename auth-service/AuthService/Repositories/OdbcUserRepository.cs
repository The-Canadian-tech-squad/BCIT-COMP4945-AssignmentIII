using AuthService.Models;
using AuthService.Options;
using Microsoft.Extensions.Options;
using System.Data.Common;
using System.Data.Odbc;

namespace AuthService.Repositories;

public sealed class OdbcUserRepository : IUserRepository
{
    private readonly string _connectionString;
    private readonly string _usersTableName;
    private readonly string _rolesTableName;

    public OdbcUserRepository(IOptions<OracleOdbcOptions> options)
    {
        _connectionString = options.Value.ConnectionString;
        _usersTableName = string.IsNullOrWhiteSpace(options.Value.UsersTableName)
            ? "USERS"
            : options.Value.UsersTableName.Trim();
        _rolesTableName = string.IsNullOrWhiteSpace(options.Value.RolesTableName)
            ? "ROLES"
            : options.Value.RolesTableName.Trim();
    }

    public async Task<IReadOnlyList<UserRecord>> GetAllAsync()
    {
        var users = new List<UserRecord>();
        using var connection = CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT u.USER_ID, u.EMAIL, u.PASSWORD_HASH, r.ROLE_NAME, u.CREATED_AT
            FROM {_usersTableName} u
            JOIN {_rolesTableName} r ON r.ROLE_ID = u.ROLE_ID
            ORDER BY u.EMAIL
            """;

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(MapUser(reader));
        }

        return users;
    }

    public async Task<UserRecord?> GetByEmailAsync(string email)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT u.USER_ID, u.EMAIL, u.PASSWORD_HASH, r.ROLE_NAME, u.CREATED_AT
            FROM {_usersTableName} u
            JOIN {_rolesTableName} r ON r.ROLE_ID = u.ROLE_ID
            WHERE LOWER(u.EMAIL) = LOWER(?)
            """;
        command.Parameters.Add(new OdbcParameter { Value = email });

        using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapUser(reader) : null;
    }

    public async Task AddAsync(UserRecord user)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        var roleId = await ResolveRoleIdAsync(connection, user.Role);
        var username = await GenerateUsernameAsync(connection, user.Email);

        using var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO {_usersTableName} (USERNAME, EMAIL, PASSWORD_HASH, ROLE_ID, CREATED_AT)
            VALUES (?, ?, ?, ?, ?)
            """;
        command.Parameters.Add(new OdbcParameter { Value = username });
        command.Parameters.Add(new OdbcParameter { Value = user.Email });
        command.Parameters.Add(new OdbcParameter { Value = user.PasswordHash });
        command.Parameters.Add(new OdbcParameter { Value = roleId });
        command.Parameters.Add(new OdbcParameter { Value = user.CreatedAtUtc });

        await command.ExecuteNonQueryAsync();
    }

    public Task UpdateAsync(UserRecord user)
    {
        // Current Oracle schema does not contain RemainingCalls/UsageCount columns.
        // Keep this as no-op to preserve the service contract.
        return Task.CompletedTask;
    }

    public async Task SeedIfEmptyAsync(IEnumerable<UserRecord> seedUsers)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync();

        using var countCommand = connection.CreateCommand();
        countCommand.CommandText = $"SELECT COUNT(*) FROM {_usersTableName}";
        var countObj = await countCommand.ExecuteScalarAsync();
        var count = Convert.ToInt32(countObj);
        if (count > 0)
        {
            return;
        }

        foreach (var user in seedUsers)
        {
            var roleId = await ResolveRoleIdAsync(connection, user.Role);
            var username = await GenerateUsernameAsync(connection, user.Email);

            using var insertCommand = connection.CreateCommand();
            insertCommand.CommandText = $"""
                INSERT INTO {_usersTableName} (USERNAME, EMAIL, PASSWORD_HASH, ROLE_ID, CREATED_AT)
                VALUES (?, ?, ?, ?, ?)
                """;
            insertCommand.Parameters.Add(new OdbcParameter { Value = username });
            insertCommand.Parameters.Add(new OdbcParameter { Value = user.Email });
            insertCommand.Parameters.Add(new OdbcParameter { Value = user.PasswordHash });
            insertCommand.Parameters.Add(new OdbcParameter { Value = roleId });
            insertCommand.Parameters.Add(new OdbcParameter { Value = user.CreatedAtUtc });
            await insertCommand.ExecuteNonQueryAsync();
        }
    }

    private async Task<int> ResolveRoleIdAsync(OdbcConnection connection, string role)
    {
        var roleName = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
            ? "admin"
            : "general_user";

        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT ROLE_ID FROM {_rolesTableName} WHERE LOWER(ROLE_NAME) = LOWER(?)";
        command.Parameters.Add(new OdbcParameter { Value = roleName });

        var value = await command.ExecuteScalarAsync();
        if (value == null || value == DBNull.Value)
        {
            throw new InvalidOperationException($"Role '{roleName}' was not found in table {_rolesTableName}.");
        }

        return Convert.ToInt32(value);
    }

    private async Task<string> GenerateUsernameAsync(OdbcConnection connection, string email)
    {
        var raw = email.Split('@')[0].Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(raw))
        {
            raw = "user";
        }

        var baseName = raw.Length > 200 ? raw[..200] : raw;
        var candidate = baseName;
        var suffix = 1;

        while (await UsernameExistsAsync(connection, candidate))
        {
            candidate = $"{baseName}_{suffix}";
            suffix++;
        }

        return candidate;
    }

    private async Task<bool> UsernameExistsAsync(OdbcConnection connection, string username)
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT 1 FROM {_usersTableName} WHERE LOWER(USERNAME) = LOWER(?)";
        command.Parameters.Add(new OdbcParameter { Value = username });
        var result = await command.ExecuteScalarAsync();
        return result != null && result != DBNull.Value;
    }

    private OdbcConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Oracle ODBC connection string is not configured.");
        }

        return new OdbcConnection(_connectionString);
    }

    private static UserRecord MapUser(DbDataReader reader)
    {
        var userId = ReadLong(reader, "USER_ID");

        return new UserRecord
        {
            Id = NumberToGuid(userId),
            Email = ReadString(reader, "EMAIL"),
            PasswordHash = ReadString(reader, "PASSWORD_HASH"),
            Role = NormalizeRoleName(ReadString(reader, "ROLE_NAME")),
            RemainingCalls = 20,
            UsageCount = 0,
            CreatedAtUtc = ReadDateTime(reader, "CREATED_AT")
        };
    }

    private static string NormalizeRoleName(string roleName)
    {
        return string.Equals(roleName, "admin", StringComparison.OrdinalIgnoreCase)
            ? "admin"
            : "user";
    }

    private static string ReadString(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? string.Empty : Convert.ToString(value)?.Trim() ?? string.Empty;
    }

    private static long ReadLong(DbDataReader reader, string column)
    {
        var value = reader[column];
        return value == DBNull.Value ? 0L : Convert.ToInt64(value);
    }

    private static DateTime ReadDateTime(DbDataReader reader, string column)
    {
        var value = reader[column];
        if (value == DBNull.Value)
        {
            return DateTime.UtcNow;
        }

        return Convert.ToDateTime(value).ToUniversalTime();
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
}
