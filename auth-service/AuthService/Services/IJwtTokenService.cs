using AuthService.Models;

namespace AuthService.Services;

public interface IJwtTokenService
{
    string CreateToken(UserRecord user);
}
