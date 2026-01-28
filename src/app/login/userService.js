const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const userService = {
  // Get login roles (public endpoint - no authentication required)
  async getLoginRoles() {
    try {
      const response = await fetch(`${API_BASE_URL}/public/login-roles`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch login roles');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching login roles:', error);
      return [];
    }
  },

  // Get all users (requires authentication)
  async getAllUsers() {
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Get users by department (requires authentication)
  async getUsersByDepartment(department) {
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      const response = await fetch(`${API_BASE_URL}/users/by-department/${department}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users by department');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching users by department:', error);
      return [];
    }
  },
};
