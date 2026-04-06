function normalizeOption(option, index = 0) {
  if (typeof option === "string") {
    return {
      id: String.fromCharCode(97 + index),
      text: option
    };
  }

  return {
    id: option?.id || `option-${index + 1}`,
    text: option?.text || ""
  };
}

function toPositiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeScoreValue(score, questionCount = 0) {
  if (typeof score === "string" && score.includes("/")) {
    return score;
  }

  if (typeof score === "number") {
    return `${score}/${questionCount}`;
  }

  return questionCount > 0 ? `0/${questionCount}` : "0/0";
}

export function normalizeCategory(payload) {
  return {
    id: payload?.id || "",
    title: payload?.title || payload?.name || "",
    description: payload?.description || "",
    quizCount: payload?.quizCount ?? 0
  };
}

export function normalizeQuizSummary(payload) {
  const questionCount = payload?.questionCount ?? payload?.questions?.length ?? 0;

  return {
    id: payload?.id || "",
    title: payload?.title || "",
    category: payload?.category || "",
    status: payload?.status || "Draft",
    description: payload?.description || "",
    mediaType: payload?.mediaType || "",
    bestScore: normalizeScoreValue(payload?.bestScore || payload?.score, questionCount),
    questionCount
  };
}

export function normalizeQuestion(payload, index = 0) {
  const normalizedOptions = Array.isArray(payload?.options)
    ? payload.options.map((option, optionIndex) => normalizeOption(option, optionIndex))
    : [];

  return {
    id: payload?.id || `question-${index + 1}`,
    text: payload?.text || "",
    mediaType: payload?.mediaType || "Image",
    mediaUrl: payload?.mediaUrl || "",
    mediaPrompt: payload?.mediaPrompt || "",
    options: normalizedOptions,
    correctOptionIndex: toPositiveInteger(payload?.correctOptionIndex, 0),
    points: Math.max(toPositiveInteger(payload?.points, 1), 1)
  };
}

export function normalizeQuizDetail(payload) {
  return {
    id: payload?.id || "",
    title: payload?.title || "",
    category: payload?.category || "",
    status: payload?.status || "Draft",
    description: payload?.description || "",
    questions: Array.isArray(payload?.questions)
      ? payload.questions.map((question, index) => normalizeQuestion(question, index))
      : []
  };
}

export function normalizeQuizAttempt(payload) {
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];

  return {
    score: payload?.score ?? 0,
    totalQuestions: payload?.totalQuestions ?? answers.length,
    completedAt: payload?.completedAt || "",
    answers: answers.map((answer) => ({
      questionId: answer?.questionId || "",
      selectedOptionId: answer?.selectedOptionId || "",
      isCorrect: Boolean(answer?.isCorrect)
    }))
  };
}

export function normalizeQuizSummaryResponse(payload) {
  const rows = Array.isArray(payload?.recentResults) ? payload.recentResults : [];

  return {
    totalAttempts: payload?.totalAttempts ?? 0,
    totalScore: payload?.totalScore || "0/0",
    recentResults: rows.map((row) => ({
      quizTitle: row?.quizTitle || row?.title || "",
      score: row?.score || row?.bestScore || "0/0",
      completedAt: row?.completedAt || row?.time || ""
    }))
  };
}

export function normalizeUserPerformancePage(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    page: payload?.page ?? 1,
    pageSize: payload?.pageSize ?? items.length,
    totalUsers: payload?.totalUsers ?? items.length,
    items: items.map((item) => ({
      email: item?.email || "",
      totalAttempts: item?.totalAttempts ?? 0,
      totalScore: item?.totalScore || "0/0",
      lastPlayed: item?.lastPlayed || "",
      quizStats: Array.isArray(item?.quizStats)
        ? item.quizStats.map((quiz) => ({
            quizTitle: quiz?.quizTitle || quiz?.title || "",
            bestScore: quiz?.bestScore || "0/0",
            completedAt: quiz?.completedAt || ""
          }))
        : []
    }))
  };
}

export function normalizeAdminSessionsPage(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    page: payload?.page ?? 1,
    pageSize: payload?.pageSize ?? items.length,
    totalSessions: payload?.totalSessions ?? items.length,
    items: items.map((item) => ({
      id: item?.id || "",
      sessionCode: item?.sessionCode || "",
      category: item?.category || "",
      hostEmail: item?.hostEmail || "",
      status: item?.status || "",
      startedAt: item?.startedAt || "",
      endedAt: item?.endedAt || "",
      startedAtText: item?.startedAtText || "--",
      endedAtText: item?.endedAtText || "--",
      participantCount: item?.participantCount ?? 0,
      questionCount: item?.questionCount ?? 0
    }))
  };
}

export function normalizeQuizAttemptSummary(payload) {
  return {
    message: payload?.message || "",
    bestScore: payload?.bestScore || "0/0",
    totalAttempts: payload?.totalAttempts ?? 0
  };
}

export function createEmptyQuizPayload() {
  return {
    title: "",
    category: "",
    status: "Draft",
    description: ""
  };
}

export function createEmptyQuestionPayload() {
  return {
    text: "",
    mediaType: "Image",
    mediaUrl: "",
    mediaPrompt: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    points: 1
  };
}

export function buildQuizUpsertPayload(payload) {
  return {
    title: payload?.title?.trim?.() || "",
    category: payload?.category?.trim?.() || "",
    status: payload?.status || "Draft",
    description: payload?.description?.trim?.() || ""
  };
}

export function buildQuestionUpsertPayload(payload) {
  const normalizedOptions = Array.isArray(payload?.options)
    ? payload.options.map((option) => typeof option === "string" ? option : option?.text || "")
    : [];

  return {
    text: payload?.text?.trim?.() || "",
    mediaType: payload?.mediaType || "Image",
    mediaUrl: payload?.mediaUrl?.trim?.() || "",
    mediaPrompt: payload?.mediaPrompt?.trim?.() || "",
    options: normalizedOptions.map((option) => option.trim()),
    correctOptionIndex: toPositiveInteger(payload?.correctOptionIndex, 0),
    points: Math.max(toPositiveInteger(payload?.points, 1), 1)
  };
}

export function buildQuizAttemptPayload(payload) {
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];

  return {
    score: payload?.score ?? 0,
    totalQuestions: payload?.totalQuestions ?? answers.length,
    completedAt: payload?.completedAt || new Date().toISOString(),
    answers: answers.map((answer) => ({
      questionId: answer?.questionId || "",
      selectedOptionId: answer?.selectedOptionId || "",
      isCorrect: Boolean(answer?.isCorrect)
    }))
  };
}
