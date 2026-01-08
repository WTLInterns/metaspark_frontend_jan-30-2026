import api from '@/utils/api';

// Get all products
export const getAllProducts = async () => {
  return await api.get('/product/all');
};