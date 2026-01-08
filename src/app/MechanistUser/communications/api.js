import api from '@/utils/api';

// Get all communications
export const getAllCommunications = async () => {
  return await api.get('/communication/getallcommunication');
};

// Add a new communication
export const addCommunication = async (communicationData) => {
  return await api.post('/communication/add-communication', {
    department: communicationData.department,
    message: communicationData.message,
    priority: communicationData.priority,
    isRead: "0" // Default to unread
  });
};

// Mark a communication as read
export const markAsRead = async (id, communicationData) => {
  // Extract the numeric ID from MSG-{id} format
  const numericId = id.toString().replace('MSG-', '');
  return await api.put(`/communication/marksAsRead/${numericId}`, {
    department: communicationData.department,
    message: communicationData.message,
    priority: communicationData.priority,
    isRead: "1" // Mark as read
  });
};