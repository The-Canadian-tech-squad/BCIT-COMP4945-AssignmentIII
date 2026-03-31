import { SessionController } from "../services/session-controller.js";
import { AppConfig } from "../config.js";
import { QuizApiService } from "../services/quiz-api.js";
import { byId, setMessage, setText } from "../utils/dom.js";

const sessionController = new SessionController();
const quizApi = new QuizApiService();
const session = sessionController.requireRole(AppConfig.roles.admin);

const fallbackQuizzes = [
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "40s Movie Quiz",
    category: "40s Movies",
    status: "Published",
    description: "Classic black-and-white movie moments and stars.",
    questions: [
      { id: "44444444-4444-4444-4444-000000000001", text: "Which 1942 film stars Humphrey Bogart and Ingrid Bergman?", mediaType: "Video", mediaPrompt: "Black-and-white detective scene.", options: ["Casablanca", "Rebecca", "Citizen Kane", "Notorious"], correctIndex: 0 },
      { id: "44444444-4444-4444-4444-000000000002", text: "Which classic movie features the line 'There is no place like home'?", mediaType: "Image", mediaPrompt: "Dorothy on the yellow brick road.", options: ["The Wizard of Oz", "Singin' in the Rain", "Fantasia", "Pinocchio"], correctIndex: 0 },
      { id: "44444444-4444-4444-4444-000000000003", text: "That quote is most closely associated with which movie?", mediaType: "Audio", mediaPrompt: "Famous quote prompt.", options: ["Casablanca", "Laura", "Double Indemnity", "The Maltese Falcon"], correctIndex: 0 },
      { id: "44444444-4444-4444-4444-000000000004", text: "Who is the star performer most associated with Singin' in the Rain?", mediaType: "Video", mediaPrompt: "Dance scene in the rain.", options: ["Gene Kelly", "Fred Astaire", "Jimmy Stewart", "Cary Grant"], correctIndex: 0 },
      { id: "44444444-4444-4444-4444-000000000005", text: "What is the famous sled name revealed in Citizen Kane?", mediaType: "Image", mediaPrompt: "A sled in the snow.", options: ["Rosebud", "Silver", "Starlight", "Snowbell"], correctIndex: 0 }
    ]
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    title: "50s Politics Quiz",
    category: "50s Politics",
    status: "Draft",
    description: "Cold War headlines, presidents, and political moments.",
    questions: [
      { id: "55555555-5555-5555-5555-000000000001", text: "Who became U.S. president in 1953?", mediaType: "Video", mediaPrompt: "Inauguration crowd gathers in Washington.", options: ["Dwight D. Eisenhower", "Harry Truman", "John F. Kennedy", "Lyndon B. Johnson"], correctIndex: 0 },
      { id: "55555555-5555-5555-5555-000000000002", text: "Eisenhower was famous for serving as what before becoming president?", mediaType: "Image", mediaPrompt: "Candidate in military uniform.", options: ["General", "Governor", "Judge", "Senator"], correctIndex: 0 },
      { id: "55555555-5555-5555-5555-000000000003", text: "The 1950s were shaped by which global conflict?", mediaType: "Audio", mediaPrompt: "Radio bulletin about tensions.", options: ["The Cold War", "The Crimean War", "The Gulf War", "The Boer War"], correctIndex: 0 },
      { id: "55555555-5555-5555-5555-000000000004", text: "Which senator was associated with anti-communist investigations?", mediaType: "Video", mediaPrompt: "Televised hearing room.", options: ["Joseph McCarthy", "Hubert Humphrey", "Barry Goldwater", "George McGovern"], correctIndex: 0 },
      { id: "55555555-5555-5555-5555-000000000005", text: "What is the capital of the United States?", mediaType: "Quote", mediaPrompt: "Federal politics question.", options: ["Washington, D.C.", "New York City", "Boston", "Philadelphia"], correctIndex: 0 }
    ]
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    title: "60s Products Quiz",
    category: "60s Products",
    status: "Published",
    description: "Popular household brands, toys, and consumer products.",
    questions: [
      { id: "66666666-6666-6666-6666-000000000001", text: "Which drink was promoted as the beverage of astronauts?", mediaType: "Video", mediaPrompt: "Orange drink ad in a bright kitchen.", options: ["Tang", "Pepsi", "Ovaltine", "Fresca"], correctIndex: 0 },
      { id: "66666666-6666-6666-6666-000000000002", text: "Which doll became a huge 1960s product?", mediaType: "Image", mediaPrompt: "Pink convertible and fashion doll.", options: ["Barbie", "Cabbage Patch Kid", "Beanie Baby", "Bratz"], correctIndex: 0 },
      { id: "66666666-6666-6666-6666-000000000003", text: "Which cookware material became a popular selling point?", mediaType: "Audio", mediaPrompt: "Cheerful kitchen jingle.", options: ["Teflon", "Granite", "Copper Glass", "Cast Resin"], correctIndex: 0 },
      { id: "66666666-6666-6666-6666-000000000004", text: "Which snack brand sells potato crisps in a can?", mediaType: "Image", mediaPrompt: "Cylindrical can on a grocery shelf.", options: ["Pringles", "Doritos", "Cheetos", "Bugles"], correctIndex: 0 },
      { id: "66666666-6666-6666-6666-000000000005", text: "Which portable product symbolized convenience in the 1960s?", mediaType: "Video", mediaPrompt: "Portable radio beside a picnic blanket.", options: ["Transistor radio", "Laptop computer", "DVD player", "Smartphone"], correctIndex: 0 }
    ]
  }
];

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
  const questionMediaPromptInput = byId("questionMediaPromptInput");
  const optionAInput = byId("optionAInput");
  const optionBInput = byId("optionBInput");
  const optionCInput = byId("optionCInput");
  const optionDInput = byId("optionDInput");
  const correctAnswerInput = byId("correctAnswerInput");
  const deleteQuestionButton = byId("deleteQuestionButton");
  const quizModal = byId("quizModal");
  const closeQuizModalButton = byId("closeQuizModalButton");
  const quizModalTitle = byId("quizModalTitle");
  const quizMetaForm = byId("quizMetaForm");
  const quizModalNameInput = byId("quizModalNameInput");
  const quizModalCategoryInput = byId("quizModalCategoryInput");
  const quizModalStatusInput = byId("quizModalStatusInput");
  const quizModalQuestionRow = byId("quizModalQuestionRow");
  const publishQuizButton = byId("publishQuizButton");
  const deleteQuizButton = byId("deleteQuizButton");

  let quizzes = [];
  let userPerformanceItems = [];
  let activeQuizId = "";
  let activeQuestionIndex = 0;
  let activeUserIndex = 0;
  let activeQuizPageIndex = 0;
  const quizPageSize = 3;
  let editingQuizMetaId = null;
  let usingQuizFallback = false;
  let usingPerformanceFallback = false;

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

  closeQuestionModalButton.addEventListener("click", closeQuestionModal);
  questionModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeQuestion === "true") {
      closeQuestionModal();
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
    await saveQuizMeta();
  });

  publishQuizButton.addEventListener("click", async () => {
    quizModalStatusInput.value = "Published";
    await saveQuizMeta(true);
  });

  deleteQuizButton.addEventListener("click", async () => {
    await deleteActiveQuiz();
  });

  questionEditorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveQuestion();
  });

  deleteQuestionButton.addEventListener("click", async () => {
    await deleteQuestion();
  });

  newQuizButton.addEventListener("click", async () => {
    await createQuiz();
  });

  async function initializeAdminDashboard() {
    const results = await Promise.allSettled([loadAdminQuizzes(), loadUserPerformance()]);

    if (results[0].status === "rejected" && !quizzes.length) {
      quizzes = structuredClone(fallbackQuizzes);
      usingQuizFallback = true;
    }

    if (results[1].status === "rejected" && !userPerformanceItems.length) {
      userPerformanceItems = structuredClone(fallbackPerformanceItems);
      usingPerformanceFallback = true;
    }

    if (!quizzes.length) {
      quizzes = structuredClone(fallbackQuizzes);
      usingQuizFallback = true;
    }

    if (!userPerformanceItems.length) {
      userPerformanceItems = structuredClone(fallbackPerformanceItems);
      usingPerformanceFallback = true;
    }

    activeQuizId = quizzes[0]?.id || "";
    updateSummary();
    renderQuizLibrary();
    renderUserPerformance();

    if (usingQuizFallback || usingPerformanceFallback) {
      setMessage(adminMessage, "The live quiz service is unavailable, so the admin dashboard is using local fallback data.", "error");
    } else {
      setMessage(adminMessage, "Quiz management data loaded from the quiz service.", "success");
    }
  }

  async function loadAdminQuizzes() {
    const payload = await quizApi.getAdminQuizzes(session.token);
    const summaries = quizApi.normalizeQuizSummaries(payload);
    const detailPayloads = await Promise.all(summaries.map((quiz) => quizApi.getAdminQuiz(session.token, quiz.id)));
    quizzes = detailPayloads.map((entry) => mapQuizDetail(quizApi.normalizeQuizDetail(entry)));
    usingQuizFallback = false;
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
      const emptyState = document.createElement("p");
      emptyState.className = "recent-result-meta";
      emptyState.textContent = "No quizzes are available yet.";
      quizAdminList.appendChild(emptyState);
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
      title.textContent = quiz.title;
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
          openQuestionModal(quiz.id, index);
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

      const status = document.createElement("span");
      status.className = "quiz-category-score";
      status.textContent = quiz.status;

      card.append(content, status);
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

  function openQuestionModal(quizId, questionIndex) {
    const quiz = quizzes.find((entry) => entry.id === quizId);
    if (!quiz) {
      return;
    }

    activeQuizId = quizId;
    activeQuestionIndex = questionIndex;
    const question = quiz.questions[questionIndex];

    setText(questionModalEyebrow, quiz.title);
    setText(questionModalTitle, `Question ${questionIndex + 1}`);
    questionTextInput.value = question.text;
    questionMediaTypeInput.value = question.mediaType;
    questionMediaPromptInput.value = question.mediaPrompt;
    optionAInput.value = question.options[0] || "";
    optionBInput.value = question.options[1] || "";
    optionCInput.value = question.options[2] || "";
    optionDInput.value = question.options[3] || "";
    correctAnswerInput.value = String(question.correctIndex || 0);

    questionModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeQuestionModal() {
    questionModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openQuizModal(quizId) {
    const quiz = quizzes.find((entry) => entry.id === quizId);
    if (!quiz) {
      return;
    }

    editingQuizMetaId = quiz.id;
    setText(quizModalTitle, quiz.title);
    quizModalNameInput.value = quiz.title;
    quizModalCategoryInput.value = quiz.category;
    quizModalStatusInput.value = quiz.status;
    publishQuizButton.hidden = quiz.status === "Published";
    renderQuizModalQuestions(quiz);
    quizModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeQuizModal() {
    quizModal.hidden = true;
    document.body.classList.remove("modal-open");
    editingQuizMetaId = null;
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
        openQuestionModal(quiz.id, index);
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

  async function saveQuizMeta(forcePublish = false) {
    const quiz = quizzes.find((entry) => entry.id === editingQuizMetaId);
    if (!quiz) {
      return;
    }

    const payload = {
      title: quizModalNameInput.value.trim() || quiz.title,
      category: quizModalCategoryInput.value.trim() || quiz.category,
      status: forcePublish ? "Published" : quizModalStatusInput.value,
      description: quiz.description || ""
    };

    try {
      const response = await quizApi.updateQuiz(session.token, quiz.id, payload);
      const updated = mapQuizDetail(quizApi.normalizeQuizDetail(response));
      replaceQuiz(updated);
      usingQuizFallback = false;
      setMessage(adminMessage, `${updated.title} saved successfully.`, "success");
    } catch (error) {
      quiz.title = payload.title;
      quiz.category = payload.category;
      quiz.status = payload.status;
      setMessage(adminMessage, error.message || `${quiz.title} was updated locally because the quiz service is unavailable.`, "error");
    }

    updateSummary();
    renderQuizLibrary();
    closeQuizModal();
  }

  async function deleteActiveQuiz() {
    const quizIndex = quizzes.findIndex((entry) => entry.id === editingQuizMetaId);
    if (quizIndex < 0) {
      return;
    }

    const removedQuiz = quizzes[quizIndex];

    try {
      await quizApi.deleteQuiz(session.token, removedQuiz.id);
      usingQuizFallback = false;
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
    const payload = {
      text: questionTextInput.value.trim(),
      mediaType: questionMediaTypeInput.value,
      mediaUrl: "",
      mediaPrompt: questionMediaPromptInput.value.trim(),
      options: [
        optionAInput.value.trim(),
        optionBInput.value.trim(),
        optionCInput.value.trim(),
        optionDInput.value.trim()
      ],
      correctOptionIndex: Number.parseInt(correctAnswerInput.value, 10) || 0
    };

    try {
      const response = await quizApi.updateQuestion(session.token, question.id, payload);
      quiz.questions[activeQuestionIndex] = mapQuestion(quiz.questions[activeQuestionIndex].id, response);
      usingQuizFallback = false;
      setMessage(adminMessage, `${quiz.title} question ${activeQuestionIndex + 1} saved.`, "success");
    } catch (error) {
      quiz.questions[activeQuestionIndex] = {
        ...quiz.questions[activeQuestionIndex],
        text: payload.text,
        mediaType: payload.mediaType,
        mediaPrompt: payload.mediaPrompt,
        options: [...payload.options],
        correctIndex: payload.correctOptionIndex
      };
      setMessage(adminMessage, error.message || `${quiz.title} question ${activeQuestionIndex + 1} was saved locally.`, "error");
    }

    renderQuizLibrary();
    closeQuestionModal();
  }

  async function deleteQuestion() {
    const quiz = quizzes.find((entry) => entry.id === activeQuizId);
    if (!quiz || !quiz.questions.length) {
      return;
    }

    const question = quiz.questions[activeQuestionIndex];

    try {
      await quizApi.deleteQuestion(session.token, question.id);
      usingQuizFallback = false;
    } catch (error) {
      setMessage(adminMessage, error.message || `${quiz.title} question was removed locally.`, "error");
    }

    quiz.questions.splice(activeQuestionIndex, 1);
    renderQuizLibrary();

    if (!quiz.questions.length) {
      closeQuestionModal();
      openQuizModal(quiz.id);
      return;
    }

    const nextIndex = Math.min(activeQuestionIndex, quiz.questions.length - 1);
    closeQuestionModal();
    openQuestionModal(quiz.id, nextIndex);
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
      correctOptionIndex: 0
    };

    let createdQuestion;

    try {
      const response = await quizApi.createQuestion(session.token, quiz.id, payload);
      createdQuestion = mapQuestion(response.id, response);
      usingQuizFallback = false;
    } catch (error) {
      createdQuestion = {
        id: `local-question-${Date.now()}`,
        text: payload.text,
        mediaType: payload.mediaType,
        mediaPrompt: payload.mediaPrompt,
        options: [...payload.options],
        correctIndex: payload.correctOptionIndex
      };
      setMessage(adminMessage, error.message || `${quiz.title} question was created locally.`, "error");
    }

    quiz.questions.push(createdQuestion);
    updateSummary();
    renderQuizLibrary();

    if (reopenQuizEditor) {
      renderQuizModalQuestions(quiz);
    }

    closeQuizModal();
    openQuestionModal(quiz.id, quiz.questions.length - 1);
  }

  async function createQuiz() {
    const nextDecade = 40 + quizzes.length * 10;
    const payload = {
      title: `${nextDecade}s Movie Quiz`,
      category: `${nextDecade}s Movies`,
      status: "Draft",
      description: ""
    };

    let createdQuiz;

    try {
      const response = await quizApi.createQuiz(session.token, payload);
      createdQuiz = mapQuizDetail(quizApi.normalizeQuizDetail(response));
      usingQuizFallback = false;
    } catch (error) {
      createdQuiz = {
        id: `local-quiz-${Date.now()}`,
        title: payload.title,
        category: payload.category,
        status: payload.status,
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
      title: detail.title,
      category: detail.category,
      status: detail.status,
      description: detail.description || "",
      questions: detail.questions.map((question) => mapQuestion(question.id, question))
    };
  }

  function mapQuestion(existingId, payload) {
    return {
      id: payload.id || existingId,
      text: payload.text || "",
      mediaType: payload.mediaType || "Image",
      mediaPrompt: payload.mediaPrompt || "",
      options: Array.isArray(payload.options)
        ? payload.options.map((option) => typeof option === "string" ? option : option.text || "")
        : [],
      correctIndex: payload.correctOptionIndex ?? 0
    };
  }
}
