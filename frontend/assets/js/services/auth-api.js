import { AppConfig } from "../config.js";
import { HttpClient } from "./http-client.js";

export class AuthApiService {
  constructor(httpClient = new HttpClient()) {
    this.httpClient = httpClient;
  }

  async register({ email, password, role }) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.register), {
      method: "POST",
      headers: this.#jsonHeaders(),
      body: JSON.stringify({ email, password, role })
    });
  }

  async login({ email, password }) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.login), {
      method: "POST",
      headers: this.#jsonHeaders(),
      body: JSON.stringify({ email, password })
    });
  }

  async getCurrentUser(token) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.me), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  async getAdminUsers(token) {
    return this.httpClient.request(this.#buildUrl(AppConfig.endpoints.adminUsers), {
      method: "GET",
      headers: this.#authHeaders(token)
    });
  }

  normalizeLoginResult(payload, fallbackEmail = "") {
    return {
      token: payload.token || payload.jwt || payload.accessToken || "",
      user: {
        email:
          payload.user?.email ||
          payload.email ||
          fallbackEmail,
        role: (payload.user?.role || payload.role || AppConfig.roles.user).toLowerCase()
      }
    };
  }

  normalizeCurrentUser(payload) {
    return {
      email: payload.email || payload.user?.email || "",
      role: (payload.role || payload.user?.role || AppConfig.roles.user).toLowerCase()
    };
  }

  normalizeAdminUsers(payload) {
    const rows = Array.isArray(payload) ? payload : payload.users || [];

    return rows.map((row) => ({
      email: row.email || "",
      role: (row.role || AppConfig.roles.user).toLowerCase()
    }));
  }

  #buildUrl(path) {
    return `${AppConfig.authServiceBaseUrl}${path}`;
  }

  #jsonHeaders() {
    return {
      "Content-Type": "application/json"
    };
  }

  #authHeaders(token) {
    return {
      ...this.#jsonHeaders(),
      Authorization: `Bearer ${token}`
    };
  }
}
