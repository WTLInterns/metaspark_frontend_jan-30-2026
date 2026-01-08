import api from '@/utils/api';

// For file uploads we need to handle it differently
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

// Create a new customer
export const createCustomer = async (customerData) => {
  return await api.post('/customer/create', {
    customerName: customerData.customerName,
    companyName: customerData.companyName,
    customerEmail: customerData.email,
    customerPhone: customerData.phoneNumber,
    gstNumber: customerData.gstNumber,
    primaryAddress: customerData.primaryAddress,
    billingAddress: customerData.primaryAddress, // Using primary as billing by default
    shippingAddress: customerData.primaryAddress, // Using primary as shipping by default
    status: 'Active',
  });
};

// Get all customers
export const getAllCustomers = async () => {
  return await api.get('/customer/all');
};

// Get all customers and products list
export const getAllCustomersAndProducts = async () => {
  return await api.get('/customer/all-list');
};

// Get customer by ID
export const getCustomerById = async (id) => {
  return await api.get(`/customer/get/${id}`);
};

// Update customer
export const updateCustomer = async (id, customerData) => {
  return await api.put(`/customer/update/${id}`, {
    customerName: customerData.customerName,
    companyName: customerData.companyName,
    customerEmail: customerData.email,
    customerPhone: customerData.phoneNumber,
    gstNumber: customerData.gstNumber,
    primaryAddress: customerData.primaryAddress,
    billingAddress: customerData.primaryAddress, // Using primary as billing by default
    shippingAddress: customerData.primaryAddress, // Using primary as shipping by default
    status: 'Active',
  });
};

// Delete customer
export const deleteCustomer = async (id) => {
  return await api.delete(`/customer/delete/${id}`);
};

// Upload customers from Excel
export const uploadCustomersExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/customer/upload-excel`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swiftflow-user');
      localStorage.removeItem('swiftflow-token');
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorText = await response.text();
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

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    return response.text();
  }
};