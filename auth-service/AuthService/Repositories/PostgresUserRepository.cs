using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Repositories;

public sealed class PostgresUserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public PostgresUserRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<UserRecord>> GetAllAsync()
    {
        return await _db.Users.AsNoTracking().ToListAsync();
    }

    public async Task<UserRecord?> GetByEmailAsync(string email)
    {
        return await _db.Users.FirstOrDefaultAsync(
            u => u.Email.ToLower() == email.ToLower());
    }

    public async Task AddAsync(UserRecord user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(UserRecord user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }

    public async Task SeedIfEmptyAsync(IEnumerable<UserRecord> seedUsers)
    {
        if (!await _db.Users.AnyAsync())
        {
            _db.Users.AddRange(seedUsers);
            await _db.SaveChangesAsync();
        }
    }
}
