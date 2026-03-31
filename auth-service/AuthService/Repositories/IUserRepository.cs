using AuthService.Models;

namespace AuthService.Repositories;

public interface IUserRepository
{
    Task<IReadOnlyList<UserRecord>> GetAllAsync();
    Task<UserRecord?> GetByEmailAsync(string email);
    Task AddAsync(UserRecord user);
    Task UpdateAsync(UserRecord user);
    Task SeedIfEmptyAsync(IEnumerable<UserRecord> seedUsers);
}
