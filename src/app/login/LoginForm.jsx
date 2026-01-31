'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import RoleSelector from './RoleSelector';

export default function LoginForm() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('Please enter both ID and password');
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.metaspark.co.in';

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userId,
          password,
        }),
      });

      if (!response.ok) {
        let message = 'Invalid credentials. Please try again.';
        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch (_) {
          // ignore JSON parse errors and use default message
        }
        setError(message);
        return;
      }

      const data = await response.json();

      // Expected backend response:
      // { id, roles, token, username }
      const userData = {
        id: data.id,
        roles: data.roles,
        token: data.token,
        username: data.username,
      };

      // Store auth data
      localStorage.setItem('swiftflow-user', JSON.stringify(userData));
      if (data.token) {
        localStorage.setItem('swiftflow-token', data.token);
      }

      // Determine redirect path based on role
      // Normalize roles from backend, e.g. "ADMIN" -> "ADMIN" (no prefix to remove)
      const normalizedRole = (data.roles || '')
        .toString()
        .split(',')[0] // if roles like "ADMIN,USER" take first
        .trim()
        .toUpperCase();

      console.log('Login response roles:', data.roles, 'normalized:', normalizedRole);

      let redirectPath = '/';
      switch (normalizedRole) {
        case 'ADMIN':
          redirectPath = '/AdminUser/dashboard';
          break;
        case 'DESIGN':
          redirectPath = '/DesignUser/dashboard';
          break;
        case 'MACHINING':
          redirectPath = '/MechanistUser/dashboard';
          break;
        case 'INSPECTION':
          redirectPath = '/InspectionUser/dashboard';
          break;
        case 'PRODUCTION':
          redirectPath = '/ProductionUser/dashboard';
          break;
        case 'ENQUIRY':
          // For ENQUIRY role, we can redirect to Admin dashboard or a specific enquiry dashboard
          redirectPath = '/AdminUser/dashboard';
          break;
        case 'COMPLETED':
          // For COMPLETED role, we can redirect to Admin dashboard
          redirectPath = '/AdminUser/dashboard';
          break;
        default:
          redirectPath = '/login';
          setError('Access not configured for this role. Please contact support.');
          localStorage.removeItem('swiftflow-user');
          localStorage.removeItem('swiftflow-token');
          return;
      }

      sessionStorage.setItem('show-login-success', '1');
      router.push(redirectPath);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MetaSpark</h1>
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
      </form>
    </div>
  );
}
