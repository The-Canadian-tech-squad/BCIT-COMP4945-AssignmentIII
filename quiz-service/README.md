# Quiz Service

ASP.NET Core Web API for trivia categories, quizzes, questions, media playback, and moderated quiz sessions.

## Current status

This service is scaffolded as the new trivia-focused microservice.
It currently includes:

- a basic API project structure
- JWT authentication wiring
- CORS configuration
- a health endpoint
- a protected sample categories endpoint

## Planned responsibilities

- categories and quiz discovery
- admin quiz CRUD
- quiz play endpoints
- auto-play quiz mode
- moderated mode with web sockets

## Local run

1. Install the .NET 8 SDK/runtime.
2. Go to `quiz-service/QuizService`.
3. Run `dotnet restore`
4. Run `dotnet run`
