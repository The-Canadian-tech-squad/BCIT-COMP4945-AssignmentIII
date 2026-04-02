import { AppConfig } from "../config.js";
import {
  buildQuestionUpsertPayload,
  buildQuizAttemptPayload,
  buildQuizUpsertPayload,
  normalizeCategory,
  normalizeQuizAttemptSummary,
  normalizeQuizDetail,
  normalizeQuizSummary,
  normalizeQuizSummaryResponse,
  normalizeUserPerformancePage
} from "../schemas/quiz-schemas.js";
import { HttpClient } from "./http-client.js";

export class QuizApiService {
  constructor(httpClient = new HttpClient()) {
    this.httpClient = httpClient;
  }

  async getCategories(token) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.categories), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async createCategory(token, payload) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.categories), {
      method: "POST",
      headers: this.#authHeaders(token),
      body: JSON.stringify({
        name: payload?.name?.trim?.() || ""
      })
    });
  }

  async getQuizzesByCategory(token, categoryId) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.categories}/${categoryId}/quizzes`), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async getQuiz(token, quizId) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.quizzes}/${quizId}`), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async saveQuizAttempt(token, quizId, payload) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.quizzes}/${quizId}/attempts`), {
      method: "POST",
      headers: this.#authHeaders(token),
      body: JSON.stringify(buildQuizAttemptPayload(payload))
    });
  }

  async getUserQuizSummary(token) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.userQuizSummary), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async getAdminQuizzes(token) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.adminQuizzes), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async getAdminQuiz(token, quizId) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuizzes}/${quizId}`), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async createQuiz(token, payload) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.adminQuizzes), {
      method: "POST",
      headers: this.#authHeaders(token),
      body: JSON.stringify(buildQuizUpsertPayload(payload))
    });
  }

  async updateQuiz(token, quizId, payload) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuizzes}/${quizId}`), {
      method: "PUT",
      headers: this.#authHeaders(token),
      body: JSON.stringify(buildQuizUpsertPayload(payload))
    });
  }

  async deleteQuiz(token, quizId) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuizzes}/${quizId}`), {
      method: "DELETE",
      headers: this.#authHeaders(token)
    });
  }

  async createQuestion(token, quizId, payload) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuizzes}/${quizId}/questions`), {
      method: "POST",
      headers: this.#authHeaders(token),
      body: JSON.stringify(buildQuestionUpsertPayload(payload))
    });
  }

  async updateQuestion(token, questionId, payload) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuestions}/${questionId}`), {
      method: "PUT",
      headers: this.#authHeaders(token),
      body: JSON.stringify(buildQuestionUpsertPayload(payload))
    });
  }

  async deleteQuestion(token, questionId) {
    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminQuestions}/${questionId}`), {
      method: "DELETE",
      headers: this.#authHeaders(token)
    });
  }

  async getUserPerformance(token, { page = 1, pageSize = 1 } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize)
    });

    return this.httpClient.request(this.#buildUrl(`${AppConfig.endpoints.adminUserPerformance}?${query}`), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  normalizeCategories(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.categories || [];
    return rows.map((row) => normalizeCategory(row));
  }

  normalizeQuizSummaries(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.quizzes || [];
    return rows.map((row) => normalizeQuizSummary(row));
  }

  normalizeQuizDetail(payload) {
    return normalizeQuizDetail(payload);
  }
  normalizeQuizAttemptSummary(payload) {
    return normalizeQuizAttemptSummary(payload);
  }

  normalizeUserQuizSummary(payload) {
    return normalizeQuizSummaryResponse(payload);
  }

  normalizeUserPerformance(payload) {
    return normalizeUserPerformancePage(payload);
  }

  #buildUrl(path) {
    return `${AppConfig.quizServiceBaseUrl}${path}`;
  }

  #authHeaders(token) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }
}
