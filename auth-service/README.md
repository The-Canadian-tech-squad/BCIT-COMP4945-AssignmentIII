# Auth Service

ASP.NET Core Web API for authentication and role management.

## Endpoints

- `POST /register`
- `POST /login`
- `GET /users/me`
- `GET /admin/users`

## Local Run

1. Install the .NET 8 SDK and runtime.
2. Go to `auth-service/AuthService`.
3. Run `dotnet restore`
4. Run `dotnet run`

The service listens on `http://localhost:5070`.

## Notes

- JWT key is stored in `Resources/Security/jwt-key.txt`.
- Response messages are loaded from `Resources/Messages/*.txt`.
- Users are stored in `Data/users.json`.
