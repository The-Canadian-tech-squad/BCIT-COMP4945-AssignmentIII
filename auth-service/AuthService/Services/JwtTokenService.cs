using AuthService.Models;
using AuthService.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AuthService.Services;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly ITextFileProvider _textFileProvider;
    private readonly IWebHostEnvironment _environment;

    public JwtTokenService(
        IOptions<JwtOptions> jwtOptions,
        ITextFileProvider textFileProvider,
        IWebHostEnvironment environment)
    {
        _jwtOptions = jwtOptions.Value;
        _textFileProvider = textFileProvider;
        _environment = environment;
    }

    public string CreateToken(UserRecord user)
    {
        var keyText = Environment.GetEnvironmentVariable("JWT_KEY");
        if (string.IsNullOrWhiteSpace(keyText))
        {
            keyText = _textFileProvider.ReadText(_jwtOptions.KeyFilePath);
        }

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyText));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
