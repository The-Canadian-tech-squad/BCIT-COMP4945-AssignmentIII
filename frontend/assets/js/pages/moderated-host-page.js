import { AppConfig } from "../config.js";
import { byId, setDisabled, setMessage, setText } from "../utils/dom.js";
import { QuizApiService } from "../services/quiz-api.js";
import { SessionController } from "../services/session-controller.js";

const sessionController = new SessionController();
const quizApi = new QuizApiService();
const session = sessionController.requireRole(AppConfig.roles.admin);

if (session) {
  const hostUserLabel = byId("hostUserLabel");
  const hostQuizSelect = byId("hostQuizSelect");
  const createSessionButton = byId("createSessionButton");
  const startQuestionButton = byId("startQuestionButton");
  const revealAnswerButton = byId("revealAnswerButton");
  const previousQuestionButton = byId("previousQuestionButton");
  const nextQuestionButton = byId("nextQuestionButton");
  const endSessionButton = byId("endSessionButton");
  const hostMessage = byId("hostMessage");
  const sessionCodePill = byId("sessionCodePill");
  const hostQuestionPanel = byId("hostQuestionPanel");
  const hostMonitorTitle = byId("hostMonitorTitle");
  const hostQuestionTitle = byId("hostQuestionTitle");
  const hostQuestionText = byId("hostQuestionText");
  const hostMediaPreview = byId("hostMediaPreview");
  const hostOptionList = byId("hostOptionList");
  const hostStatsList = byId("hostStatsList");
  const participantList = byId("participantList");
  const logoutButton = byId("logoutButton");

  const state = {
    connection: null,
    quizzes: [],
    activeSession: null,
    activeQuiz: null,
    resumeSessionCode: "",
    activeQuestionIndex: -1,
    activeQuestion: null,
    activeStats: null
  };

  setText(hostUserLabel, session.user?.email || "Host");
  void initialize();

  createSessionButton.addEventListener("click", async () => {
    const quizId = hostQuizSelect.value;
    const selectedQuiz = state.quizzes.find((quiz) => quiz.id === quizId);
    if (!selectedQuiz) {
      setMessage(hostMessage, "Please select a category first.", "error");
      return;
    }

    try {
      await ensureConnection();
      const snapshot = await state.connection.invoke("HostCreateSession", selectedQuiz.id, selectedQuiz.label);
      state.activeSession = snapshot;
      state.activeQuiz = selectedQuiz;
      state.activeQuestionIndex = -1;
      state.activeQuestion = null;
      state.activeStats = null;
      renderSession(snapshot);
      renderQuestion(null);
      renderStats(null);
      setDisabled(startQuestionButton, selectedQuiz.questions.length === 0);
      setDisabled(revealAnswerButton, true);
      setDisabled(previousQuestionButton, true);
      setDisabled(nextQuestionButton, true);
      setDisabled(endSessionButton, false);
      if (!selectedQuiz.questions.length) {
        setMessage(hostMessage, `Session ${snapshot.sessionCode} created. This category has no questions yet.`, "error");
      } else {
        setMessage(hostMessage, `Session ${snapshot.sessionCode} created. Start the first question when ready.`, "success");
      }
    } catch (error) {
      setMessage(hostMessage, error?.message || "Could not create host session.", "error");
    }
  });

  startQuestionButton.addEventListener("click", async () => {
    syncActiveQuizFromSelect();
    if (!state.activeQuiz?.questions?.length) {
      setMessage(hostMessage, "No questions available for this category.", "error");
      return;
    }

    state.activeQuestionIndex = 0;
    await pushCurrentQuestion();
  });

  nextQuestionButton.addEventListener("click", async () => {
    syncActiveQuizFromSelect();
    if (!state.activeQuiz?.questions?.length) {
      setMessage(hostMessage, "Session quiz is still syncing. Please try again in a moment.", "error");
      return;
    }

    const nextIndex = state.activeQuestionIndex + 1;
    if (nextIndex >= state.activeQuiz.questions.length) {
      setDisabled(nextQuestionButton, true);
      setMessage(hostMessage, "Reached the last question.", "success");
      return;
    }

    state.activeQuestionIndex = nextIndex;
    await pushCurrentQuestion();
  });

  previousQuestionButton.addEventListener("click", async () => {
    syncActiveQuizFromSelect();
    if (!state.activeQuiz?.questions?.length) {
      setMessage(hostMessage, "Session quiz is still syncing. Please try again in a moment.", "error");
      return;
    }

    const previousIndex = state.activeQuestionIndex - 1;
    if (previousIndex < 0) {
      setDisabled(previousQuestionButton, true);
      return;
    }

    state.activeQuestionIndex = previousIndex;
    await pushCurrentQuestion();
  });

  revealAnswerButton.addEventListener("click", async () => {
    if (!state.activeSession?.sessionCode || !state.connection || !state.activeQuestion) {
      return;
    }

    if (state.activeQuestion.isAnswerRevealed) {
      setMessage(hostMessage, "Answer is already revealed for this question.", "success");
      return;
    }

    try {
      const revealed = await state.connection.invoke("HostRevealAnswer", state.activeSession.sessionCode);
      if (!revealed) {
        throw new Error("Could not reveal answer.");
      }

      setMessage(hostMessage, "Answer revealed to all participants.", "success");
    } catch (error) {
      setMessage(hostMessage, error?.message || "Could not reveal answer.", "error");
    }
  });

  endSessionButton.addEventListener("click", async () => {
    if (!state.activeSession?.sessionCode || !state.connection) {
      return;
    }

    try {
      const ended = await state.connection.invoke("HostEndSession", state.activeSession.sessionCode);
      if (!ended) {
        throw new Error("Could not end session.");
      }

      resetSessionState();
      setMessage(hostMessage, "Session ended.", "success");
    } catch (error) {
      setMessage(hostMessage, error?.message || "Could not end session.", "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    await safeStopConnection();
    sessionController.clearSession();
    window.location.href = AppConfig.pages.login;
  });

  async function initialize() {
    try {
      await loadQuizzes();
      await ensureConnection();
      const resumeHandled = await tryResumeFromUrl();
      if (!resumeHandled) {
        setMessage(hostMessage, "Moderated host ready.", "success");
      }
    } catch (error) {
      setMessage(hostMessage, error?.message || "Could not initialize moderated host.", "error");
    }
  }

  async function tryResumeFromUrl() {
    const params = new URLSearchParams(window.location.search || "");
    const sessionCode = (params.get("resume") || "").trim().toUpperCase();
    if (!sessionCode || !state.connection) {
      return false;
    }

    try {
      const resumed = await state.connection.invoke("HostResumeSession", sessionCode);
      if (!resumed) {
        setMessage(hostMessage, `Could not resume session ${sessionCode}. It may be closed or owned by another host.`, "error");
        return true;
      }

      state.resumeSessionCode = sessionCode;
      setMessage(hostMessage, `Resumed session ${sessionCode}.`, "success");
      return true;
    } catch (error) {
      setMessage(hostMessage, error?.message || `Could not resume session ${sessionCode}.`, "error");
      return true;
    }
  }

  async function loadQuizzes() {
    const payload = await quizApi.getAdminQuizzes(session.token);
    const summaries = quizApi.normalizeQuizSummaries(payload);
    const details = await Promise.all(
      summaries.map(async (summary) => {
        const detailPayload = await quizApi.getAdminQuiz(session.token, summary.id);
        return quizApi.normalizeQuizDetail(detailPayload);
      })
    );

    const rows = details.map((quiz) => {
      const label = quiz.category || quiz.title || "Untitled category";
      return {
        id: quiz.id,
        label,
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      };
    });

    state.quizzes = rows;
    hostQuizSelect.textContent = "";

    if (!rows.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No categories available";
      hostQuizSelect.appendChild(option);
      setDisabled(hostQuizSelect, true);
      setDisabled(createSessionButton, true);
      setDisabled(startQuestionButton, true);
      setDisabled(revealAnswerButton, true);
      setDisabled(previousQuestionButton, true);
      setDisabled(nextQuestionButton, true);
      throw new Error("No categories found. Please create categories/questions in Admin Dashboard first.");
    }

    rows.forEach((quiz) => {
      const option = document.createElement("option");
      option.value = quiz.id;
      option.textContent = `${quiz.label} (${quiz.questions.length} questions)`;
      hostQuizSelect.appendChild(option);
    });

    setDisabled(hostQuizSelect, false);
    setDisabled(createSessionButton, false);
    setDisabled(startQuestionButton, true);
    setDisabled(revealAnswerButton, true);
    setDisabled(previousQuestionButton, true);
    setDisabled(nextQuestionButton, true);
  }

  async function ensureConnection() {
    if (state.connection) {
      if (state.connection.state === signalR.HubConnectionState.Connected) {
        return;
      }

      if (state.connection.state === signalR.HubConnectionState.Connecting || state.connection.state === signalR.HubConnectionState.Reconnecting) {
        return;
      }
    }

    if (!window.signalR) {
      throw new Error("SignalR client failed to load.");
    }

    state.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${AppConfig.quizServiceBaseUrl}/hubs/moderated-quiz`, {
        accessTokenFactory: () => sessionController.getSession().token || ""
      })
      .withAutomaticReconnect()
      .build();

    state.connection.on("SessionUpdated", (snapshot) => {
      if (!state.activeSession || snapshot?.sessionCode === state.activeSession.sessionCode) {
        state.activeSession = snapshot;
        hydrateActiveQuizFromSnapshot(snapshot);
        renderSession(snapshot);
      }
    });

    state.connection.on("QuestionChanged", (questionState) => {
      state.activeQuestion = questionState;
      hydrateQuestionPosition(questionState);
      renderQuestion(questionState);
    });

    state.connection.on("AnswerStatsUpdated", (stats) => {
      state.activeStats = stats;
      renderStats(stats);
    });

    state.connection.on("SessionClosed", (message) => {
      resetSessionState();
      setMessage(hostMessage, message || "Session closed.", "error");
    });

    state.connection.onreconnecting(() => {
      setMessage(hostMessage, "Connection lost. Reconnecting...", "error");
    });

    state.connection.onreconnected(() => {
      if (!state.activeSession?.sessionCode) {
        setMessage(hostMessage, "Reconnected to moderated hub.", "success");
        return;
      }

      void resumeHostSessionAfterReconnect();
    });

    state.connection.onclose(() => {
      if (state.activeSession) {
        setMessage(hostMessage, "Disconnected from moderated hub.", "error");
      }
    });

    await state.connection.start();
  }

  async function pushCurrentQuestion() {
    if (!state.activeSession?.sessionCode && state.resumeSessionCode) {
      state.activeSession = { sessionCode: state.resumeSessionCode, participantCount: 0, participants: [] };
    }

    if (!state.activeSession?.sessionCode || !state.activeQuiz) {
      setMessage(hostMessage, "Create a session first.", "error");
      return;
    }

    const question = state.activeQuiz.questions[state.activeQuestionIndex];
    if (!question) {
      setMessage(hostMessage, "Question not found in selected category.", "error");
      return;
    }

    const payload = {
      questionId: question.id,
      questionText: question.text,
      mediaType: question.mediaType || "",
      mediaUrl: question.mediaUrl || "",
      mediaPrompt: question.mediaPrompt || "",
      options: (question.options || []).map((option) => option?.text || "").filter((text) => text.trim().length > 0),
      correctOptionIndex: Number(question.correctOptionIndex ?? 0),
      questionIndex: state.activeQuestionIndex + 1,
      totalQuestions: state.activeQuiz.questions.length
    };

    if (!payload.options.length) {
      setMessage(hostMessage, "Question has no valid answer options.", "error");
      return;
    }

    try {
      const accepted = await state.connection.invoke("HostSetQuestion", state.activeSession.sessionCode, payload);
      if (!accepted) {
        throw new Error("Host cannot push this question.");
      }

      state.activeQuestion = {
        questionId: payload.questionId,
        questionText: payload.questionText,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
        mediaPrompt: payload.mediaPrompt,
        options: payload.options,
        correctOptionIndex: payload.correctOptionIndex,
        isAnswerRevealed: false,
        questionIndex: payload.questionIndex,
        totalQuestions: payload.totalQuestions
      };
      state.activeStats = {
        questionId: payload.questionId,
        optionCounts: payload.options.map(() => 0),
        totalResponses: 0
      };
      renderQuestion(state.activeQuestion);
      renderStats(state.activeStats);

      setDisabled(startQuestionButton, true);
      setDisabled(revealAnswerButton, false);
      setDisabled(previousQuestionButton, state.activeQuestionIndex <= 0);
      setDisabled(nextQuestionButton, state.activeQuestionIndex >= state.activeQuiz.questions.length - 1);
      setMessage(hostMessage, `Question ${payload.questionIndex}/${payload.totalQuestions} pushed to participants.`, "success");
    } catch (error) {
      setMessage(hostMessage, error?.message || "Could not push question.", "error");
    }
  }

  async function safeStopConnection() {
    if (!state.connection) {
      return;
    }

    try {
      await state.connection.stop();
    } catch {
      // ignore disconnect errors on logout
    }
  }

  async function resumeHostSessionAfterReconnect() {
    if (!state.connection || !state.activeSession?.sessionCode) {
      return;
    }

    try {
      const resumed = await state.connection.invoke("HostResumeSession", state.activeSession.sessionCode);
      if (!resumed) {
        setMessage(hostMessage, "Reconnected, but host session could not be resumed.", "error");
        return;
      }

      setMessage(hostMessage, `Reconnected and resumed session ${state.activeSession.sessionCode}.`, "success");
    } catch {
      setMessage(hostMessage, "Reconnected, but host session resume failed.", "error");
    }
  }

  function resetSessionState() {
    state.activeSession = null;
    state.activeQuestion = null;
    state.activeStats = null;
    state.activeQuestionIndex = -1;
    setDisabled(startQuestionButton, true);
    setDisabled(revealAnswerButton, true);
    setDisabled(previousQuestionButton, true);
    setDisabled(nextQuestionButton, true);
    setDisabled(endSessionButton, true);
    sessionCodePill.hidden = true;
    renderQuestion(null);
    renderStats(null);
    participantList.textContent = "";
  }

  function syncHostControlStates() {
    const hasSession = Boolean(state.activeSession?.sessionCode);
    const hasQuizQuestions = Boolean(state.activeQuiz?.questions?.length);
    const hasQuestion = Boolean(state.activeQuestion);
    const questionNo = Number(state.activeQuestion?.questionIndex || 0);
    const totalQuestions = Number(state.activeQuestion?.totalQuestions || 0);

    setDisabled(endSessionButton, !hasSession);
    setDisabled(startQuestionButton, !hasSession || !hasQuizQuestions || hasQuestion);
    setDisabled(revealAnswerButton, !hasQuestion || Boolean(state.activeQuestion?.isAnswerRevealed));
    setDisabled(previousQuestionButton, !hasQuestion || questionNo <= 1);
    setDisabled(nextQuestionButton, !hasQuestion || questionNo >= totalQuestions);
  }

  function hydrateActiveQuizFromSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(state.quizzes) || !state.quizzes.length) {
      return;
    }

    const snapshotQuizId = String(snapshot.quizId || "").trim();
    const snapshotQuizTitle = String(snapshot.quizTitle || "").trim().toLowerCase();
    const matched = state.quizzes.find((quiz) =>
      (snapshotQuizId && quiz.id === snapshotQuizId) ||
      (snapshotQuizTitle && String(quiz.label || "").trim().toLowerCase() === snapshotQuizTitle)
    );

    if (matched) {
      state.activeQuiz = matched;
      hostQuizSelect.value = matched.id;
      return;
    }

    if (!state.activeQuiz) {
      state.activeQuiz = state.quizzes[0];
      hostQuizSelect.value = state.activeQuiz.id;
    }
  }

  function syncActiveQuizFromSelect() {
    const selectedId = String(hostQuizSelect?.value || "").trim();
    if (!selectedId || !Array.isArray(state.quizzes) || !state.quizzes.length) {
      return;
    }

    const matched = state.quizzes.find((quiz) => quiz.id === selectedId);
    if (matched) {
      state.activeQuiz = matched;
    }
  }

  function hydrateQuestionPosition(questionState) {
    if (!questionState) {
      state.activeQuestionIndex = -1;
      return;
    }

    const questionNo = Number(questionState.questionIndex || 0);
    if (questionNo > 0) {
      state.activeQuestionIndex = questionNo - 1;
    }
  }

  function renderSession(snapshot) {
    if (!snapshot?.sessionCode) {
      sessionCodePill.hidden = true;
      hostQuestionPanel.hidden = true;
      participantList.textContent = "";
      syncHostControlStates();
      return;
    }

    sessionCodePill.hidden = false;
    setText(sessionCodePill, `Session Code: ${snapshot.sessionCode}`);

    participantList.textContent = "";
    const participants = Array.isArray(snapshot.participants) ? snapshot.participants : [];

    if (!participants.length) {
      const empty = document.createElement("p");
      empty.className = "recent-result-meta";
      empty.textContent = "No participants joined yet.";
      participantList.appendChild(empty);
      renderStats(state.activeStats);
      syncHostControlStates();
      return;
    }

    participants.forEach((participant) => {
      const card = document.createElement("article");
      card.className = "recent-result-card";

      const name = document.createElement("h3");
      name.className = "recent-result-title";
      name.textContent = participant.displayName || "Participant";

      card.appendChild(name);
      participantList.appendChild(card);
    });

    renderStats(state.activeStats);
    syncHostControlStates();
  }

  function renderQuestion(questionState) {
    if (!questionState) {
      hostQuestionPanel.hidden = true;
      setText(hostMonitorTitle, "No active question");
      setText(hostQuestionTitle, "No active question");
      setText(hostQuestionText, "Create a session and start the first question.");
      renderHostMediaPreview(null);
      renderHostOptions([], []);
      syncHostControlStates();
      return;
    }

    hostQuestionPanel.hidden = false;
    const questionNo = Number(questionState.questionIndex || 0);
    const totalQuestions = Number(questionState.totalQuestions || 0);
    setText(hostMonitorTitle, `Current question: ${questionNo}/${totalQuestions}`);
    setText(hostQuestionTitle, `Question ${questionNo}/${totalQuestions}`);
    setText(hostQuestionText, questionState.questionText || "");
    renderHostMediaPreview(questionState);
    renderHostOptions(questionState.options || [], state.activeStats?.optionCounts || [], questionState);
    renderStats(state.activeStats);
    syncHostControlStates();
  }

  function renderStats(stats) {
    hostStatsList.textContent = "";

    const questionOptions = Array.isArray(state.activeQuestion?.options) ? state.activeQuestion.options : [];
    const counts = Array.isArray(stats?.optionCounts) ? stats.optionCounts : [];
    renderHostOptions(questionOptions, counts, state.activeQuestion);

    const totalResponses = stats?.totalResponses ?? 0;
    const participantCount = state.activeSession?.participantCount || 0;
    const questionIndex = Number(state.activeQuestion?.questionIndex || 0);
    const totalQuestions = Number(state.activeQuestion?.totalQuestions || 0);
    const hasActiveQuestion = !!state.activeQuestion && totalQuestions > 0 && questionIndex > 0;
    const isAnswerRevealed = Boolean(state.activeQuestion?.isAnswerRevealed);
    const correctOptionIndex = Number(state.activeQuestion?.correctOptionIndex ?? -1);
    const correctCount = correctOptionIndex >= 0 ? Number(counts[correctOptionIndex] ?? 0) : 0;

    const statsCards = [
      { title: "Participants", value: String(participantCount) },
      { title: "Submitted", value: hasActiveQuestion ? `${totalResponses}/${participantCount}` : "—" },
      { title: "Correct", value: hasActiveQuestion && isAnswerRevealed ? `${correctCount}/${participantCount}` : "—" }
    ];

    statsCards.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "recent-result-card";

      const title = document.createElement("h3");
      title.className = "recent-result-title";
      title.textContent = entry.title;

      const value = document.createElement("p");
      value.className = "panel-value";
      value.textContent = entry.value;

      card.append(title, value);
      hostStatsList.appendChild(card);
    });
  }

  function renderHostOptions(options, counts, questionState = null) {
    if (!hostOptionList) {
      return;
    }

    hostOptionList.textContent = "";
    if (!Array.isArray(options) || !options.length) {
      return;
    }

    options.forEach((optionText, index) => {
      const card = document.createElement("article");
      card.className = "quiz-option-button";
      if (questionState?.isAnswerRevealed && index === Number(questionState.correctOptionIndex ?? -1)) {
        card.classList.add("is-correct");
      }

      const heading = document.createElement("div");
      heading.className = "recent-result-heading";

      const title = document.createElement("strong");
      title.textContent = `${String.fromCharCode(65 + index)}. ${optionText}`;

      const score = document.createElement("span");
      score.className = "recent-result-score";
      score.textContent = String(counts[index] ?? 0);

      heading.append(title, score);
      card.appendChild(heading);
      hostOptionList.appendChild(card);
    });
  }

  function renderHostMediaPreview(questionState) {
    if (!hostMediaPreview) {
      return;
    }

    hostMediaPreview.textContent = "";
    if (!questionState) {
      hostMediaPreview.textContent = "No media for this question yet.";
      return;
    }

    const mediaType = (questionState.mediaType || "").trim().toLowerCase();
    const mediaUrl = (questionState.mediaUrl || "").trim();
    const mediaPrompt = (questionState.mediaPrompt || "").trim();

    if (!mediaUrl) {
      hostMediaPreview.textContent = mediaPrompt || "No media URL provided for this question.";
      return;
    }

    const youtubeEmbedUrl = toYouTubeEmbedUrl(mediaUrl);
    if (youtubeEmbedUrl) {
      const iframe = document.createElement("iframe");
      iframe.className = "admin-media-preview-iframe";
      iframe.src = youtubeEmbedUrl;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      hostMediaPreview.appendChild(iframe);
      return;
    }

    if (mediaType === "image") {
      const img = document.createElement("img");
      img.className = "admin-media-preview-image";
      img.src = mediaUrl;
      img.alt = "Question media image";
      hostMediaPreview.appendChild(img);
      return;
    }

    if (mediaType === "audio") {
      const audio = document.createElement("audio");
      audio.className = "admin-media-preview-player";
      audio.src = mediaUrl;
      audio.controls = true;
      hostMediaPreview.appendChild(audio);
      return;
    }

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.className = "admin-media-preview-player";
      video.src = mediaUrl;
      video.controls = true;
      hostMediaPreview.appendChild(video);
      return;
    }

    const link = document.createElement("a");
    link.href = mediaUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = mediaPrompt || "Open media";
    hostMediaPreview.appendChild(link);
  }

  function toYouTubeEmbedUrl(url) {
    if (!url) {
      return "";
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }

      if (host.includes("youtube.com")) {
        if (parsed.pathname === "/watch") {
          const id = parsed.searchParams.get("v");
          return id ? `https://www.youtube.com/embed/${id}` : "";
        }

        if (parsed.pathname.startsWith("/embed/")) {
          return url;
        }
      }
    } catch {
      return "";
    }

    return "";
  }
}
