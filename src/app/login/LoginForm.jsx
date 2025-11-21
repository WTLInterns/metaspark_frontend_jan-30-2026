'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleSelector from './RoleSelector';

export default function LoginForm() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Dummy user credentials for demo purposes
  const validCredentials = {
    admin: { 
      password: 'admin123', 
      name: 'Admin User', 
      email: 'admin@swiftflow.com', 
      role: 'admin' 
    },
    designer: { 
      password: 'design123', 
      name: 'Dana Scully', 
      email: 'design@swiftflow.com', 
      role: 'designer' 
    },
    production: { 
      password: 'prod123', 
      name: 'Production Team', 
      email: 'production@swiftflow.com', 
      role: 'production' 
    },
    machinist: { 
      password: 'machine123', 
      name: 'Tony Stark', 
      email: 'machinist@swiftflow.com', 
      role: 'machinist' 
    },
    inspector: { 
      password: 'inspect123', 
      name: 'Inspection Team', 
      email: 'inspection@swiftflow.com', 
      role: 'inspector' 
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('=== Login Form Submitted ===');
    console.log('User ID:', userId);
    console.log('Selected User:', selectedUser);
    
    if (!selectedUser) {
      const errorMsg = 'Please select a role';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!userId || !password) {
      const errorMsg = 'Please enter both ID and password';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }
    
    // Ensure we have the user data we need
    if (!selectedUser.role) {
      const errorMsg = 'Invalid user data';
      console.error(errorMsg, selectedUser);
      setError('Invalid user data. Please try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting login process...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check credentials (in a real app, this would be an API call)
      const userKey = userId.toLowerCase().trim();
      const user = validCredentials[userKey];
      
      // Debug logging
      console.log('=== Login Details ===');
      console.log('User Key:', userKey);
      console.log('User from DB:', user);
      console.log('Selected User Role:', selectedUser.role);
      console.log('Password Match:', user?.password === password);
      console.log('Role Match:', user?.role === selectedUser.role);
      
      // Check if user exists
      if (!user) {
        const errorMsg = `User '${userId}' not found`;
        console.error(errorMsg);
        setError('Invalid credentials. Please check your ID and try again.');
        return;
      }
      
      // Check password
      if (user.password !== password) {
        const errorMsg = 'Incorrect password';
        console.error(errorMsg);
        setError('Incorrect password. Please try again.');
        return;
      }
      
      // Check role match
      if (user.role !== selectedUser.role) {
        const errorMsg = `Role mismatch. Expected ${user.role}, got ${selectedUser.role}`;
        console.error(errorMsg);
        setError('Incorrect role selected. Please try again.');
        return;
      }
      
      // If we get here, login is successful
      const userData = {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        token: 'dummy-jwt-token',
        department: selectedUser.department || user.role,
        lastLogin: new Date().toISOString()
      };
      
      console.log('=== Login Successful ===');
      console.log('User Data:', userData);
      
      // Store user data
      try {
        localStorage.setItem('swiftflow-user', JSON.stringify(userData));
        localStorage.setItem('swiftflow-token', 'dummy-jwt-token');
        console.log('User data saved to localStorage');
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
        throw new Error('Failed to save session data');
      }

      // Set auth cookie so middleware lets user access /dashboard
      try {
        const cookieValue = encodeURIComponent(JSON.stringify({ id: userId, role: user.role }));
        document.cookie = `swiftflow-auth=${cookieValue}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`;
      } catch (cookieError) {
        console.warn('Could not set auth cookie:', cookieError);
      }
      
      console.log('Redirecting based on role...');
      if (selectedUser?.name === 'Admin User' || user.role?.toLowerCase() === 'admin') {
        window.location.href = '/AdminUser/dashboard';
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SwiftFlow</h1>
        <p className="text-gray-600">Please sign in to continue</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          <RoleSelector 
            selectedUser={selectedUser}
            onSelect={setSelectedUser}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Enter your ID"
            disabled={isLoading}
            autoComplete="username"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800">Forgot password?</a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Enter your password"
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>
        
        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md border border-red-100 flex items-start">
            <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center items-center py-2.5 px-4 rounded-md text-white font-medium ${
            isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        
        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Demo credentials:</p>
          <p className="text-xs mt-1 text-gray-400">
            Admin: admin / admin123<br />
            Design: designer / design123
          </p>
        </div>
      </form>
    </div>
  );
}
