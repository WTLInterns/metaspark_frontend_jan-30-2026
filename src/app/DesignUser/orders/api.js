import api from '@/utils/api';

// Create a new order
export const createOrder = async (customerId, productId, orderData) => {
  return await api.post(`/order/create/${customerId}/${productId}`, orderData);
};

// Get order by ID
export const getOrderById = async (orderId) => {
  return await api.get(`/order/getById/${orderId}`);
};

// Get all orders
export const getAllOrders = async () => {
  return await api.get('/order/getAll');
};