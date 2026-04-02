# BCIT COMP4945 - Assignment III (Quiz App)

This repository contains a trivia web app with:

- `auth-service` (ASP.NET Core Web API)
- `quiz-service` (ASP.NET Core Web API)
- `frontend` (HTML/CSS/JavaScript)

The backend is configured to work with Oracle Cloud Autonomous Database using ODBC + Wallet.

## Project Structure

- `auth-service/` Authentication, registration, login, role-based access
- `quiz-service/` Categories, quizzes, questions, attempts, user performance
- `frontend/` Static pages for user/admin flows

## Prerequisites

- .NET SDK installed
- ODBC Driver Manager installed (unixODBC on macOS/Linux, ODBC Data Source Administrator on Windows)
- Oracle Instant Client (`basic` + `odbc`) extracted locally
- Oracle wallet files from your shared team database

## 1. Install ODBC Driver Manager

Install the ODBC driver manager for your OS:

- macOS: install `unixODBC` (Homebrew or other package manager)
- Linux: install `unixODBC` from your distro packages
- Windows: use built-in ODBC Data Source Administrator (`odbcad32`) and Oracle ODBC driver installer

## 2. Register Oracle ODBC Driver (one-time)

Register Oracle ODBC driver with a name (for example `Oracle23IC`).

For macOS/Linux (unixODBC), update the path below to your local Instant Client folder:

```bash
cat > /tmp/oracle23_odbc_driver.ini <<'EOF'
[Oracle23IC]
Description=Oracle Instant Client 23 ODBC
Driver=/YOUR/PATH/instantclient_23_3/libsqora.dylib.23.1
Setup=/YOUR/PATH/instantclient_23_3/libsqora.dylib.23.1
FileUsage=1
EOF

odbcinst -i -d -f /tmp/oracle23_odbc_driver.ini
odbcinst -q -d
```

Expected output should include:

```text
[Oracle23IC]
```

For Windows, install Oracle Instant Client ODBC package and verify the driver appears in ODBC Data Sources.

## 3. Wallet Setup

Place wallet files under:

```text
<instantclient>/network/admin
```

Make sure these files exist:

- `tnsnames.ora`
- `sqlnet.ora`
- `cwallet.sso`

## 4. Environment Variables

Set these before running services.

macOS/Linux:

```bash
export TNS_ADMIN="/YOUR/PATH/instantclient_23_3/network/admin"
export ORACLE_ODBC_CONNECTION_STRING='Driver={Oracle23IC};Dbq=quizdb_tp;Uid=ADMIN;Pwd=<TEAM_DB_PASSWORD>;'
```

macOS only (if required for dynamic library loading):

```bash
export DYLD_FALLBACK_LIBRARY_PATH="/YOUR/PATH/instantclient_23_3:/opt/homebrew/lib:/usr/local/lib:/usr/lib"
```

Windows PowerShell:

```powershell
$env:TNS_ADMIN="C:\path\to\instantclient_23_3\network\admin"
$env:ORACLE_ODBC_CONNECTION_STRING="Driver={Oracle23IC};Dbq=quizdb_tp;Uid=ADMIN;Pwd=<TEAM_DB_PASSWORD>;"
```

Tip: put these in your shell profile (`~/.zshrc`, `~/.bashrc`, PowerShell profile) for convenience.

## 5. Run Services

From repository root:

```bash
dotnet run --project "auth-service/AuthService/AuthService.csproj"
dotnet run --project "quiz-service/QuizService/QuizService.csproj"
```

Run frontend:

```bash
cd frontend
python3 -m http.server 3000
```

Open:

```text
http://localhost:3000
```

## 6. Common Errors

- `Can't open lib 'Oracle 23 ODBC driver'`
  - Driver is not registered or connection string driver name is wrong.
  - Use `Driver={Oracle23IC}` after registration.

- `ORA-28759: failure to open file`
  - Wallet path is wrong or wallet files are missing.
  - Re-check `TNS_ADMIN` and `cwallet.sso`.

- Data is saved to local `users.json` instead of Oracle
  - Current terminal is missing `ORACLE_ODBC_CONNECTION_STRING`.

## Security Notes

- Do **not** commit wallet files to Git.
- Do **not** commit database passwords.
- Use local environment variables or local secret management.

## Additional Docs

- Auth service details: `auth-service/README.md`
- Quiz service details: `quiz-service/README.md`
- Oracle setup notes: `docs/oracle-odbc-setup.md`
