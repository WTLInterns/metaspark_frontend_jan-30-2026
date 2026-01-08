import api from '@/utils/api';

// Get all products
export const getAllProducts = async () => {
  return await api.get('/product/getAll');
};

// Get product by ID
export const getProductById = async (productId) => {
  return await api.get(`/product/getById/${productId}`);
};