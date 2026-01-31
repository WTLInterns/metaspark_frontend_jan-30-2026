const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('swiftflow-token') : null;
};

const handleApiError = async (response) => {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return response;
};

export const getInventoryDashboard = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/dashboard`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);
  return await response.json();
};

export const createInwardEntry = async (data) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/inward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  await handleApiError(response);
  return true;
};

export const updateInwardEntry = async (id, data) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/inward/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  await handleApiError(response);
  return true;
};

export const deleteInwardEntry = async (id) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/inward/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);
  return true;
};

export const updateOutwardEntry = async (id, data) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/outward/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  await handleApiError(response);
  return true;
};

export const deleteOutwardEntry = async (id) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/outward/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);
  return true;
};

export const createOutwardEntry = async (data) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  await handleApiError(response);
  return true;
};

export const downloadInventoryReport = async (type = 'csv') => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/report?type=${type}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ext = type === 'excel' ? 'xlsx' : 'csv';
  link.download = `inventory-report.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getInventoryRemark = async (type) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/inventory/remark?type=${type}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);
  const data = await response.json();
  return data.remarkUnique;
};

export const searchCustomers = async (query) => {
  if (!query || !query.trim()) return [];

  // Reuse existing Customers API: fetch all once and filter on client.
  // This keeps everything DB-driven with no dummy data and avoids touching customer backend.
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/customer/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  await handleApiError(response);
  const customers = await response.json();
  const q = query.toLowerCase();
  return customers
    .filter(c => (c.customerName || '').toLowerCase().includes(q))
    .slice(0, 10)
    .map(c => c.customerName);
};
