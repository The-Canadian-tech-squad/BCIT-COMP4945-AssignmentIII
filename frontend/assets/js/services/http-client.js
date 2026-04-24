export class HttpClient {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type");
      const payload = await this.#readPayload(response);

      if (!response.ok) {
        const message = this.#extractMessage(payload) || `Request failed with status ${response.status}.`;
        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (e) {
      throw e;
    }
  }

  async #readPayload(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  #extractMessage(payload) {
    if (!payload) {
      return "";
    }

    if (typeof payload === "string") {
      return payload;
    }

    return payload.message || payload.error || "";
  }
}
