# Auth Service

ASP.NET Core Web API for authentication and role management.

## Endpoints

- `POST /register`
- `POST /login`
- `GET /users/me`
- `GET /admin/users`

## Local Run

1. Install the .NET SDK and runtime.
2. Go to `auth-service/AuthService`.
3. Run `dotnet restore`
4. Run `dotnet run`

The service listens on `http://localhost:5070`.

## Oracle Autonomous DB (ODBC + Wallet)

If you are using Oracle Cloud Autonomous DB, configure these environment variables first:

```bash
export TNS_ADMIN="/path/to/unzipped/wallet"
export ORACLE_ODBC_CONNECTION_STRING='Driver={Oracle 23 ODBC driver};Dbq=<service_name>;Uid=<username>;Pwd=<password>;'
```

Then run:

```bash
dotnet run --project "auth-service/AuthService/AuthService.csproj"
```

Detailed guide:

- `docs/oracle-odbc-setup.md`

## Notes

- JWT key is stored in `Resources/Security/jwt-key.txt`.
- Response messages are loaded from `Resources/Messages/*.txt`.
- Users are stored in Oracle when `ORACLE_ODBC_CONNECTION_STRING` is set.
- Otherwise users fall back to PostgreSQL/File storage based on current configuration.
