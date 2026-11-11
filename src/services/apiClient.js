/**
 * API Client Adapter for Porch Light Frontend
 * Handles HTTP requests, HttpOnly credentials, token forwarding, and error normalization.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_STORAGE_KEY = 'porchlight_token';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.authToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  }

  setToken(token) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (e) {
        // Safe fallback for private browsing or quota limits
      }
    }
  }

  getToken() {
    if (!this.authToken && typeof window !== 'undefined') {
      try {
        this.authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch (e) {}
    }
    return this.authToken;
  }

  clearToken() {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (e) {}
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      Accept: 'application/json',
      ...options.headers,
    };

    // Attach Authorization header if token exists in memory or storage
    const currentToken = this.getToken();
    if (currentToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    // JSON serialization if body is object and not FormData
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const config = {
      ...options,
      headers,
      body,
      credentials: 'include', // Automatically passes HttpOnly SameSite session cookies
    };

    if (!config.signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      config.signal = AbortSignal.timeout(15000);
    }

    try {
      const response = await fetch(url, config);

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        const errorMessage =
          data?.error?.message || data?.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = data?.error?.code || 'API_ERROR';
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // Clean architectural error logging without spilling secrets
      console.warn(`[Porch Light API] ${options.method || 'GET'} ${endpoint} error:`, err.message);
      throw err;
    }
  }

  get(endpoint, params = {}, options = {}) {
    let qs = '';
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          if (Array.isArray(val)) {
            val.forEach((item) => searchParams.append(key, item));
          } else {
            searchParams.append(key, val);
          }
        }
      }
      const queryString = searchParams.toString();
      if (queryString) qs = `?${queryString}`;
    }
    return this.request(`${endpoint}${qs}`, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
export default api;

