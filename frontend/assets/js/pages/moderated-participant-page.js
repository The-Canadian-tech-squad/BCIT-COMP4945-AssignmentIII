import { AppConfig } from "../config.js";
import { byId, setDisabled, setMessage, setText } from "../utils/dom.js";
import { SessionController } from "../services/session-controller.js";

const sessionController = new SessionController();
const session = sessionController.requireRole();

if (session) {
  const participantUserLabel = byId("participantUserLabel");
  const participantLogoutButton = byId("participantLogoutButton");
  const sessionCodeInput = byId("sessionCodeInput");
  const displayNameInput = byId("displayNameInput");
  const joinSessionButton = byId("joinSessionButton");
  const participantMessage = byId("participantMessage");
  const joinedSessionPill = byId("joinedSessionPill");
  const participantQuestionTitle = byId("participantQuestionTitle");
  const participantQuestionText = byId("participantQuestionText");
  const participantMediaPreview = byId("participantMediaPreview");
  const participantOptionsList = byId("participantOptionsList");

  const state = {
    connection: null,
    joinedSessionCode: "",
    currentQuestion: null,
    submittedOptionIndex: null,
    participantCount: 0
  };

  setText(participantUserLabel, session.user?.email || "Participant");
  displayNameInput.value = defaultDisplayName();
  void ensureConnection();

  joinSessionButton.addEventListener("click", async () => {
    await joinSession();
  });

  sessionCodeInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await joinSession();
    }
  });

  participantLogoutButton.addEventListener("click", async () => {
    await safeStopConnection();
    sessionController.clearSession();
    window.location.href = AppConfig.pages.login;
  });

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
        accessTokenFactory: () => session.token
      })
      .withAutomaticReconnect()
      .build();

    state.connection.on("SessionUpdated", (snapshot) => {
      if (!snapshot?.sessionCode) {
        return;
      }

      if (!state.joinedSessionCode || snapshot.sessionCode === state.joinedSessionCode) {
        state.joinedSessionCode = snapshot.sessionCode;
        state.participantCount = Number(snapshot.participantCount || 0);
        joinedSessionPill.hidden = false;
        setText(joinedSessionPill, `Session: ${snapshot.sessionCode}`);
      }
    });

    state.connection.on("QuestionChanged", (questionState) => {
      if (!state.joinedSessionCode) {
        return;
      }

      const previousQuestionId = state.currentQuestion?.questionId || "";
      const nextQuestionId = questionState?.questionId || "";
      const isSameQuestion = !!previousQuestionId && previousQuestionId === nextQuestionId;

      state.currentQuestion = questionState;
      if (!isSameQuestion) {
        state.submittedOptionIndex = null;
      }
      renderQuestion(questionState);
      if (isSameQuestion && questionState?.isAnswerRevealed) {
        setMessage(participantMessage, "Answer revealed by host.", "success");
      } else {
        setMessage(participantMessage, "New question received.", "success");
      }
    });

    state.connection.on("AnswerStatsUpdated", (stats) => {
      if (!state.joinedSessionCode || stats?.sessionCode !== state.joinedSessionCode) {
        return;
      }
    });

    state.connection.on("SessionClosed", (message) => {
      setMessage(participantMessage, message || "Session closed by host.", "error");
      setDisabled(joinSessionButton, false);
      participantOptionsList.textContent = "";
      state.currentQuestion = null;
      state.submittedOptionIndex = null;
      state.participantCount = 0;
      state.joinedSessionCode = "";
      joinedSessionPill.hidden = true;
      setText(participantQuestionTitle, "No active question");
      setText(participantQuestionText, "Join a session and wait for the host to push a question.");
      renderMediaPreview(null);
    });

    state.connection.onreconnecting(() => {
      setMessage(participantMessage, "Connection lost. Reconnecting...", "error");
    });

    state.connection.onreconnected(() => {
      if (!state.joinedSessionCode) {
        setMessage(participantMessage, "Reconnected.", "success");
        return;
      }

      void rejoinAfterReconnect();
    });

    state.connection.onclose(() => {
      if (state.joinedSessionCode) {
        setMessage(participantMessage, "Disconnected from moderated session.", "error");
      }
    });

    await state.connection.start();
  }

  async function joinSession() {
    const sessionCode = (sessionCodeInput.value || "").trim().toUpperCase();
    const displayName = (displayNameInput.value || "").trim();

    if (!sessionCode) {
      setMessage(participantMessage, "Please enter a session code.", "error");
      return;
    }

    if (!displayName) {
      setMessage(participantMessage, "Please enter your display name.", "error");
      return;
    }

    try {
      await ensureConnection();
      const joined = await state.connection.invoke("JoinSessionAsParticipant", sessionCode, displayName);
      if (!joined) {
        throw new Error("Invalid session code or host is offline.");
      }

      state.joinedSessionCode = sessionCode;
      joinedSessionPill.hidden = false;
      setText(joinedSessionPill, `Session: ${sessionCode}`);
      setDisabled(joinSessionButton, true);
      setMessage(participantMessage, `Joined session ${sessionCode}. Waiting for host question...`, "success");
    } catch (error) {
      setMessage(participantMessage, error?.message || "Could not join session.", "error");
    }
  }

  function renderQuestion(questionState) {
    participantOptionsList.textContent = "";

    if (!questionState) {
      setText(participantQuestionTitle, "No active question");
      setText(participantQuestionText, "Wait for the host to start a question.");
      renderMediaPreview(null);
      return;
    }

    const questionNo = Number(questionState.questionIndex || 0);
    const totalQuestions = Number(questionState.totalQuestions || 0);
    setText(participantQuestionTitle, `Question ${questionNo}/${totalQuestions}`);
    setText(participantQuestionText, questionState.questionText || "");
    renderMediaPreview(questionState);

    const options = Array.isArray(questionState.options) ? questionState.options : [];
    if (!options.length) {
      setMessage(participantMessage, "This question has no options.", "error");
      return;
    }

    options.forEach((text, optionIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option-button";
      button.textContent = `${String.fromCharCode(65 + optionIndex)}. ${text}`;
      button.addEventListener("click", async () => {
        await submitAnswer(optionIndex, button);
      });

      const hasSubmitted = state.submittedOptionIndex !== null;
      if (hasSubmitted && optionIndex === state.submittedOptionIndex) {
        button.classList.add("is-selected");
      }

      const correctOptionIndex = Number(questionState.correctOptionIndex ?? -1);
      const answerRevealed = Boolean(questionState.isAnswerRevealed);
      if (answerRevealed && optionIndex === correctOptionIndex) {
        button.classList.add("is-correct");
      }

      if (answerRevealed && hasSubmitted && state.submittedOptionIndex !== correctOptionIndex && optionIndex === state.submittedOptionIndex) {
        button.classList.add("is-wrong");
      }

      if (hasSubmitted || answerRevealed) {
        button.disabled = true;
      }

      participantOptionsList.appendChild(button);
    });
  }

  async function submitAnswer(optionIndex, clickedButton) {
    if (!state.joinedSessionCode || !state.currentQuestion) {
      return;
    }

    if (state.submittedOptionIndex !== null) {
      setMessage(participantMessage, "You already submitted an answer for this question.", "error");
      return;
    }

    try {
      const accepted = await state.connection.invoke("SubmitAnswer", state.joinedSessionCode, optionIndex);
      if (!accepted) {
        throw new Error("Answer not accepted. You may have already submitted.");
      }

      state.submittedOptionIndex = optionIndex;
      Array.from(participantOptionsList.querySelectorAll("button")).forEach((button) => {
        button.disabled = true;
        if (button === clickedButton) {
          button.classList.add("is-selected");
        }
      });

      setMessage(participantMessage, "Answer submitted.", "success");
    } catch (error) {
      setMessage(participantMessage, error?.message || "Could not submit answer.", "error");
    }
  }

  async function safeStopConnection() {
    if (!state.connection) {
      return;
    }

    try {
      await state.connection.stop();
    } catch {
      // ignore disconnect errors during logout
    }
  }

  function defaultDisplayName() {
    const email = session.user?.email || "";
    if (!email.includes("@")) {
      return "Participant";
    }

    const [name] = email.split("@");
    return name || "Participant";
  }

  function renderMediaPreview(questionState) {
    if (!participantMediaPreview) {
      return;
    }

    participantMediaPreview.hidden = true;
    participantMediaPreview.textContent = "";
    if (!questionState) {
      return;
    }

    const mediaType = (questionState.mediaType || "").trim().toLowerCase();
    const mediaUrl = (questionState.mediaUrl || "").trim();
    const mediaPrompt = (questionState.mediaPrompt || "").trim();

    if (!mediaUrl) {
      if (mediaPrompt) {
        participantMediaPreview.hidden = false;
        participantMediaPreview.textContent = mediaPrompt;
      }
      return;
    }

    const youtubeEmbedUrl = toYouTubeEmbedUrl(mediaUrl);
    if (youtubeEmbedUrl) {
      participantMediaPreview.hidden = false;
      const iframe = document.createElement("iframe");
      iframe.className = "admin-media-preview-iframe";
      iframe.src = youtubeEmbedUrl;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      participantMediaPreview.appendChild(iframe);
      return;
    }

    if (mediaType === "image") {
      participantMediaPreview.hidden = false;
      const img = document.createElement("img");
      img.className = "admin-media-preview-image";
      img.src = mediaUrl;
      img.alt = "Question media image";
      participantMediaPreview.appendChild(img);
      return;
    }

    if (mediaType === "audio") {
      participantMediaPreview.hidden = false;
      const audio = document.createElement("audio");
      audio.className = "admin-media-preview-player";
      audio.src = mediaUrl;
      audio.controls = true;
      participantMediaPreview.appendChild(audio);
      return;
    }

    if (mediaType === "video") {
      participantMediaPreview.hidden = false;
      const video = document.createElement("video");
      video.className = "admin-media-preview-player";
      video.src = mediaUrl;
      video.controls = true;
      participantMediaPreview.appendChild(video);
      return;
    }

    participantMediaPreview.hidden = false;
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = mediaPrompt || "Open media";
    participantMediaPreview.appendChild(link);
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

  async function rejoinAfterReconnect() {
    if (!state.connection || !state.joinedSessionCode) {
      return;
    }

    try {
      const rejoined = await state.connection.invoke(
        "JoinSessionAsParticipant",
        state.joinedSessionCode,
        (displayNameInput.value || "").trim() || defaultDisplayName()
      );

      if (!rejoined) {
        setDisabled(joinSessionButton, false);
        setMessage(participantMessage, "Reconnected, but session expired. Please join again.", "error");
        return;
      }

      setDisabled(joinSessionButton, true);
      setMessage(participantMessage, `Reconnected to session ${state.joinedSessionCode}.`, "success");
    } catch {
      setDisabled(joinSessionButton, false);
      setMessage(participantMessage, "Reconnected, but could not rejoin. Please click Join again.", "error");
    }
  }
}
