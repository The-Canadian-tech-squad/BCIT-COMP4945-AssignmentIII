export const AppConfig = Object.freeze({
  authServiceBaseUrl: "http://localhost:5070",
  quizServiceBaseUrl: "http://localhost:5080",
  endpoints: Object.freeze({
    register: "/register",
    login: "/login",
    me: "/users/me",
    adminUsers: "/admin/users",
    categories: "/categories",
    quizzes: "/quizzes",
    quizAttempts: "/quiz-attempts",
    userQuizSummary: "/users/me/quiz-summary",
    adminQuizzes: "/admin/quizzes",
    adminQuestions: "/admin/questions",
    adminUserPerformance: "/admin/users/performance"
  }),
  storageKeys: Object.freeze({
    token: "user.token",
    user: "user.info"
  }),
  roles: Object.freeze({
    user: "user",
    admin: "admin"
  }),
  devSession: Object.freeze({
    enabled: false,
    testUserEmail: "student@example.com",
    testAdminEmail: "admin@example.com",
    placeholderToken: "frontend-dev-session"
  }),
  pages: Object.freeze({
    landing: "./index.html",
    login: "./login.html",
    register: "./register.html",
    userDashboard: "./user-dashboard.html",
    adminDashboard: "./admin-dashboard.html"
  })
});
