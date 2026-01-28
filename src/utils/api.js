// Centralized API utility with token management and error handling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('swiftflow-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.token;
      } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
      }
    }
  }
  return null;
};

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    // Add a small buffer (5 minutes) to refresh token before it expires
    return payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

// Helper function to check if user is authenticated.
// We only check for the presence of a token here and rely on the backend
// to determine if it is still valid. This avoids issues with local clock
// drift or token parsing on the client side causing premature logouts.
const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

// Create headers with auth token
const createHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getAuthToken();
  if (isAuthenticated()) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Handle API responses and errors
const handleResponse = async (response) => {
  if (response.status === 401) {
    // Token expired or invalid - show user-friendly message and redirect
    if (typeof window !== 'undefined') {
      // Clear all auth data
      localStorage.removeItem('swiftflow-user');
      localStorage.removeItem('swiftflow-token');
      localStorage.removeItem('auth-token');
      
      // Show user-friendly message
      alert('Your session has expired. Please log in again to continue.');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorText = await response.text();
      // Try to parse as JSON for structured error messages
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle different content types appropriately
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    return response.text();
  }
};

// Main API utility function
const apiRequest = async (endpoint, options = {}) => {
  // Always attempt the request with whatever token we have.
  // If the backend reports 401, apiRequest's error handling will try a
  // token refresh and only then redirect to login if it still fails.

  const { method = 'GET', body, headers: customHeaders, params } = options;

  // Build URL with query parameters if provided
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const config = {
    method,
    headers: createHeaders(customHeaders),
  };

  if (body && typeof body === 'object') {
    config.body = JSON.stringify(body);
  } else if (body) {
    config.body = body;
  }

  try {
    const response = await fetch(url, config);
    return await handleResponse(response);
  } catch (error) {
    // Check if the error is due to authentication and try to refresh
    if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the request with the new token
        const retryConfig = {
          method,
          headers: createHeaders(customHeaders),
        };
        
        if (body && typeof body === 'object') {
          retryConfig.body = JSON.stringify(body);
        } else if (body) {
          retryConfig.body = body;
        }
        
        const retryResponse = await fetch(url, retryConfig);
        return await handleResponse(retryResponse);
      } else {
        // Redirect to login if refresh failed: clear stored auth and send to login page
        if (typeof window !== 'undefined') {
          localStorage.removeItem('swiftflow-user');
          localStorage.removeItem('swiftflow-token');
          localStorage.removeItem('auth-token');
          window.location.href = '/login';
        }
      }
    }
    // Re-throw the error for caller to handle
    throw error;
  }
};

// Attempt to refresh the token
const attemptTokenRefresh = async () => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (refreshResponse.ok) {
      const newAuthData = await refreshResponse.json();
      // Update the stored user data with the new token
      const userData = {
        id: newAuthData.id,
        roles: newAuthData.roles,
        token: newAuthData.token,
        username: newAuthData.username
      };
      localStorage.setItem('swiftflow-user', JSON.stringify(userData));
      return true;
    } else {
      // If refresh failed, clear the stored data
      localStorage.removeItem('swiftflow-user');
      localStorage.removeItem('swiftflow-token');
      localStorage.removeItem('auth-token');
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('swiftflow-user');
    localStorage.removeItem('swiftflow-token');
    localStorage.removeItem('auth-token');
    return false;
  }
};

// Specific API methods
const api = {
  get: (endpoint, params) => apiRequest(endpoint, { method: 'GET', params }),
  post: (endpoint, body, headers) => apiRequest(endpoint, { method: 'POST', body, headers }),
  put: (endpoint, body, headers) => apiRequest(endpoint, { method: 'PUT', body, headers }),
  delete: (endpoint, headers) => apiRequest(endpoint, { method: 'DELETE', headers }),
};

export default api;
export { getAuthToken, isTokenExpired, isAuthenticated, createHeaders, handleResponse, apiRequest };