const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.metaspark.co.in';

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('swiftflow-token');
};

// Handle API errors
const handleApiError = async (response) => {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If we can't parse the error, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return response;
};

// Get all products
export const getAllProducts = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/product/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  await handleApiError(response);
  return await response.json();
};

// Create a new product
export const createProduct = async (productData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/product/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  });
  
  await handleApiError(response);
  return await response.json();
};

// Update an existing product
export const updateProduct = async (productId, productData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/product/updateProduct/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  });
  
  await handleApiError(response);
  return await response.json();
};

// Delete a product
export const deleteProduct = async (productId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/product/deleteProduct/${productId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  await handleApiError(response);
  return await response.json();
};

// Get a product by ID
export const getProductById = async (productId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/product/getProductById/${productId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  await handleApiError(response);
  return await response.json();
};
