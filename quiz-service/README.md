# Quiz Service

ASP.NET Core Web API for trivia categories, quizzes, questions, media playback, and moderated quiz sessions.

## Current implementation

- JWT authentication wiring
- CORS configuration
- health endpoint
- categories and quiz discovery
- admin quiz/question CRUD endpoints
- user quiz attempt and history endpoints
- Oracle ODBC data service support (`OdbcQuizDataService`)
- file-based fallback data service (`FileQuizDataService`)

## Local run

1. Install the .NET SDK/runtime.
2. Go to `quiz-service/QuizService`.
3. Run `dotnet restore`
4. Run `dotnet run`

## Oracle Autonomous DB (ODBC + Wallet)

Set environment variables before starting:

```bash
export TNS_ADMIN="/path/to/unzipped/wallet"
export ORACLE_ODBC_CONNECTION_STRING='Driver={Oracle 23 ODBC driver};Dbq=<service_name>;Uid=<username>;Pwd=<password>;'
```

Then run:

```bash
dotnet run --project "quiz-service/QuizService/QuizService.csproj"
```

Detailed setup and SQL tables:

- `docs/oracle-odbc-setup.md`
