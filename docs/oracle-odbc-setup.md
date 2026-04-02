# Oracle Autonomous DB Setup (ODBC + Wallet + TLS)

This project supports Oracle Cloud Autonomous Database via ODBC.

## 1. Prerequisites

- Oracle ODBC driver installed (for example Oracle 23 ODBC driver)
- .NET SDK installed
- Wallet zip downloaded from Oracle Cloud

## 2. Unzip Wallet

Example:

```bash
unzip "/Users/zhirui/BCIT-CST/Term4/Client Server/Oracle/Wallet_quizdb.zip" \
  -d "/Users/zhirui/BCIT-CST/Term4/Client Server/Oracle/Wallet_quizdb"
```

After extraction, this folder should contain files like:

- `tnsnames.ora`
- `sqlnet.ora`
- wallet certificate files

## 3. Set Environment Variables

Set `TNS_ADMIN` to the wallet directory:

```bash
export TNS_ADMIN="/Users/zhirui/BCIT-CST/Term4/Client Server/Oracle/Wallet_quizdb"
```

Set Oracle ODBC connection string for the API:

```bash
export ORACLE_ODBC_CONNECTION_STRING='Driver={Oracle 23 ODBC driver};Dbq=quizdb_tp;Uid=ADMIN;Pwd=<YOUR_PASSWORD>;'
```

Notes:

- `Dbq` should be your service name from wallet `tnsnames.ora` (example: `quizdb_tp`).
- Driver name must match the installed ODBC driver exactly.

## 4. Run Auth Service

```bash
dotnet run --project "auth-service/AuthService/AuthService.csproj"
```

With `ORACLE_ODBC_CONNECTION_STRING` set, the app uses `OdbcUserRepository`.

## 5. Apply Your Team Schema Script

Run your Oracle schema script (the one containing `roles`, `users`, `categories`, `questions`, `individual_answers`, `sessions`, and `moderated_answers`).

Important seed requirement:

- `roles` must contain:
  - `(1, 'admin')`
  - `(2, 'general_user')`

Current ODBC implementations in this repo are mapped to that schema directly.

## 6. Run Quiz Service with Oracle ODBC

```bash
export TNS_ADMIN="/Users/zhirui/BCIT-CST/Term4/Client Server/Oracle/Wallet_quizdb"
export ORACLE_ODBC_CONNECTION_STRING='Driver={Oracle 23 ODBC driver};Dbq=quizdb_tp;Uid=ADMIN;Pwd=<YOUR_PASSWORD>;'
dotnet run --project "quiz-service/QuizService/QuizService.csproj"
```

With `ORACLE_ODBC_CONNECTION_STRING` set, the app uses `OdbcQuizDataService`.

## 7. Quick Verification

- `POST /register`
- `POST /login`
- `GET /users/me` with bearer token

If these work and data appears in `users`, Oracle ODBC wiring is working.

For quiz-service:

- `GET /categories`
- `GET /categories/{categoryId}/quizzes`
- `POST /quizzes/{quizId}/attempts`

If these work and data appears in `categories/questions/individual_answers`, quiz Oracle wiring is working.

## 8. Common Errors

- `Data source name not found`: ODBC driver name mismatch.
- `ORA-28759` or wallet-related TLS errors: `TNS_ADMIN` not set correctly or wallet files missing.
- `ORA-12154`: service alias in `Dbq` not found in `tnsnames.ora`.
- `ORA-01017`: invalid username/password.
- `Oracle ODBC connection string is not configured`: missing `ORACLE_ODBC_CONNECTION_STRING`.
