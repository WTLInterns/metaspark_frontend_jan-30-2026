const API_BASE_URL = 'https://api.metaspark.co.in/communication';

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
    const errorText = await response.text();
    throw new Error(errorText || 'An error occurred');
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

// Get all communications
export const getAllCommunications = async () => {
  const response = await fetch(`${API_BASE_URL}/getallcommunication`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse(response);
};

// Add a new communication
export const addCommunication = async (communicationData) => {
  const response = await fetch(`${API_BASE_URL}/add-communication`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({
      department: communicationData.department,
      message: communicationData.message,
      priority: communicationData.priority,
      isRead: "0" // Default to unread
    }),
  });
  return handleResponse(response);
};

// Mark a communication as read
export const markAsRead = async (id, communicationData) => {
  // Extract the numeric ID from MSG-{id} format
  const numericId = id.toString().replace('MSG-', '');
  const response = await fetch(`${API_BASE_URL}/marksAsRead/${numericId}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify({
      department: communicationData.department,
      message: communicationData.message,
      priority: communicationData.priority,
      isRead: "1" // Mark as read
    }),
  });
  return handleResponse(response);
};