import { SessionController } from "../services/session-controller.js";
import { AppConfig } from "../config.js";
import { QuizApiService } from "../services/quiz-api.js";
import { byId, setMessage, setText } from "../utils/dom.js";

const sessionController = new SessionController();
const quizApi = new QuizApiService();
const session = sessionController.requireRole(AppConfig.roles.admin);

const fallbackPerformanceItems = [
  {
    email: "test@test.com",
    totalScore: "11/15",
    totalAttempts: 3,
    lastPlayed: "Mar 30, 2026 11:03 PM",
    quizStats: [
      { quizTitle: "40s Movie Quiz", bestScore: "4/5", completedAt: "Mar 30, 2026 11:03 PM" },
      { quizTitle: "50s Politics Quiz", bestScore: "3/5", completedAt: "Mar 28, 2026 2:45 PM" },
      { quizTitle: "60s Products Quiz", bestScore: "4/5", completedAt: "Mar 24, 2026 7:10 PM" }
    ]
  },
  {
    email: "john@john.com",
    totalScore: "9/15",
    totalAttempts: 3,
    lastPlayed: "Mar 29, 2026 9:20 PM",
    quizStats: [
      { quizTitle: "40s Movie Quiz", bestScore: "2/5", completedAt: "Mar 29, 2026 9:20 PM" },
      { quizTitle: "50s Politics Quiz", bestScore: "3/5", completedAt: "Mar 27, 2026 5:05 PM" },
      { quizTitle: "60s Products Quiz", bestScore: "4/5", completedAt: "Mar 20, 2026 8:40 PM" }
    ]
  }
];

if (session) {
  const currentAdminLabel = byId("currentAdminLabel");
  const quizCountValue = byId("quizCountValue");
  const categoryCountValue = byId("categoryCountValue");
  const adminMessage = byId("adminMessage");
  const quizAdminList = byId("quizAdminList");
  const newQuizButton = byId("newQuizButton");
  const previousQuizButton = byId("previousQuizButton");
  const nextQuizButton = byId("nextQuizButton");
  const adminCurrentUserValue = byId("adminCurrentUserValue");
  const adminTotalAttemptsValue = byId("adminTotalAttemptsValue");
  const adminTotalScoreValue = byId("adminTotalScoreValue");
  const adminLastPlayedValue = byId("adminLastPlayedValue");
  const adminScoreSummaryList = byId("adminScoreSummaryList");
  const previousUserButton = byId("previousUserButton");
  const nextUserButton = byId("nextUserButton");
  const logoutButton = byId("logoutButton");

  const questionModal = byId("questionModal");
  const closeQuestionModalButton = byId("closeQuestionModalButton");
  const questionModalTitle = byId("questionModalTitle");
  const questionModalEyebrow = byId("questionModalEyebrow");
  const questionEditorForm = byId("questionEditorForm");
  const questionTextInput = byId("questionTextInput");
  const questionMediaTypeInput = byId("questionMediaTypeInput");
  const questionMediaUrlInput = byId("questionMediaUrlInput");
  const questionMediaPromptInput = byId("questionMediaPromptInput");
  const questionMediaPreview = byId("questionMediaPreview");
  const optionAInput = byId("optionAInput");
  const optionBInput = byId("optionBInput");
  const optionCInput = byId("optionCInput");
  const optionDInput = byId("optionDInput");
  const correctAnswerInput = byId("correctAnswerInput");
  const questionPointsInput = byId("questionPointsInput");
  const deleteQuestionButton = byId("deleteQuestionButton");
  const quizModal = byId("quizModal");
  const closeQuizModalButton = byId("closeQuizModalButton");
  const quizModalTitle = byId("quizModalTitle");
  const quizMetaForm = byId("quizMetaForm");
  const quizModalCategorySelectRow = byId("quizModalCategorySelectRow");
  const quizModalCategoryCreateRow = byId("quizModalCategoryCreateRow");
  const quizModalCategoryCreateInput = byId("quizModalCategoryCreateInput");
  const quizModalCategoryCreateButton = byId("quizModalCategoryCreateButton");
  const quizModalCategoryCreateMessage = byId("quizModalCategoryCreateMessage");
  const quizModalQuestionsBlock = byId("quizModalQuestionsBlock");
  const quizModalQuestionsMessage = byId("quizModalQuestionsMessage");
  const quizModalQuestionRow = byId("quizModalQuestionRow");
  const deleteQuizButton = byId("deleteQuizButton");
  const confirmModal = byId("confirmModal");
  const confirmModalBackdrop = byId("confirmModalBackdrop");
  const confirmModalTitle = byId("confirmModalTitle");
  const confirmModalMessage = byId("confirmModalMessage");
  const confirmModalCancelButton = byId("confirmModalCancelButton");
  const confirmModalOkButton = byId("confirmModalOkButton");
  let quizzes = [];
  let userPerformanceItems = [];
  let activeQuizId = "";
  let activeQuestionIndex = 0;
  let activeUserIndex = 0;
  let activeQuizPageIndex = 0;
  const quizPageSize = 3;
  let editingQuizMetaId = null;
  let creatingCategoryFromNewButton = false;
  let usingPerformanceFallback = false;
  let pendingConfirmResolver = null;
  let questionModalReturnTarget = "library";

  setText(currentAdminLabel, session.user.email || "Signed in admin");
  initializeAdminDashboard();

  logoutButton.addEventListener("click", () => {
    sessionController.clearSession();
    window.location.href = AppConfig.pages.login;
  });

  previousUserButton.addEventListener("click", () => {
    if (!userPerformanceItems.length) {
      return;
    }

    activeUserIndex = activeUserIndex > 0 ? activeUserIndex - 1 : userPerformanceItems.length - 1;
    renderUserPerformance();
  });

  nextUserButton.addEventListener("click", () => {
    if (!userPerformanceItems.length) {
      return;
    }

    activeUserIndex = activeUserIndex < userPerformanceItems.length - 1 ? activeUserIndex + 1 : 0;
    renderUserPerformance();
  });

  previousQuizButton.addEventListener("click", () => {
    const totalPages = Math.ceil(quizzes.length / quizPageSize);
    activeQuizPageIndex = activeQuizPageIndex > 0 ? activeQuizPageIndex - 1 : Math.max(totalPages - 1, 0);
    renderQuizLibrary();
  });

  nextQuizButton.addEventListener("click", () => {
    const totalPages = Math.ceil(quizzes.length / quizPageSize);
    activeQuizPageIndex = activeQuizPageIndex < totalPages - 1 ? activeQuizPageIndex + 1 : 0;
    renderQuizLibrary();
  });

  closeQuestionModalButton.addEventListener("click", handleQuestionModalCloseByUser);
  questionModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeQuestion === "true") {
      handleQuestionModalCloseByUser();
    }
  });

  closeQuizModalButton.addEventListener("click", closeQuizModal);
  quizModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeQuizEditor === "true") {
      closeQuizModal();
    }
  });

  quizMetaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
  });

  quizModalCategoryCreateButton.addEventListener("click", async () => {
    await submitCategoryFromInlineInput();
  });

  deleteQuizButton.addEventListener("click", async () => {
    await deleteActiveQuiz();
  });

  confirmModalBackdrop.addEventListener("click", () => resolveConfirmModal(false));
  confirmModalCancelButton.addEventListener("click", () => resolveConfirmModal(false));
  confirmModalOkButton.addEventListener("click", () => resolveConfirmModal(true));

  questionEditorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveQuestion();
  });
  questionMediaTypeInput.addEventListener("change", renderQuestionMediaPreview);
  questionMediaUrlInput.addEventListener("input", renderQuestionMediaPreview);
  questionMediaPromptInput.addEventListener("input", renderQuestionMediaPreview);

  deleteQuestionButton.addEventListener("click", async () => {
    await deleteQuestion();
  });

  newQuizButton.addEventListener("click", () => {
    openNewCategoryMode();
  });

  async function initializeAdminDashboard() {
    const results = await Promise.allSettled([loadAdminQuizzes(), loadUserPerformance()]);
    const quizServiceUnavailable = results[0].status === "rejected";
    const performanceServiceUnavailable = results[1].status === "rejected";
    const loadedEmptyQuizData = results[0].status === "fulfilled" && !quizzes.length;
    const loadedEmptyPerformanceData = results[1].status === "fulfilled" && !userPerformanceItems.length;

    if (performanceServiceUnavailable && !userPerformanceItems.length) {
      userPerformanceItems = structuredClone(fallbackPerformanceItems);
      usingPerformanceFallback = true;
    }

    if (!userPerformanceItems.length) {
      userPerformanceItems = structuredClone(fallbackPerformanceItems);
      usingPerformanceFallback = true;
    }

    activeQuizId = quizzes[0]?.id || "";
    updateSummary();
    renderQuizLibrary();
    renderUserPerformance();

    if (quizServiceUnavailable) {
      setMessage(adminMessage, "Could not load categories from the quiz service. Please check service and database connection.", "error");
    } else if (loadedEmptyQuizData) {
      setMessage(adminMessage, "No categories yet. Click New Category to start adding your first category.", "success");
    } else if (usingPerformanceFallback && (performanceServiceUnavailable || loadedEmptyPerformanceData)) {
      setMessage(adminMessage, "Quiz data loaded from the database. User Score Summary is currently showing fallback sample data.", "error");
    } else {
      setMessage(adminMessage, "Quiz management data loaded from the quiz service.", "success");
    }
  }

  async function loadAdminQuizzes() {
    const payload = await quizApi.getAdminQuizzes(session.token);
    const summaries = quizApi.normalizeQuizSummaries(payload);
    const detailPayloads = await Promise.all(summaries.map((quiz) => quizApi.getAdminQuiz(session.token, quiz.id)));
    quizzes = mergeQuizzesByCategory(detailPayloads.map((entry) => mapQuizDetail(quizApi.normalizeQuizDetail(entry))));
  }

  async function loadUserPerformance() {
    const results = [];
    let page = 1;
    let totalUsers = 0;

    do {
      const payload = await quizApi.getUserPerformance(session.token, { page, pageSize: 1 });
      const normalized = quizApi.normalizeUserPerformance(payload);
      totalUsers = normalized.totalUsers;
      results.push(...normalized.items);
      page += 1;
    } while (results.length < totalUsers);

    userPerformanceItems = results;
    usingPerformanceFallback = false;
  }

  function updateSummary() {
    setText(quizCountValue, String(quizzes.length));
    setText(categoryCountValue, String(new Set(quizzes.map((quiz) => quiz.category)).size));
  }

  function renderQuizLibrary() {
    quizAdminList.textContent = "";

    if (!quizzes.length) {
      previousQuizButton.hidden = true;
      nextQuizButton.hidden = true;
      return;
    }

    const startIndex = activeQuizPageIndex * quizPageSize;
    const visibleQuizzes = quizzes.slice(startIndex, startIndex + quizPageSize);

    for (const quiz of visibleQuizzes) {
      const card = document.createElement("article");
      card.className = "quiz-category-card admin-library-card";

      const content = document.createElement("div");
      content.className = "admin-library-content";

      const title = document.createElement("span");
      title.className = "quiz-category-title admin-quiz-title-button";
      title.textContent = quiz.category || quiz.title;
      title.tabIndex = 0;
      title.addEventListener("click", (event) => {
        event.stopPropagation();
        openQuizModal(quiz.id);
      });
      title.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openQuizModal(quiz.id);
        }
      });

      const meta = document.createElement("p");
      meta.className = "recent-result-meta";
      meta.textContent = `${quiz.category} • ${quiz.questions.length} questions`;

      const prompt = document.createElement("p");
      prompt.className = "recent-result-meta";
      prompt.textContent = "Click a question number to edit it, or press + to add a new question.";

      const questionRow = document.createElement("div");
      questionRow.className = "admin-question-row";

      quiz.questions.forEach((question, index) => {
        const questionButton = document.createElement("button");
        questionButton.type = "button";
        questionButton.className = "admin-question-chip";
        questionButton.textContent = `Q${index + 1}`;
        questionButton.addEventListener("click", (event) => {
          event.stopPropagation();
          openQuestionModal(quiz.id, index, { returnTo: "library" });
        });
        questionRow.appendChild(questionButton);
      });

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "admin-question-chip admin-add-chip";
      addButton.textContent = "+";
      addButton.addEventListener("click", (event) => {
        event.stopPropagation();
        addNewQuestion(quiz.id);
      });
      questionRow.appendChild(addButton);

      content.append(title, meta, prompt, questionRow);
      card.append(content);
      card.addEventListener("click", () => {
        openQuizModal(quiz.id);
      });
      quizAdminList.appendChild(card);
    }

    const hasMultiplePages = quizzes.length > quizPageSize;
    previousQuizButton.hidden = !hasMultiplePages;
    nextQuizButton.hidden = !hasMultiplePages;
  }

  function renderUserPerformance() {
    const user = userPerformanceItems[activeUserIndex];
    if (!user) {
      setText(adminCurrentUserValue, "No users yet");
      setText(adminTotalScoreValue, "0/0");
      setText(adminTotalAttemptsValue, "0");
      setText(adminLastPlayedValue, "--");
      adminScoreSummaryList.textContent = "";
      return;
    }

    setText(adminCurrentUserValue, user.email);
    setText(adminTotalScoreValue, user.totalScore);
    setText(adminTotalAttemptsValue, String(user.totalAttempts));
    setText(adminLastPlayedValue, user.lastPlayed);
    adminScoreSummaryList.textContent = "";

    for (const quiz of user.quizStats || []) {
      const item = document.createElement("article");
      item.className = "recent-result-card";

      const heading = document.createElement("div");
      heading.className = "recent-result-heading";

      const title = document.createElement("h3");
      title.className = "recent-result-title";
      title.textContent = quiz.quizTitle;

      const score = document.createElement("span");
      score.className = "recent-result-score";
      score.textContent = quiz.bestScore;

      const completedAt = document.createElement("p");
      completedAt.className = "recent-result-meta";
      completedAt.textContent = `Highest score recorded: ${quiz.completedAt}`;

      heading.append(title, score);
      item.append(heading, completedAt);
      adminScoreSummaryList.appendChild(item);
    }
  }

  function openQuestionModal(quizId, questionIndex, options = {}) {
    const quiz = quizzes.find((entry) => entry.id === quizId);
    if (!quiz) {
      return;
    }

    questionModalReturnTarget = options.returnTo === "quiz-modal" ? "quiz-modal" : "library";
    activeQuizId = quizId;
    activeQuestionIndex = questionIndex;
    const question = quiz.questions[questionIndex];

    setText(questionModalEyebrow, quiz.title);
    setText(questionModalTitle, `Question ${questionIndex + 1}`);
    questionTextInput.value = question.text;
    questionMediaTypeInput.value = question.mediaType;
    questionMediaUrlInput.value = question.mediaUrl || "";
    questionMediaPromptInput.value = question.mediaPrompt;
    optionAInput.value = question.options[0] || "";
    optionBInput.value = question.options[1] || "";
    optionCInput.value = question.options[2] || "";
    optionDInput.value = question.options[3] || "";
    correctAnswerInput.value = String(question.correctIndex || 0);
    questionPointsInput.value = String(Math.max(Number.parseInt(String(question.points ?? 1), 10) || 1, 1));
    renderQuestionMediaPreview();

    questionModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function isDraftQuestionId(questionId) {
    return typeof questionId === "string" && questionId.startsWith("draft-question-");
  }

  function closeQuestionModal() {
    const quiz = quizzes.find((entry) => entry.id === activeQuizId);
    if (quiz && activeQuestionIndex >= 0 && activeQuestionIndex < quiz.questions.length) {
      const activeQuestion = quiz.questions[activeQuestionIndex];
      if (activeQuestion && isDraftQuestionId(activeQuestion.id)) {
        quiz.questions.splice(activeQuestionIndex, 1);
        updateSummary();
        renderQuizLibrary();
      }
    }

    questionModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function handleQuestionModalCloseByUser() {
    const quiz = quizzes.find((entry) => entry.id === activeQuizId);
    closeQuestionModal();

    if (!quiz) {
      return;
    }

    if (questionModalReturnTarget === "quiz-modal") {
      openQuizModal(quiz.id);
    }
  }

  function openQuizModal(quizId, options = {}) {
    const quiz = quizzes.find((entry) => entry.id === quizId);
    if (!quiz) {
      return;
    }

    editingQuizMetaId = quiz.id;
    creatingCategoryFromNewButton = false;
    setText(quizModalTitle, quiz.category || quiz.title || "Quiz");
    quizModalCategorySelectRow.hidden = true;
    quizModalCategoryCreateRow.hidden = false;
    quizModalQuestionsBlock.hidden = false;
    deleteQuizButton.hidden = false;
    deleteQuizButton.disabled = false;
    quizModalCategoryCreateInput.value = quiz.category || quiz.title || "";
    setMessage(quizModalCategoryCreateMessage, "", "success");
    if (options.questionsMessage) {
      setMessage(quizModalQuestionsMessage, options.questionsMessage, "success");
    } else {
      setMessage(quizModalQuestionsMessage, "", "success");
    }
    quizModalCategoryCreateButton.textContent = "Rename Category";
    quizModalCategoryCreateButton.disabled = false;
    renderQuizModalQuestions(quiz);
    quizModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function openNewCategoryMode() {
    editingQuizMetaId = null;
    creatingCategoryFromNewButton = true;
    setText(quizModalTitle, "New Category");
    quizModalCategorySelectRow.hidden = true;
    quizModalCategoryCreateRow.hidden = false;
    quizModalQuestionsBlock.hidden = false;
    deleteQuizButton.hidden = false;
    deleteQuizButton.disabled = true;
    quizModalCategoryCreateInput.value = "";
    setMessage(quizModalCategoryCreateMessage, "", "success");
    setMessage(quizModalQuestionsMessage, "", "success");
    quizModalCategoryCreateButton.textContent = "Add Category";
    quizModalCategoryCreateButton.disabled = false;
    renderNewCategoryQuestionRow();
    quizModal.hidden = false;
    document.body.classList.add("modal-open");
    queueMicrotask(() => quizModalCategoryCreateInput.focus());
  }

  function renderNewCategoryQuestionRow() {
    quizModalQuestionRow.textContent = "";
    const addOnlyButton = document.createElement("button");
    addOnlyButton.type = "button";
    addOnlyButton.className = "admin-question-chip admin-add-chip";
    addOnlyButton.textContent = "+";
    addOnlyButton.addEventListener("click", () => {
      setMessage(adminMessage, "Please add the category first, then use + to add questions.", "error");
    });
    quizModalQuestionRow.appendChild(addOnlyButton);
  }

  function closeQuizModal() {
    quizModal.hidden = true;
    document.body.classList.remove("modal-open");
    editingQuizMetaId = null;
    creatingCategoryFromNewButton = false;
    setMessage(quizModalQuestionsMessage, "", "success");
  }

  function renderQuizModalQuestions(quiz) {
    quizModalQuestionRow.textContent = "";

    if (!quiz.questions.length) {
      const addOnlyButton = document.createElement("button");
      addOnlyButton.type = "button";
      addOnlyButton.className = "admin-question-chip admin-add-chip";
      addOnlyButton.textContent = "+";
      addOnlyButton.addEventListener("click", () => {
        addNewQuestion(quiz.id, true);
      });
      quizModalQuestionRow.appendChild(addOnlyButton);
      return;
    }

    quiz.questions.forEach((question, index) => {
      const questionButton = document.createElement("button");
      questionButton.type = "button";
      questionButton.className = "admin-question-chip";
      questionButton.textContent = `Q${index + 1}`;
      questionButton.addEventListener("click", () => {
        closeQuizModal();
        openQuestionModal(quiz.id, index, { returnTo: "quiz-modal" });
      });
      quizModalQuestionRow.appendChild(questionButton);
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "admin-question-chip admin-add-chip";
    addButton.textContent = "+";
    addButton.addEventListener("click", () => {
      addNewQuestion(quiz.id, true);
    });
    quizModalQuestionRow.appendChild(addButton);
  }

  async function deleteActiveQuiz() {
    if (creatingCategoryFromNewButton) {
      setMessage(adminMessage, "Please add the category first.", "error");
      return;
    }

    const quizIndex = quizzes.findIndex((entry) => entry.id === editingQuizMetaId);
    if (quizIndex < 0) {
      return;
    }

    const removedQuiz = quizzes[quizIndex];
    const categoryName = removedQuiz.category || removedQuiz.title || "this category";
    const shouldDelete = await showConfirmModal({
      title: `Delete category "${categoryName}"?`,
      message: "This will also delete all questions under this category."
    });
    if (!shouldDelete) {
      return;
    }

    try {
      await quizApi.deleteQuiz(session.token, removedQuiz.id);
    } catch (error) {
      setMessage(adminMessage, error.message || `${removedQuiz.title} was removed locally because the quiz service is unavailable.`, "error");
    }

    quizzes.splice(quizIndex, 1);
    if (!quizzes.length) {
      activeQuizPageIndex = 0;
    } else if (activeQuizPageIndex > Math.floor((quizzes.length - 1) / quizPageSize)) {
      activeQuizPageIndex = Math.floor((quizzes.length - 1) / quizPageSize);
    }

    updateSummary();
    renderQuizLibrary();
    closeQuizModal();
  }

  async function saveQuestion() {
    const quiz = quizzes.find((entry) => entry.id === activeQuizId);
    if (!quiz) {
      return;
    }

    const question = quiz.questions[activeQuestionIndex];
    const questionNumber = activeQuestionIndex + 1;
    let questionResultMessage = "";
    const isDraftQuestion = isDraftQuestionId(question.id);
    const payload = {
      text: questionTextInput.value.trim(),
      mediaType: questionMediaTypeInput.value,
      mediaUrl: questionMediaUrlInput.value.trim(),
      mediaPrompt: questionMediaPromptInput.value.trim(),
      options: [
        optionAInput.value.trim(),
        optionBInput.value.trim(),
        optionCInput.value.trim(),
        optionDInput.value.trim()
      ],
      correctOptionIndex: Number.parseInt(correctAnswerInput.value, 10) || 0,
      points: Math.max(Number.parseInt(questionPointsInput.value, 10) || 1, 1)
    };

    if (isDraftQuestion) {
      try {
        const response = await quizApi.createQuestion(session.token, quiz.id, payload);
        quiz.questions[activeQuestionIndex] = mapQuestion(question.id, response);
        questionResultMessage = `${quiz.title} question ${questionNumber} saved.`;
      } catch (error) {
        setMessage(adminMessage, error.message || "Failed to save question. Please try again.", "error");
        return;
      }
    } else {
      try {
        const response = await quizApi.updateQuestion(session.token, question.id, payload);
        quiz.questions[activeQuestionIndex] = mapQuestion(quiz.questions[activeQuestionIndex].id, response);
        questionResultMessage = `${quiz.title} question ${questionNumber} saved.`;
      } catch (error) {
        quiz.questions[activeQuestionIndex] = {
          ...quiz.questions[activeQuestionIndex],
          text: payload.text,
          mediaType: payload.mediaType,
          mediaUrl: payload.mediaUrl,
          mediaPrompt: payload.mediaPrompt,
          options: [...payload.options],
          correctIndex: payload.correctOptionIndex,
          points: payload.points
        };
        setMessage(adminMessage, error.message || `${quiz.title} question ${activeQuestionIndex + 1} was saved locally.`, "error");
      }
    }

    renderQuizLibrary();
    closeQuestionModal();
    if (questionModalReturnTarget === "quiz-modal") {
      openQuizModal(quiz.id, { questionsMessage: questionResultMessage });
    } else {
      setMessage(adminMessage, questionResultMessage, "success");
    }
  }

  async function deleteQuestion() {
    const quiz = quizzes.find((entry) => entry.id === activeQuizId);
    if (!quiz || !quiz.questions.length) {
      return;
    }

    const question = quiz.questions[activeQuestionIndex];
    if (isDraftQuestionId(question.id)) {
      quiz.questions.splice(activeQuestionIndex, 1);
      updateSummary();
      renderQuizLibrary();
      closeQuestionModal();
      if (questionModalReturnTarget === "quiz-modal") {
        openQuizModal(quiz.id, { questionsMessage: "Draft question removed." });
      } else {
        setMessage(adminMessage, "Draft question removed.", "success");
      }
      return;
    }

    try {
      await quizApi.deleteQuestion(session.token, question.id);
    } catch (error) {
      setMessage(adminMessage, error.message || `${quiz.title} question was removed locally.`, "error");
    }

    quiz.questions.splice(activeQuestionIndex, 1);
    renderQuizLibrary();
    closeQuestionModal();
    if (questionModalReturnTarget === "quiz-modal") {
      openQuizModal(quiz.id, { questionsMessage: "Question deleted." });
    } else {
      setMessage(adminMessage, "Question deleted.", "success");
    }
  }

  async function addNewQuestion(quizId, reopenQuizEditor = false) {
    const quiz = quizzes.find((entry) => entry.id === quizId);
    if (!quiz) {
      return;
    }

    const payload = {
      text: "New question",
      mediaType: "Image",
      mediaUrl: "",
      mediaPrompt: "Add a media prompt here.",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndex: 0,
      points: 1
    };

    const createdQuestion = {
      id: `draft-question-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: payload.text,
      mediaType: payload.mediaType,
      mediaUrl: payload.mediaUrl,
      mediaPrompt: payload.mediaPrompt,
      options: [...payload.options],
      correctIndex: payload.correctOptionIndex,
      points: payload.points
    };

    quiz.questions.push(createdQuestion);

    if (reopenQuizEditor) {
      renderQuizModalQuestions(quiz);
    }

    closeQuizModal();
    openQuestionModal(quiz.id, quiz.questions.length - 1, {
      returnTo: reopenQuizEditor ? "quiz-modal" : "library"
    });
  }

  async function createQuiz() {
    const defaultCategory = getCategoryOptions()[0] || "General";
    const payload = {
      title: defaultCategory,
      category: defaultCategory,
      description: ""
    };

    let createdQuiz;

    try {
      const response = await quizApi.createQuiz(session.token, payload);
      createdQuiz = mapQuizDetail(quizApi.normalizeQuizDetail(response));
    } catch (error) {
      createdQuiz = {
        id: `local-quiz-${Date.now()}`,
        category: payload.category,
        title: payload.title,
        status: "Draft",
        description: payload.description,
        questions: []
      };
      setMessage(adminMessage, error.message || "New quiz was created locally because the quiz service is unavailable.", "error");
    }

    quizzes.unshift(createdQuiz);
    activeQuizPageIndex = 0;
    updateSummary();
    renderQuizLibrary();
    openQuizModal(createdQuiz.id);
  }

  function replaceQuiz(updatedQuiz) {
    const index = quizzes.findIndex((entry) => entry.id === updatedQuiz.id);
    if (index >= 0) {
      quizzes[index] = updatedQuiz;
    }
  }

  function mapQuizDetail(detail) {
    return {
      id: detail.id,
      title: detail.title || detail.category || "Quiz",
      category: detail.category || detail.title || "General",
      status: detail.status,
      description: detail.description || "",
      questions: detail.questions.map((question) => mapQuestion(question.id, question))
    };
  }

  function mergeQuizzesByCategory(items) {
    const groups = new Map();

    for (const quiz of items) {
      const key = (quiz.category || quiz.title || "").trim().toLowerCase();
      if (!key) {
        continue;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          ...quiz,
          title: quiz.category || quiz.title,
          category: quiz.category || quiz.title,
          questions: [...quiz.questions]
        });
        continue;
      }

      const existing = groups.get(key);
      existing.questions.push(...quiz.questions);
      if (!existing.description && quiz.description) {
        existing.description = quiz.description;
      }
    }

    for (const grouped of groups.values()) {
      grouped.questions = grouped.questions
        .slice()
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      grouped.status = grouped.questions.length > 0 ? "Published" : "Draft";
    }

    return [...groups.values()].sort((a, b) => a.category.localeCompare(b.category));
  }

  async function submitCategoryFromInlineInput() {
    const normalizedName = quizModalCategoryCreateInput.value.trim();
    if (!normalizedName) {
      setMessage(quizModalCategoryCreateMessage, "Category name cannot be empty.", "error");
      quizModalCategoryCreateInput.focus();
      return;
    }

    quizModalCategoryCreateButton.disabled = true;
    if (creatingCategoryFromNewButton) {
      setMessage(quizModalCategoryCreateMessage, "Adding category...", "success");

      try {
      await quizApi.createCategory(session.token, { name: normalizedName });
      await loadAdminQuizzes();
      updateSummary();
      renderQuizLibrary();
      } catch (error) {
        quizModalCategoryCreateButton.disabled = false;
        setMessage(quizModalCategoryCreateMessage, error.message || "Failed to add category.", "error");
        return;
      }

      quizModalCategoryCreateButton.disabled = false;
      setMessage(quizModalCategoryCreateMessage, `Category "${normalizedName}" added successfully.`, "success");
      setMessage(adminMessage, `Category "${normalizedName}" added.`, "success");

      const target = quizzes.find((entry) => (entry.category || "").trim().toLowerCase() === normalizedName.toLowerCase());
      if (target) {
        openQuizModal(target.id);
        return;
      }

      closeQuizModal();
      return;
    }

    const currentQuiz = quizzes.find((entry) => entry.id === editingQuizMetaId);
    if (!currentQuiz) {
      quizModalCategoryCreateButton.disabled = false;
      setMessage(quizModalCategoryCreateMessage, "Category not found.", "error");
      return;
    }

    const currentName = (currentQuiz.category || currentQuiz.title || "").trim();
    if (currentName.toLowerCase() === normalizedName.toLowerCase()) {
      quizModalCategoryCreateButton.disabled = false;
      setMessage(quizModalCategoryCreateMessage, "No changes to update.", "error");
      return;
    }

    setMessage(quizModalCategoryCreateMessage, "Updating category...", "success");
    try {
      await quizApi.updateQuiz(session.token, currentQuiz.id, {
        title: normalizedName,
        category: normalizedName,
        status: currentQuiz.status || "Draft",
        description: currentQuiz.description || ""
      });

      await loadAdminQuizzes();
      updateSummary();
      renderQuizLibrary();
    } catch (error) {
      quizModalCategoryCreateButton.disabled = false;
      setMessage(quizModalCategoryCreateMessage, error.message || "Failed to update category.", "error");
      return;
    }

    quizModalCategoryCreateButton.disabled = false;
    setMessage(quizModalCategoryCreateMessage, `Category renamed to "${normalizedName}".`, "success");
    setMessage(adminMessage, `Category "${currentName}" updated to "${normalizedName}".`, "success");

    const target = quizzes.find((entry) => (entry.category || "").trim().toLowerCase() === normalizedName.toLowerCase());
    if (target) {
      openQuizModal(target.id);
      return;
    }

    closeQuizModal();
  }

  function mapQuestion(existingId, payload) {
    return {
      id: payload.id || existingId,
      text: payload.text || "",
      mediaType: payload.mediaType || "Image",
      mediaUrl: payload.mediaUrl || "",
      mediaPrompt: payload.mediaPrompt || "",
      options: Array.isArray(payload.options)
        ? payload.options.map((option) => typeof option === "string" ? option : option.text || "")
        : [],
      correctIndex: payload.correctOptionIndex ?? 0,
      points: Math.max(Number.parseInt(String(payload.points ?? 1), 10) || 1, 1)
    };
  }

  function renderQuestionMediaPreview() {
    const mediaType = (questionMediaTypeInput.value || "").trim().toLowerCase();
    const mediaUrl = (questionMediaUrlInput.value || "").trim();
    const prompt = (questionMediaPromptInput.value || "").trim();

    questionMediaPreview.textContent = "";

    if (mediaType === "quote") {
      const quote = document.createElement("blockquote");
      quote.className = "admin-media-preview-quote";
      quote.textContent = prompt || "Quote preview will appear here.";
      questionMediaPreview.appendChild(quote);
      return;
    }

    if (!mediaUrl) {
      const empty = document.createElement("p");
      empty.className = "recent-result-meta";
      empty.textContent = "Enter a media URL to preview.";
      questionMediaPreview.appendChild(empty);
      return;
    }

    if (mediaType === "image") {
      const image = document.createElement("img");
      image.className = "admin-media-preview-image";
      image.src = mediaUrl;
      image.alt = "Image preview";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        questionMediaPreview.textContent = "";
        const error = document.createElement("p");
        error.className = "recent-result-meta";
        error.textContent = "Image preview failed. Please check the URL.";
        questionMediaPreview.appendChild(error);
      });
      questionMediaPreview.appendChild(image);
      return;
    }

    if (mediaType === "video") {
      const youtubeEmbedUrl = toYouTubeEmbedUrl(mediaUrl);
      if (youtubeEmbedUrl) {
        const frame = document.createElement("iframe");
        frame.className = "admin-media-preview-iframe";
        frame.src = youtubeEmbedUrl;
        frame.title = "YouTube preview";
        frame.loading = "lazy";
        frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allowFullscreen = true;
        questionMediaPreview.appendChild(frame);
        return;
      }

      const video = document.createElement("video");
      video.className = "admin-media-preview-player";
      video.src = mediaUrl;
      video.controls = true;
      video.preload = "metadata";
      questionMediaPreview.appendChild(video);
      return;
    }

    if (mediaType === "audio") {
      const audio = document.createElement("audio");
      audio.className = "admin-media-preview-player";
      audio.src = mediaUrl;
      audio.controls = true;
      audio.preload = "metadata";
      questionMediaPreview.appendChild(audio);
      return;
    }

    const link = document.createElement("a");
    link.href = mediaUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open media URL";
    questionMediaPreview.appendChild(link);
  }

  function toYouTubeEmbedUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("youtube.com")) {
        const v = parsed.searchParams.get("v");
        if (v) {
          return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
        }

        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && (parts[0] === "shorts" || parts[0] === "embed")) {
          return `https://www.youtube.com/embed/${encodeURIComponent(parts[1])}`;
        }
      }

      if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0];
        if (id) {
          return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
        }
      }
    } catch {
      return "";
    }

    return "";
  }

  function showConfirmModal({ title, message }) {
    setText(confirmModalTitle, title || "Confirm action");
    setText(confirmModalMessage, message || "");
    confirmModal.hidden = false;

    return new Promise((resolve) => {
      pendingConfirmResolver = resolve;
      queueMicrotask(() => confirmModalOkButton.focus());
    });
  }

  function resolveConfirmModal(result) {
    if (!pendingConfirmResolver) {
      confirmModal.hidden = true;
      return;
    }

    const resolve = pendingConfirmResolver;
    pendingConfirmResolver = null;
    confirmModal.hidden = true;
    resolve(Boolean(result));
  }
}
