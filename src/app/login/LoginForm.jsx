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
      role: 'machinist',
      department: 'Machining'
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
    
    if (!selectedUser) {
      setError('Please select a role');
      return;
    }
    
    if (!userId || !password) {
      setError('Please enter both ID and password');
      return;
    }
    
    if (!selectedUser.role) {
      setError('Invalid user data. Please try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check credentials (in a real app, this would be an API call)
      const userKey = userId.toLowerCase().trim();
      const user = validCredentials[userKey];
      
      // Check if user exists
      if (!user) {
        setError('Invalid credentials. Please check your ID and try again.');
        return;
      }
      
      // Check password
      if (user.password !== password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      
      // Check role match
      if (user.role !== selectedUser.role) {
        setError('Incorrect role selected. Please try again.');
        return;
      }
      
      // If we get here, login is successful
      const userData = {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: selectedUser.department || user.role,
        lastLogin: new Date().toISOString()
      };
      
      // Store user data
      localStorage.setItem('swiftflow-user', JSON.stringify(userData));
      
      // Redirect based on role
      if (user.role === 'admin') {
        window.location.href = '/AdminUser/dashboard';
      } else if (user.role === 'designer') {
        window.location.href = '/DesignUser/dashboard';
      } else if (user.role === 'machinist') {
        window.location.href = '/MechanistUser/dashboard';
      } else if (user.role === 'inspector') {
        window.location.href = '/InspectionUser/dashboard';
      } else if (user.role === 'production') {
        window.location.href = '/ProductionUser/dashboard';
      } else {
        // For other roles, redirect to a default page or show an error
        setError('Access not configured for this role. Please contact support.');
        localStorage.removeItem('swiftflow-user'); // Clear invalid login
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
