const API_BASE_URL = 'https://api.metaspark.co.in/order';

// Helper function to get auth token (if needed)
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('swiftflow-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.token; // Adjust based on how token is stored
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }
  return null;
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Get the response body as text first
    const responseBody = await response.text();
    
    // Try to parse as JSON
    try {
      const errorData = JSON.parse(responseBody);
      throw new Error(errorData.message || 'An error occurred');
    } catch (jsonError) {
      // If JSON parsing fails, use the raw text response or default message
      throw new Error(responseBody || 'An error occurred');
    }
  }
  return response.json();
};

// Create headers with optional auth
const createHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Create a new order
export const createOrder = async (customerId, productId, orderData) => {
  const response = await fetch(`${API_BASE_URL}/create/${customerId}/${productId}`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
};

// Get order by ID
export const getOrderById = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/getById/${orderId}`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse(response);
};

// Get all orders
export const getAllOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/getAll`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse(response);
};

// Delete order by ID (Admin only)
export const deleteOrder = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/delete/${orderId}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });

  if (response.status === 204) return;
  return handleResponse(response);
};
