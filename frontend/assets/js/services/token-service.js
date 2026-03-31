import { AppConfig } from "../config.js";

export class TokenService {
  getToken() {
    return localStorage.getItem(AppConfig.storageKeys.token) || "";
  }

  setToken(token) {
    localStorage.setItem(AppConfig.storageKeys.token, token);
  }

  clearToken() {
    localStorage.removeItem(AppConfig.storageKeys.token);
  }

  getUser() {
    const rawUser = localStorage.getItem(AppConfig.storageKeys.user);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      this.clearUser();
      return null;
    }
  }

  setUser(user) {
    localStorage.setItem(AppConfig.storageKeys.user, JSON.stringify(user));
  }

  clearUser() {
    localStorage.removeItem(AppConfig.storageKeys.user);
  }

  clearSession() {
    this.clearToken();
    this.clearUser();
  }
}
