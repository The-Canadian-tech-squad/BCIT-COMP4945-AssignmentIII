using AuthService.Models;
using AuthService.Options;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace AuthService.Repositories;

public sealed class FileUserRepository : IUserRepository
{
    private readonly string _usersFilePath;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public FileUserRepository(IOptions<FileStorageOptions> options, IWebHostEnvironment environment)
    {
        _usersFilePath = Path.Combine(environment.ContentRootPath, options.Value.UsersFilePath);
        Directory.CreateDirectory(Path.GetDirectoryName(_usersFilePath)!);
    }

    public async Task<IReadOnlyList<UserRecord>> GetAllAsync()
    {
        await _mutex.WaitAsync();
        try
        {
            return await ReadUsersUnsafeAsync();
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task<UserRecord?> GetByEmailAsync(string email)
    {
        await _mutex.WaitAsync();
        try
        {
            var users = await ReadUsersUnsafeAsync();
            return users.FirstOrDefault(user => string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task AddAsync(UserRecord user)
    {
        await _mutex.WaitAsync();
        try
        {
            var users = await ReadUsersUnsafeAsync();
            users.Add(user);
            await WriteUsersUnsafeAsync(users);
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task UpdateAsync(UserRecord user)
    {
        await _mutex.WaitAsync();
        try
        {
            var users = await ReadUsersUnsafeAsync();
            var index = users.FindIndex(current => current.Id == user.Id);
            if (index >= 0)
            {
                users[index] = user;
                await WriteUsersUnsafeAsync(users);
            }
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task SeedIfEmptyAsync(IEnumerable<UserRecord> seedUsers)
    {
        await _mutex.WaitAsync();
        try
        {
            var users = await ReadUsersUnsafeAsync();
            if (users.Count > 0)
            {
                return;
            }

            users.AddRange(seedUsers);
            await WriteUsersUnsafeAsync(users);
        }
        finally
        {
            _mutex.Release();
        }
    }

    private async Task<List<UserRecord>> ReadUsersUnsafeAsync()
    {
        if (!File.Exists(_usersFilePath))
        {
            return new List<UserRecord>();
        }

        await using var stream = File.OpenRead(_usersFilePath);
        var users = await JsonSerializer.DeserializeAsync<List<UserRecord>>(stream);
        return users ?? new List<UserRecord>();
    }

    private async Task WriteUsersUnsafeAsync(List<UserRecord> users)
    {
        await using var stream = File.Create(_usersFilePath);
        await JsonSerializer.SerializeAsync(stream, users, _jsonOptions);
    }
}
