const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const userService = {
  // Get users by department
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
