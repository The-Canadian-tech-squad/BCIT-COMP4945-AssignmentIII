import { SessionController } from "../services/session-controller.js";
import { UiStrings } from "../constants/strings.js";
import { AppConfig } from "../config.js";
import { QuizApiService } from "../services/quiz-api.js";
import { byId, setMessage, setText } from "../utils/dom.js";

const sessionController = new SessionController();
const quizApi = new QuizApiService();
const session = sessionController.requireRole(AppConfig.roles.user);

const fallbackQuizCategories = [
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "40s Movie Quiz",
    category: "40s Movies",
    questionCount: 5,
    score: "0/5"
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    title: "50s Politics Quiz",
    category: "50s Politics",
    questionCount: 5,
    score: "0/5"
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "60s Products Quiz",
    category: "60s Products",
    questionCount: 5,
    score: "0/5"
  }
];

const fallbackQuizDetails = new Map([
  ["44444444-4444-4444-4444-444444444444", {
    id: "44444444-4444-4444-4444-444444444444",
    title: "40s Movie Quiz",
    category: "40s Movies",
    questions: [
      {
        id: "44444444-4444-4444-4444-000000000001",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=BkL9l7qovsE",
        mediaText: "Video: a black-and-white detective scene fades into a smoky jazz club.",
        text: "Which 1942 film stars Humphrey Bogart and Ingrid Bergman?",
        options: ["Casablanca", "Rebecca", "Citizen Kane", "Notorious"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "44444444-4444-4444-4444-000000000002",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/wizard-of-oz.jpg",
        mediaText: "Image: Dorothy stands on a yellow brick road with Toto beside her.",
        text: "Which classic movie features the line 'There is no place like home'?",
        options: ["The Wizard of Oz", "Singin' in the Rain", "Fantasia", "Pinocchio"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "44444444-4444-4444-4444-000000000003",
        mediaLabel: "Audio",
        mediaType: "audio",
        mediaUrl: "assets/images/quiz/audio-40s.mp3",
        mediaText: "Audio: a dramatic voice says, 'Here's looking at you, kid.'",
        text: "That quote is most closely associated with which movie?",
        options: ["Casablanca", "Laura", "Double Indemnity", "The Maltese Falcon"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "44444444-4444-4444-4444-000000000004",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=5_EVHeNEIJY",
        mediaText: "Video: Gene Kelly dances joyfully through a rainy street.",
        text: "Who is the star performer most associated with Singin' in the Rain?",
        options: ["Gene Kelly", "Fred Astaire", "Jimmy Stewart", "Cary Grant"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "44444444-4444-4444-4444-000000000005",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/citizen-kane.jpg",
        mediaText: "Image: a sled rests in the snow after a life story is told.",
        text: "What is the famous sled name revealed in Citizen Kane?",
        options: ["Rosebud", "Silver", "Starlight", "Snowbell"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      }
    ]
  }],
  ["55555555-5555-5555-5555-555555555555", {
    id: "55555555-5555-5555-5555-555555555555",
    title: "50s Politics Quiz",
    category: "50s Politics",
    questions: [
      {
        id: "55555555-5555-5555-5555-000000000001",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=SwenOlpbvTA",
        mediaText: "Video: a presidential inauguration crowd gathers in Washington, D.C.",
        text: "Who became U.S. president in 1953?",
        options: ["Dwight D. Eisenhower", "Harry S. Truman", "John F. Kennedy", "Lyndon B. Johnson"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "55555555-5555-5555-5555-000000000002",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/eisenhower.jpg",
        mediaText: "Image: a smiling candidate in military uniform waves to supporters.",
        text: "Eisenhower was famous for serving as what before becoming president?",
        options: ["General", "Governor", "Judge", "Senator"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "55555555-5555-5555-5555-000000000003",
        mediaLabel: "Audio",
        mediaType: "audio",
        mediaUrl: "assets/images/quiz/audio-50s.mp3",
        mediaText: "Audio: a report discusses tensions between the United States and the Soviet Union.",
        text: "The 1950s political climate was heavily shaped by which global conflict?",
        options: ["The Cold War", "The Crimean War", "The Gulf War", "The Boer War"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "55555555-5555-5555-5555-000000000004",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=jdvGFVHYYTI",
        mediaText: "Video: a dramatic hearing room is filled with cameras and reporters.",
        text: "Which senator became strongly associated with anti-communist investigations in the 1950s?",
        options: ["Joseph McCarthy", "Hubert Humphrey", "Barry Goldwater", "George McGovern"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "55555555-5555-5555-5555-000000000005",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/us-capitol.jpg",
        mediaText: "Image: world leaders meet at a long table beneath bright lights.",
        text: "Which city is the capital of the United States, where major federal political events take place?",
        options: ["Washington, D.C.", "New York City", "Boston", "Philadelphia"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      }
    ]
  }],
  ["66666666-6666-6666-6666-666666666666", {
    id: "66666666-6666-6666-6666-666666666666",
    title: "60s Products Quiz",
    category: "60s Products",
    questions: [
      {
        id: "66666666-6666-6666-6666-000000000001",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=TWghCdIqedA",
        mediaText: "Video: a bright kitchen commercial shows a powdered orange drink being stirred.",
        text: "Which drink brand was famously promoted as the beverage of astronauts?",
        options: ["Tang", "Pepsi", "Ovaltine", "Fresca"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "66666666-6666-6666-6666-000000000002",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/barbie.jpg",
        mediaText: "Image: a fashion doll stands beside a bright pink convertible.",
        text: "Which doll became a huge cultural product in the 1960s?",
        options: ["Barbie", "Cabbage Patch Kid", "Beanie Baby", "Bratz"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "66666666-6666-6666-6666-000000000003",
        mediaLabel: "Audio",
        mediaType: "audio",
        mediaUrl: "assets/images/quiz/audio-60s.mp3",
        mediaText: "Audio: a cheerful jingle sells a new non-stick pan for modern kitchens.",
        text: "Which material became a popular selling point for cookware in this era?",
        options: ["Teflon", "Granite", "Copper Glass", "Cast Resin"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "66666666-6666-6666-6666-000000000004",
        mediaLabel: "Image",
        mediaType: "image",
        mediaUrl: "assets/images/quiz/pringles.jpg",
        mediaText: "Image: a tube-shaped can of stacked potato crisps sits on a grocery shelf.",
        text: "Which snack brand is known for selling potato crisps in a cylindrical can?",
        options: ["Pringles", "Doritos", "Cheetos", "Bugles"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      },
      {
        id: "66666666-6666-6666-6666-000000000005",
        mediaLabel: "Video",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=U4XknGqr3Bo",
        mediaText: "Video: a portable transistor radio rests beside a picnic blanket.",
        text: "Which portable product became a symbol of modern convenience in the 1960s?",
        options: ["Transistor radio", "Laptop computer", "DVD player", "Smartphone"],
        optionIds: ["a", "b", "c", "d"],
        correctIndex: 0
      }
    ]
  }]
]);

if (session) {
  const currentUserLabel = byId("currentUserLabel");
  const roleValue = byId("roleValue");
  const dashboardMessage = byId("dashboardMessage");
  const quizCategoryList = byId("quizCategoryList");
  const recentResultsList = byId("recentResultsList");
  const totalAttemptsValue = byId("totalAttemptsValue");
  const totalScoreValue = byId("totalScoreValue");
  const logoutButton = byId("logoutButton");
  const quizModal = byId("quizModal");
  const closeQuizButton = byId("closeQuizButton");
  const quizModalTitle = byId("quizModalTitle");
  const quizModalEyebrow = byId("quizModalEyebrow");
  const quizQuestionCounter = byId("quizQuestionCounter");
  const quizScorePill = byId("quizScorePill");
  const quizMediaBox = byId("quizMediaBox");
  const quizQuestionText = byId("quizQuestionText");
  const quizOptionsList = byId("quizOptionsList");
  const quizFeedbackMessage = byId("quizFeedbackMessage");
  const nextQuestionButton = byId("nextQuestionButton");
  const autoPlayButton = byId("autoPlayButton");
  const stopAutoPlayButton = byId("stopAutoPlayButton");

  let quizCategories = [];
  let recentResults = [];
  const quizDetailsById = new Map();

  let activeQuiz = null;
  let activeQuestionIndex = 0;
  let activeScore = 0;
  let selectedOptionIndex = null;
  let hasSubmittedCurrentQuestion = false;
  let activeSelections = [];
  let modalMode = "play";
  let autoPlayTimerId = null;
  let isAutoPlaying = false;

  const AUTO_PLAY_QUESTION_DELAY = 4000;
  const AUTO_PLAY_ANSWER_DELAY = 2000;

  setText(currentUserLabel, session.user.email || UiStrings.signedInUserLabel);
  setText(roleValue, session.user.role);
  setText(totalAttemptsValue, "0");
  setText(totalScoreValue, "0/0");
  renderQuizCategories();
  renderRecentResults();
  setMessage(dashboardMessage, "Choose a category to continue into quiz playback.", "success");

  initializeDashboard();
  const summaryRefreshInterval = window.setInterval(() => {
    void refreshDashboardFromServer(true);
  }, 10000);

  logoutButton.addEventListener("click", () => {
    window.clearInterval(summaryRefreshInterval);
    sessionController.clearSession();
    window.location.href = AppConfig.pages.login;
  });

  closeQuizButton.addEventListener("click", closeQuizModal);
  nextQuestionButton.addEventListener("click", goToNextQuestion);
  autoPlayButton.addEventListener("click", startAutoPlay);
  stopAutoPlayButton.addEventListener("click", stopAutoPlay);
  quizModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeQuiz === "true") {
      closeQuizModal();
    }
  });
  window.addEventListener("focus", () => {
    void refreshDashboardFromServer(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshDashboardFromServer(true);
    }
  });

  async function initializeDashboard() {
    const results = await Promise.allSettled([loadQuizCategories(), loadUserSummary()]);
    const categoryResult = results[0];
    const summaryResult = results[1];

    if (categoryResult.status === "rejected" && !quizCategories.length) {
      quizCategories = fallbackQuizCategories.map((quiz) => ({ ...quiz }));
      renderQuizCategories();
    }

    if (summaryResult.status === "rejected") {
      resetUserSummary();
      renderRecentResults();
    }

    if (categoryResult.status === "rejected" && summaryResult.status === "rejected") {
      setMessage(
        dashboardMessage,
        "Choose a category to continue into quiz playback.",
        "success"
      );
      return;
    }

    if (summaryResult.status === "rejected") {
      setMessage(
        dashboardMessage,
        "Choose a category to continue into quiz playback.",
        "success"
      );
      return;
    }

    setMessage(dashboardMessage, "Choose a category to continue into quiz playback.", "success");
  }

  async function refreshDashboardFromServer(isSilent = false) {
    const results = await Promise.allSettled([loadQuizCategories(), loadUserSummary()]);
    const categoryResult = results[0];
    const summaryResult = results[1];

    if (categoryResult.status === "rejected" && !quizCategories.length) {
      quizCategories = fallbackQuizCategories.map((quiz) => ({ ...quiz }));
      renderQuizCategories();
    }

    if (summaryResult.status === "rejected") {
      resetUserSummary();
      renderRecentResults();
    }

    if (!isSilent && categoryResult.status === "fulfilled" && summaryResult.status === "fulfilled") {
      setMessage(dashboardMessage, "Choose a category to continue into quiz playback.", "success");
    }
  }

  async function loadQuizCategories() {
    const categoriesPayload = await quizApi.getCategories(session.token);
    const categories = quizApi.normalizeCategories(categoriesPayload);
    const quizResponses = await Promise.all(
      categories.map((category) => quizApi.getQuizzesByCategory(session.token, category.id))
    );

    const flattenedQuizzes = quizResponses.flatMap((payload) => quizApi.normalizeQuizSummaries(payload));
    quizCategories = flattenedQuizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      score: quiz.bestScore || `0/${quiz.questionCount || 0}`,
      category: quiz.category,
      questionCount: quiz.questionCount,
      questions: []
    }));

    renderQuizCategories();
  }

  async function loadUserSummary() {
    const summaryPayload = await quizApi.getUserQuizSummary(session.token);
    const summary = quizApi.normalizeUserQuizSummary(summaryPayload);

    recentResults = summary.recentResults.map((result) => ({
      quizId: findQuizIdByTitle(result.quizTitle),
      title: result.quizTitle,
      score: result.score,
      time: result.completedAt,
      answers: []
    }));

    setText(totalAttemptsValue, String(summary.totalAttempts));
    setText(totalScoreValue, summary.totalScore);
    applyUserScoresToCategories();
    renderQuizCategories();
    renderRecentResults();
  }

  function resetUserSummary() {
    recentResults = [];
    setText(totalAttemptsValue, "0");
    setText(totalScoreValue, "0/0");
    applyUserScoresToCategories();
    renderQuizCategories();
  }

  function renderQuizCategories() {
    quizCategoryList.textContent = "";

    if (!quizCategories.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "recent-result-meta";
      emptyState.textContent = "No quizzes are available yet.";
      quizCategoryList.appendChild(emptyState);
      return;
    }

    for (const category of quizCategories) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-category-card";

      const title = document.createElement("span");
      title.className = "quiz-category-title";
      title.textContent = category.title;

      const score = document.createElement("span");
      score.className = "quiz-category-score";
      score.textContent = category.score;

      button.addEventListener("click", async () => {
        await openQuizModal(category.id);
      });

      button.append(title, score);
      quizCategoryList.appendChild(button);
    }
  }

  function renderRecentResults() {
    recentResultsList.textContent = "";

    if (!recentResults.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "recent-result-meta";
      emptyState.textContent = "No recent scores yet. Complete a quiz to create your first record.";
      recentResultsList.appendChild(emptyState);
      return;
    }

    for (const result of recentResults) {
      const item = document.createElement("article");
      item.className = "recent-result-card";

      const heading = document.createElement("div");
      heading.className = "recent-result-heading";

      const title = document.createElement("h3");
      title.className = "recent-result-title";
      title.textContent = result.title;

      const score = document.createElement("span");
      score.className = "recent-result-score";
      score.textContent = result.score;

      const meta = document.createElement("p");
      meta.className = "recent-result-meta";
      meta.textContent = result.time;

      heading.append(title, score);
      item.append(heading, meta);
      item.tabIndex = 0;
      item.classList.add("recent-result-button");
      item.addEventListener("click", async () => {
        await openReviewModal(result);
      });
      item.addEventListener("keydown", async (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          await openReviewModal(result);
        }
      });
      recentResultsList.appendChild(item);
    }
  }

  async function openQuizModal(quizId) {
    const quiz = await ensureQuizLoaded(quizId);
    if (!quiz) {
      return;
    }

    activeQuiz = quiz;
    activeQuestionIndex = 0;
    activeScore = 0;
    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = false;
    activeSelections = [];
    modalMode = "play";
    isAutoPlaying = false;
    updateAutoPlayUI();
    if (autoPlayButton) autoPlayButton.hidden = false;
    quizModal.hidden = false;
    document.body.classList.add("modal-open");
    renderActiveQuestion();
  }

  async function openReviewModal(result) {
    const quizId = result.quizId || findQuizIdByTitle(result.title);
    if (!quizId) {
      setMessage(dashboardMessage, "Unable to open this review record.", "error");
      return;
    }

    const quiz = await ensureQuizLoaded(quizId);
    if (!quiz) {
      return;
    }

    activeQuiz = quiz;
    activeQuestionIndex = 0;
    activeScore = Number.parseInt((result.score || "0/0").split("/")[0], 10) || 0;
    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = true;
    activeSelections = Array.isArray(result.answers) ? [...result.answers] : [];
    modalMode = "review";
    isAutoPlaying = false;
    updateAutoPlayUI();
    if (autoPlayButton) autoPlayButton.hidden = true;
    quizModal.hidden = false;
    document.body.classList.add("modal-open");
    renderActiveQuestion();
  }

  function closeQuizModal() {
    cancelAutoPlay();
    stopActiveMedia();
    quizModal.hidden = true;
    document.body.classList.remove("modal-open");
    activeQuiz = null;
    activeQuestionIndex = 0;
    activeScore = 0;
    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = false;
    activeSelections = [];
    modalMode = "play";
    quizFeedbackMessage.textContent = "";
    nextQuestionButton.disabled = true;
  }

  function stopActiveMedia() {
    const mediaContainer = quizMediaBox;
    if (!mediaContainer) return;
    for (const el of mediaContainer.querySelectorAll("audio, video")) {
      try { el.pause(); el.currentTime = 0; } catch { /* ignore */ }
    }
    for (const el of mediaContainer.querySelectorAll("iframe")) {
      try { el.src = ""; } catch { /* ignore */ }
    }
  }

  function toYouTubeEmbedUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : "";
      }
      if (host.includes("youtube.com")) {
        if (parsed.pathname === "/watch") {
          const id = parsed.searchParams.get("v");
          return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : "";
        }
        if (parsed.pathname.startsWith("/embed/")) {
          return url.includes("autoplay") ? url : url + (url.includes("?") ? "&" : "?") + "autoplay=1";
        }
      }
    } catch { return ""; }
    return "";
  }

  function renderQuizMedia(question) {
    if (!quizMediaBox) return;
    quizMediaBox.textContent = "";

    const mediaType = question.mediaType || "";
    const mediaUrl = question.mediaUrl || "";

    if (!mediaUrl) {
      quizMediaBox.textContent = question.mediaText || "No media for this question.";
      return;
    }

    const youtubeUrl = toYouTubeEmbedUrl(mediaUrl);
    if (youtubeUrl) {
      const iframe = document.createElement("iframe");
      iframe.className = "quiz-media-iframe";
      iframe.src = youtubeUrl;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      quizMediaBox.appendChild(iframe);
      return;
    }

    if (mediaType === "image") {
      const img = document.createElement("img");
      img.className = "quiz-media-image";
      img.src = mediaUrl;
      img.alt = question.mediaText || "Question image";
      quizMediaBox.appendChild(img);
      return;
    }

    if (mediaType === "audio") {
      if (question.mediaText) {
        const label = document.createElement("p");
        label.className = "quiz-media-prompt";
        label.textContent = question.mediaText;
        quizMediaBox.appendChild(label);
      }
      const audio = document.createElement("audio");
      audio.className = "quiz-media-player";
      audio.src = mediaUrl;
      audio.controls = true;
      audio.autoplay = true;
      quizMediaBox.appendChild(audio);
      return;
    }

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.className = "quiz-media-player";
      video.src = mediaUrl;
      video.controls = true;
      video.autoplay = true;
      quizMediaBox.appendChild(video);
      return;
    }

    if (mediaType === "gif" || mediaUrl.endsWith(".gif")) {
      const img = document.createElement("img");
      img.className = "quiz-media-image";
      img.src = mediaUrl;
      img.alt = question.mediaText || "Animated image";
      quizMediaBox.appendChild(img);
      return;
    }

    quizMediaBox.textContent = question.mediaText || "Unsupported media type.";
  }

  function renderActiveQuestion() {
    if (!activeQuiz) {
      return;
    }

    const question = activeQuiz.questions[activeQuestionIndex];
    if (!question) {
      return;
    }

    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = modalMode === "review";

    setText(quizModalTitle, activeQuiz.title);
    setText(quizModalEyebrow, modalMode === "review" ? "Answer Review" : "Quiz Playback");
    setText(quizQuestionCounter, `Question ${activeQuestionIndex + 1} / ${activeQuiz.questions.length}`);
    setText(quizScorePill, `Score ${activeScore} / ${activeQuiz.questions.length}`);
    setText(quizQuestionText, question.text);
    stopActiveMedia();
    renderQuizMedia(question);
    setMessage(
      quizFeedbackMessage,
      modalMode === "review"
        ? "Review the correct answer and move through the quiz."
        : "Select one answer, then continue to the next question."
    );
    nextQuestionButton.disabled = modalMode === "play";
    nextQuestionButton.textContent = activeQuestionIndex === activeQuiz.questions.length - 1
      ? (modalMode === "review" ? "Close review" : "Finish quiz")
      : (modalMode === "review" ? "Next answer" : "Next question");

    quizOptionsList.textContent = "";

    question.options.forEach((option, index) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "quiz-option-button";
      optionButton.textContent = option;
      optionButton.addEventListener("click", () => {
        handleOptionSelection(index, optionButton);
      });

      if (modalMode === "review") {
        optionButton.disabled = true;
        const savedAnswer = activeSelections[activeQuestionIndex];
        if (savedAnswer !== undefined && index === savedAnswer) {
          optionButton.classList.add("is-selected");
        }
        if (index === question.correctIndex) {
          optionButton.classList.add("is-correct");
        }
      }

      quizOptionsList.appendChild(optionButton);
    });
  }

  function handleOptionSelection(optionIndex, optionButton) {
    if (!activeQuiz || hasSubmittedCurrentQuestion || modalMode !== "play") {
      return;
    }

    selectedOptionIndex = optionIndex;
    hasSubmittedCurrentQuestion = true;
    activeSelections[activeQuestionIndex] = optionIndex;

    for (const button of quizOptionsList.querySelectorAll(".quiz-option-button")) {
      button.classList.remove("is-selected");
    }

    optionButton.classList.add("is-selected");

    if (optionIndex === activeQuiz.questions[activeQuestionIndex].correctIndex) {
      activeScore += 1;
      setText(quizScorePill, `Score ${activeScore} / ${activeQuiz.questions.length}`);
      setMessage(quizFeedbackMessage, "Answer saved. Move on to the next question.", "success");
    } else {
      setMessage(quizFeedbackMessage, "Answer saved. Try the next question.", "error");
    }

    nextQuestionButton.disabled = false;
  }

  async function goToNextQuestion() {
    if (!activeQuiz) {
      return;
    }

    if (activeQuestionIndex === activeQuiz.questions.length - 1) {
      if (modalMode === "play") {
        await saveCompletedQuiz();
      }
      closeQuizModal();
      return;
    }

    activeQuestionIndex += 1;
    renderActiveQuestion();
  }

  async function saveCompletedQuiz() {
    if (!activeQuiz) {
      return;
    }

    const scoreText = `${activeScore}/${activeQuiz.questions.length}`;
    const payload = {
      score: activeScore,
      totalQuestions: activeQuiz.questions.length,
      answers: activeQuiz.questions.map((question, index) => ({
        questionId: question.id,
        selectedOptionId: question.optionIds[activeSelections[index]] || "",
        isCorrect: activeSelections[index] === question.correctIndex
      }))
    };

    try {
      await quizApi.saveQuizAttempt(session.token, activeQuiz.id, payload);
      await loadUserSummary();
      setMessage(
        dashboardMessage,
        `${activeQuiz.title} completed with a score of ${scoreText}.`,
        "success"
      );
    } catch (error) {
      setMessage(
        dashboardMessage,
        error.message || "The quiz service could not save your result right now.",
        "error"
      );
    }
  }

  async function ensureQuizLoaded(quizId) {
    if (quizDetailsById.has(quizId)) {
      return quizDetailsById.get(quizId);
    }

    try {
      const payload = await quizApi.getQuiz(session.token, quizId);
      const detail = quizApi.normalizeQuizDetail(payload);
      const quiz = {
        id: detail.id,
        title: detail.title,
        category: detail.category,
        questions: detail.questions.map((question) => ({
          id: question.id,
          mediaLabel: question.mediaType,
          mediaType: (question.mediaType || "").trim().toLowerCase(),
          mediaUrl: (question.mediaUrl || "").trim(),
          mediaText: question.mediaPrompt || question.mediaUrl || `${question.mediaType} prompt unavailable.`,
          text: question.text,
          options: question.options.map((option) => option.text),
          optionIds: question.options.map((option) => option.id),
          correctIndex: question.correctOptionIndex ?? 0
        }))
      };

      quizDetailsById.set(quizId, quiz);
      return quiz;
    } catch (error) {
      const fallbackQuiz = fallbackQuizDetails.get(quizId) || null;
      if (fallbackQuiz) {
        quizDetailsById.set(quizId, fallbackQuiz);
        return fallbackQuiz;
      }

      setMessage(dashboardMessage, "Unable to open this quiz right now.", "error");
      return null;
    }
  }

  function applyUserScoresToCategories() {
    quizCategories = quizCategories.map((quiz) => {
      const matchingResult = recentResults.find((result) => result.title === quiz.title);
      return {
        ...quiz,
        score: matchingResult?.score || `0/${quiz.questionCount || 0}`
      };
    });
  }

  function startAutoPlay() {
    if (!activeQuiz || !activeQuiz.questions.length) {
      setMessage(quizFeedbackMessage, "No questions available for auto-play.", "error");
      return;
    }

    isAutoPlaying = true;
    activeQuestionIndex = 0;
    activeScore = 0;
    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = false;
    activeSelections = [];
    modalMode = "play";
    updateAutoPlayUI();
    renderActiveQuestion();
    setMessage(quizFeedbackMessage, "Auto-play started. Sit back and watch.", "success");
    scheduleAutoPlayReveal();
  }

  function stopAutoPlay() {
    cancelAutoPlay();
    setMessage(quizFeedbackMessage, "Auto-play stopped.", "success");
  }

  function cancelAutoPlay() {
    if (autoPlayTimerId !== null) {
      window.clearTimeout(autoPlayTimerId);
      autoPlayTimerId = null;
    }
    isAutoPlaying = false;
    updateAutoPlayUI();
  }

  function updateAutoPlayUI() {
    if (autoPlayButton) autoPlayButton.hidden = isAutoPlaying;
    if (stopAutoPlayButton) stopAutoPlayButton.hidden = !isAutoPlaying;
    if (nextQuestionButton) nextQuestionButton.hidden = isAutoPlaying;
  }

  function scheduleAutoPlayReveal() {
    if (!isAutoPlaying || !activeQuiz) return;
    autoPlayTimerId = window.setTimeout(() => {
      autoPlayRevealAnswer();
    }, AUTO_PLAY_QUESTION_DELAY);
  }

  function autoPlayRevealAnswer() {
    if (!isAutoPlaying || !activeQuiz) return;

    const question = activeQuiz.questions[activeQuestionIndex];
    if (!question) { cancelAutoPlay(); return; }

    const correctIdx = question.correctIndex;
    selectedOptionIndex = correctIdx;
    hasSubmittedCurrentQuestion = true;
    activeSelections[activeQuestionIndex] = correctIdx;
    activeScore += 1;

    const buttons = quizOptionsList.querySelectorAll(".quiz-option-button");
    buttons.forEach((btn, idx) => {
      if (idx === correctIdx) {
        btn.classList.add("is-selected", "is-correct");
      }
      btn.disabled = true;
    });

    setText(quizScorePill, `Score ${activeScore} / ${activeQuiz.questions.length}`);
    setMessage(quizFeedbackMessage, `Correct answer: ${question.options[correctIdx]}`, "success");

    autoPlayTimerId = window.setTimeout(() => {
      autoPlayAdvance();
    }, AUTO_PLAY_ANSWER_DELAY);
  }

  function autoPlayAdvance() {
    if (!isAutoPlaying || !activeQuiz) return;

    if (activeQuestionIndex >= activeQuiz.questions.length - 1) {
      cancelAutoPlay();
      setMessage(quizFeedbackMessage, "Auto-play finished.", "success");
      closeQuizModal();
      return;
    }

    activeQuestionIndex += 1;
    selectedOptionIndex = null;
    hasSubmittedCurrentQuestion = false;
    renderActiveQuestion();
    updateAutoPlayUI();
    scheduleAutoPlayReveal();
  }

  function findQuizIdByTitle(title) {
    return quizCategories.find((quiz) => quiz.title === title)?.id || "";
  }
}
