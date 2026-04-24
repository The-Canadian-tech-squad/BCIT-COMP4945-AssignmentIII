using System.Collections.Concurrent;

namespace QuizService.Services;

public sealed class ModeratedQuizSessionStore
{
    private readonly ConcurrentDictionary<string, ModeratedSession> _sessions = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _connectionToSessionCode = new(StringComparer.Ordinal);
    private readonly Random _random = new();
    private readonly object _codeGate = new();

    public ModeratedSessionSnapshot CreateSession(string hostConnectionId, string hostEmail, string quizId, string quizTitle)
    {
        var sessionCode = GenerateUniqueCode();
        var session = new ModeratedSession
        {
            SessionCode = sessionCode,
            HostConnectionId = hostConnectionId,
            HostEmail = hostEmail,
            QuizId = quizId,
            QuizTitle = quizTitle
        };

        _sessions[sessionCode] = session;
        _connectionToSessionCode[hostConnectionId] = sessionCode;
        return ToSnapshot(session);
    }

    public bool TryJoinParticipant(string sessionCode, string connectionId, string displayName, out ModeratedSessionSnapshot snapshot)
    {
        return TryJoinParticipant(sessionCode, connectionId, displayName, string.Empty, out snapshot);
    }

    public bool TryJoinParticipant(string sessionCode, string connectionId, string displayName, string userEmail, out ModeratedSessionSnapshot snapshot)
    {
        snapshot = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            session.Participants[connectionId] = new ModeratedParticipant
            {
                ConnectionId = connectionId,
                DisplayName = string.IsNullOrWhiteSpace(displayName) ? "Participant" : displayName.Trim(),
                UserEmail = userEmail?.Trim() ?? string.Empty
            };

            _connectionToSessionCode[connectionId] = sessionCode;
            snapshot = ToSnapshot(session);
        }

        return true;
    }

    public bool TryGetSnapshot(string sessionCode, out ModeratedSessionSnapshot snapshot)
    {
        snapshot = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            snapshot = ToSnapshot(session);
        }

        return true;
    }

    public bool TrySetQuestion(string sessionCode, string hostConnectionId, ModeratedQuestionPayload payload, out ModeratedQuestionState questionState)
    {
        questionState = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (!string.Equals(session.HostConnectionId, hostConnectionId, StringComparison.Ordinal))
            {
                return false;
            }

            session.CurrentQuestion = new ModeratedQuestionState
            {
                QuestionId = payload.QuestionId,
                QuestionText = payload.QuestionText,
                MediaType = payload.MediaType,
                MediaUrl = payload.MediaUrl,
                MediaPrompt = payload.MediaPrompt,
                Options = payload.Options?.Where(option => !string.IsNullOrWhiteSpace(option)).ToList() ?? [],
                CorrectOptionIndex = payload.CorrectOptionIndex,
                IsAnswerRevealed = false,
                QuestionIndex = payload.QuestionIndex,
                TotalQuestions = payload.TotalQuestions
            };
            session.Submissions.Clear();
            questionState = session.CurrentQuestion;
        }

        return true;
    }

    public bool TryResumeHostSession(string sessionCode, string hostConnectionId, string hostEmail, out ModeratedSessionSnapshot snapshot)
    {
        snapshot = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (!string.Equals(session.HostEmail, hostEmail?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            session.HostConnectionId = hostConnectionId;
            _connectionToSessionCode[hostConnectionId] = sessionCode;
            snapshot = ToSnapshot(session);
        }

        return true;
    }

    public bool TrySubmitAnswer(string sessionCode, string participantConnectionId, int optionIndex, out ModeratedAnswerStats stats)
    {
        stats = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (session.CurrentQuestion == null)
            {
                return false;
            }

            if (session.CurrentQuestion.IsAnswerRevealed)
            {
                return false;
            }

            if (!session.Participants.ContainsKey(participantConnectionId))
            {
                return false;
            }

            if (optionIndex < 0 || optionIndex >= session.CurrentQuestion.Options.Count)
            {
                return false;
            }

            if (session.Submissions.ContainsKey(participantConnectionId))
            {
                return false;
            }

            session.Submissions[participantConnectionId] = optionIndex;
            stats = BuildStats(session);
        }

        return true;
    }

    public bool TryGetCurrentQuestion(string sessionCode, out ModeratedQuestionState questionState)
    {
        questionState = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (session.CurrentQuestion == null)
            {
                return false;
            }

            questionState = session.CurrentQuestion;
        }

        return true;
    }

    public bool TryGetStats(string sessionCode, out ModeratedAnswerStats stats)
    {
        stats = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (session.CurrentQuestion == null)
            {
                return false;
            }

            stats = BuildStats(session);
        }

        return true;
    }

    public bool TryRevealAnswer(string sessionCode, string hostConnectionId, out ModeratedQuestionState questionState)
    {
        questionState = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (!string.Equals(session.HostConnectionId, hostConnectionId, StringComparison.Ordinal))
            {
                return false;
            }

            if (session.CurrentQuestion == null)
            {
                return false;
            }

            session.CurrentQuestion.IsAnswerRevealed = true;
            questionState = session.CurrentQuestion;
        }

        return true;
    }

    public bool TryGetParticipant(string sessionCode, string connectionId, out ModeratedParticipant participant)
    {
        participant = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (!session.Participants.TryGetValue(connectionId, out var found))
            {
                return false;
            }

            participant = new ModeratedParticipant
            {
                ConnectionId = found.ConnectionId,
                DisplayName = found.DisplayName,
                UserEmail = found.UserEmail
            };
        }

        return true;
    }

    public bool TryGetHostConnectionId(string sessionCode, out string hostConnectionId)
    {
        hostConnectionId = string.Empty;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        hostConnectionId = session.HostConnectionId;
        return true;
    }

    public bool TryEndSession(string sessionCode, string hostConnectionId, out ModeratedSessionSnapshot snapshot)
    {
        snapshot = default!;
        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (!string.Equals(session.HostConnectionId, hostConnectionId, StringComparison.Ordinal))
            {
                return false;
            }

            _sessions.TryRemove(sessionCode, out _);
            _connectionToSessionCode.TryRemove(session.HostConnectionId, out _);
            foreach (var participantConnectionId in session.Participants.Keys)
            {
                _connectionToSessionCode.TryRemove(participantConnectionId, out _);
            }

            snapshot = ToSnapshot(session);
        }

        return true;
    }

    public bool TryRemoveConnection(string connectionId, out string sessionCode, out bool hostDisconnected, out ModeratedSessionSnapshot snapshot)
    {
        sessionCode = string.Empty;
        hostDisconnected = false;
        snapshot = default!;

        if (!_connectionToSessionCode.TryRemove(connectionId, out var resolvedSessionCode))
        {
            return false;
        }
        sessionCode = resolvedSessionCode;

        if (!_sessions.TryGetValue(sessionCode, out var session))
        {
            return false;
        }

        lock (session.Gate)
        {
            if (string.Equals(session.HostConnectionId, connectionId, StringComparison.Ordinal))
            {
                hostDisconnected = false;
                session.HostConnectionId = string.Empty;
                snapshot = ToSnapshot(session);
                return true;
            }

            session.Participants.Remove(connectionId);
            session.Submissions.Remove(connectionId);
            snapshot = ToSnapshot(session);
        }

        return true;
    }

    private ModeratedAnswerStats BuildStats(ModeratedSession session)
    {
        var optionCount = session.CurrentQuestion?.Options.Count ?? 0;
        var counts = Enumerable.Repeat(0, optionCount).ToArray();

        foreach (var value in session.Submissions.Values)
        {
            if (value >= 0 && value < counts.Length)
            {
                counts[value] += 1;
            }
        }

        return new ModeratedAnswerStats
        {
            SessionCode = session.SessionCode,
            QuestionId = session.CurrentQuestion?.QuestionId ?? string.Empty,
            OptionCounts = counts.ToList(),
            TotalResponses = session.Submissions.Count
        };
    }

    private ModeratedSessionSnapshot ToSnapshot(ModeratedSession session)
    {
        return new ModeratedSessionSnapshot
        {
            SessionCode = session.SessionCode,
            QuizId = session.QuizId,
            QuizTitle = session.QuizTitle,
            HostEmail = session.HostEmail,
            ParticipantCount = session.Participants.Count,
            Participants = session.Participants.Values
                .OrderBy(participant => participant.DisplayName)
                .Select(participant => new ModeratedParticipant
                {
                    ConnectionId = participant.ConnectionId,
                    DisplayName = participant.DisplayName
                })
                .ToList()
        };
    }

    private string GenerateUniqueCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        lock (_codeGate)
        {
            while (true)
            {
                Span<char> buffer = stackalloc char[6];
                for (var i = 0; i < buffer.Length; i += 1)
                {
                    buffer[i] = alphabet[_random.Next(alphabet.Length)];
                }

                var code = new string(buffer);
                if (_sessions.ContainsKey(code))
                {
                    continue;
                }

                return code;
            }
        }
    }

    private sealed class ModeratedSession
    {
        public object Gate { get; } = new();
        public string SessionCode { get; set; } = string.Empty;
        public string HostConnectionId { get; set; } = string.Empty;
        public string HostEmail { get; set; } = string.Empty;
        public string QuizId { get; set; } = string.Empty;
        public string QuizTitle { get; set; } = string.Empty;
        public Dictionary<string, ModeratedParticipant> Participants { get; } = new(StringComparer.Ordinal);
        public Dictionary<string, int> Submissions { get; } = new(StringComparer.Ordinal);
        public ModeratedQuestionState? CurrentQuestion { get; set; }
    }
}

public sealed class ModeratedSessionSnapshot
{
    public string SessionCode { get; set; } = string.Empty;
    public string QuizId { get; set; } = string.Empty;
    public string QuizTitle { get; set; } = string.Empty;
    public string HostEmail { get; set; } = string.Empty;
    public int ParticipantCount { get; set; }
    public List<ModeratedParticipant> Participants { get; set; } = [];
}

public sealed class ModeratedParticipant
{
    public string ConnectionId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
}

public sealed class ModeratedQuestionPayload
{
    public string QuestionId { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaPrompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = [];
    public int CorrectOptionIndex { get; set; }
    public int QuestionIndex { get; set; }
    public int TotalQuestions { get; set; }
}

public sealed class ModeratedQuestionState
{
    public string QuestionId { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaPrompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = [];
    public int CorrectOptionIndex { get; set; }
    public bool IsAnswerRevealed { get; set; }
    public int QuestionIndex { get; set; }
    public int TotalQuestions { get; set; }
}

public sealed class ModeratedAnswerStats
{
    public string SessionCode { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public List<int> OptionCounts { get; set; } = [];
    public int TotalResponses { get; set; }
}
