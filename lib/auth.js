import api from './api';
import { setAuthToken, getAuthToken, removeAuthToken } from './token';

// Re-export token functions for backward compatibility
export { setAuthToken, getAuthToken, removeAuthToken };

// API calls using centralized API service
export const registerUser = async (userData) => {
  try {
    const data = await api.post('/register', userData, {}, false);
    return data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const data = await api.post('/auth/login', credentials, {}, false);
    
    // Store token if provided
    if (data.token) {
      setAuthToken(data.token);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = () => {
  removeAuthToken();
};

export const getCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  try {
    const data = await api.get('/auth/me', {}, true);
    return data;
  } catch (error) {
    removeAuthToken();
    return null;
  }
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

