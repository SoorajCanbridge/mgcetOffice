import { getAuthToken, removeAuthToken } from './token';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Centralized API client for making HTTP requests
 */
class ApiClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get default headers for API requests
   * @param {boolean} includeAuth - Whether to include authentication token
   * @param {boolean} isFormData - Whether the request is FormData (skip Content-Type)
   * @returns {Object} Headers object
   */
  getHeaders(includeAuth = true, isFormData = false) {
    const headers = {};

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response object
   * @returns {Promise} Parsed JSON data
   */
  async handleResponse(response) {
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (response.ok) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized - clear token and redirect
      if (response.status === 401) {
        removeAuthToken();
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional fetch options
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async get(endpoint, options = {}, requireAuth = true) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(requireAuth),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async post(endpoint, body = null, options = {}, requireAuth = false) {
    try {
      console.log(this.getHeaders(requireAuth));
      console.log(body);
      console.log(options);
      console.log(requireAuth);
      console.log(this.baseURL);
      console.log(endpoint);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(requireAuth),
        body: body ? JSON.stringify(body) : null,
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async put(endpoint, body = null, options = {}, requireAuth = true) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(requireAuth),
        body: body ? JSON.stringify(body) : null,
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async patch(endpoint, body = null, options = {}, requireAuth = true) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(requireAuth),
        body: body ? JSON.stringify(body) : null,
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional fetch options
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async delete(endpoint, options = {}, requireAuth = true) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(requireAuth),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload a file using FormData
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - FormData object containing the file
   * @param {boolean} requireAuth - Whether authentication is required
   * @returns {Promise} Response data
   */
  async uploadFile(endpoint, formData, requireAuth = true) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(requireAuth, true),
        body: formData,
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();

export default apiClient;

/**
 * Delete an uploaded file by path (e.g. "students/xyz.jpg").
 * Backend should implement DELETE /upload?path=<path> or similar.
 * Resolves even if delete fails (e.g. 404) so callers can still update/delete the record.
 */
export async function deleteUploadedFile(path) {
  if (!path || typeof path !== 'string') return;
  const normalized = path.replace(/^\//, '');
  try {
    await apiClient.delete(`/upload?path=${encodeURIComponent(normalized)}`, {}, true);
  } catch {
    // Ignore so we still proceed with PATCH/DELETE student
  }
}

// Export convenience methods
export const api = {
  get: (endpoint, options, requireAuth) => apiClient.get(endpoint, options, requireAuth),
  post: (endpoint, body, options, requireAuth) => apiClient.post(endpoint, body, options, requireAuth),
  put: (endpoint, body, options, requireAuth) => apiClient.put(endpoint, body, options, requireAuth),
  patch: (endpoint, body, options, requireAuth) => apiClient.patch(endpoint, body, options, requireAuth),
  delete: (endpoint, options, requireAuth) => apiClient.delete(endpoint, options, requireAuth),
  uploadFile: (endpoint, formData, requireAuth) => apiClient.uploadFile(endpoint, formData, requireAuth),
};

