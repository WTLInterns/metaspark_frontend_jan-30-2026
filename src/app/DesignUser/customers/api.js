import api from '@/utils/api';

// Get all customers
export const getAllCustomers = async () => {
  return await api.get('/customer/getAll');
};

// Get customer by ID
export const getCustomerById = async (customerId) => {
  return await api.get(`/customer/getById/${customerId}`);
};