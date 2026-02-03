const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.metaspark.co.in';

export const userService = {
  // Get all users
  async getAllUsers() {
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
  },

  // Create user
  async createUser(userData) {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    console.log('[CREATE USER] sending payload:', userData);

    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    console.log('[CREATE USER] status:', response.status);
    console.log('[CREATE USER] content-type:', response.headers.get('content-type'));

    const raw = await response.text();
    console.log('[CREATE USER] raw response body:', raw);

    if (!response.ok) {
      let message = 'Failed to create user';
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch (e) {
        // ignore JSON parse error, fall back to default message
      }
      throw new Error(message);
    }

    if (!raw) {
      // No body returned (e.g. 204) - treat as success with no payload
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('[CREATE USER] Failed to parse JSON response:', e);
      return null;
    }
  },

  // Update user
  async updateUser(userId, userData) {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message || 'Failed to update user');
    }
    
    return response.json();
  },

  // Delete user
  async deleteUser(userId) {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message || 'Failed to delete user');
    }
    
    return response.json();
  },

  // Send login details email
  async sendLoginDetails(userId) {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    const response = await fetch(`${API_BASE_URL}/users/${userId}/send-login-details`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message || 'Failed to send login details');
    }
    
    return response.json();
  },

  // Get all machines
  async getAllMachines() {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    const response = await fetch(`${API_BASE_URL}/users/machines`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch machines');
    }
    
    return response.json();
  },

  // Get users by department
  async getUsersByDepartment(department) {
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
  },

  // Assign machine to user
  async assignMachineToUser(userId, machineId) {
    const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
    const token = authData?.token;
    
    const response = await fetch(`${API_BASE_URL}/users/assign-machine/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ machineId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message || 'Failed to assign machine to user');
    }
    
    return response.json();
  },
};
