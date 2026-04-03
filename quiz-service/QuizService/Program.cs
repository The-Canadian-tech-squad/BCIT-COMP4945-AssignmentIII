using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using QuizService.Hubs;
using QuizService.Options;
using QuizService.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ModeratedQuizSessionStore>();

builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));

builder.Services.Configure<CorsOptions>(
    builder.Configuration.GetSection(CorsOptions.SectionName));

builder.Services.Configure<FileStorageOptions>(
    builder.Configuration.GetSection(FileStorageOptions.SectionName));
builder.Services.Configure<OracleOdbcOptions>(
    builder.Configuration.GetSection(OracleOdbcOptions.SectionName));

var oracleOptions = builder.Configuration
    .GetSection(OracleOdbcOptions.SectionName)
    .Get<OracleOdbcOptions>() ?? new OracleOdbcOptions();

var oracleConnectionString = Environment.GetEnvironmentVariable("ORACLE_ODBC_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(oracleConnectionString))
{
    oracleConnectionString = oracleOptions.ConnectionString;
}

var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.KeyFilePath))
{
    throw new InvalidOperationException("JWT key file path is missing.");
}

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");

if (string.IsNullOrWhiteSpace(jwtKey))
{
    var jwtKeyPath = Path.IsPathRooted(jwtOptions.KeyFilePath)
        ? jwtOptions.KeyFilePath
        : Path.Combine(builder.Environment.ContentRootPath, jwtOptions.KeyFilePath);

    jwtKey = File.Exists(jwtKeyPath)
        ? File.ReadAllText(jwtKeyPath).Trim()
        : string.Empty;
}

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT signing key file is empty.");
}

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments("/hubs/moderated-quiz"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

var useOracleOdbc = oracleOptions.Enabled || !string.IsNullOrWhiteSpace(oracleConnectionString);
if (useOracleOdbc)
{
    if (string.IsNullOrWhiteSpace(oracleConnectionString))
    {
        throw new InvalidOperationException("Oracle ODBC is enabled but no connection string was provided.");
    }

    builder.Services.PostConfigure<OracleOdbcOptions>(options =>
    {
        options.ConnectionString = oracleConnectionString!;
    });
    builder.Services.AddScoped<IQuizDataService, OdbcQuizDataService>();
    builder.Services.AddSingleton<IModeratedQuizPersistenceService, OdbcModeratedQuizPersistenceService>();
}
else
{
    builder.Services.AddSingleton<IQuizDataService, FileQuizDataService>();
    builder.Services.AddSingleton<IModeratedQuizPersistenceService, NoopModeratedQuizPersistenceService>();
}

var corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        if (corsOptions.AllowedOrigins.Count > 0)
        {
            policy.WithOrigins(corsOptions.AllowedOrigins.ToArray())
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            policy.WithOrigins("http://localhost:3000")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ModeratedQuizHub>("/hubs/moderated-quiz");

app.Run();
