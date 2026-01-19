'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { FiMenu, FiX } from 'react-icons/fi';

function ClientLayoutInner({ children }) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is authenticated for protected routes
    const userData = JSON.parse(localStorage.getItem('swiftflow-user') || 'null');
    setUser(userData);
    
    const isProtectedRoute = pathname?.startsWith('/AdminUser') || 
                          pathname?.startsWith('/DesignUser') || 
                          pathname?.startsWith('/MechanistUser') || 
                          pathname?.startsWith('/InspectionUser') || 
                          pathname?.startsWith('/ProductionUser');
    
    if (isProtectedRoute && !userData) {
      router.push('/login');
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== '/login') {
      toast.dismiss('login-success');
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login') return;
    if (typeof window === 'undefined') return;

    const shouldShow = sessionStorage.getItem('show-login-success') === '1';
    if (!shouldShow) return;

    sessionStorage.removeItem('show-login-success');
    toast.success('Login successful', { id: 'login-success', duration: 2500 });
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login') return;
    if (typeof window === 'undefined') return;

    const shouldShow = sessionStorage.getItem('show-logout-success') === '1';
    if (!shouldShow) return;

    sessionStorage.removeItem('show-logout-success');
    toast.success('Logged out successfully', { id: 'logout-success', duration: 2500 });
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isLoginRoute = pathname === '/login';

  if (isLoginRoute) {
    return (
      <>
        <Toaster position="top-right" />
        {children}
      </>
    );
  }

  // Check if this is a page that should show the sidebar
  const showSidebar = pathname?.startsWith('/DesignUser') || 
                    pathname?.startsWith('/MechanistUser') ||
                    pathname?.startsWith('/AdminUser') ||
                    pathname?.startsWith('/InspectionUser') ||
                    pathname?.startsWith('/ProductionUser');

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        {/* Show sidebar only for specific pages */}
        {showSidebar && (
          <>
            {/* Mobile sidebar backdrop */}
            <div 
              className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <div 
              className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } lg:translate-x-0 bg-white border-r border-gray-200`}
            >
              <Sidebar user={user} closeSidebar={() => setSidebarOpen(false)} />
            </div>
            
            {/* Mobile header */}
            <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-gray-500 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sidebarOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
                </button>
              </div>
            </header>
          </>
        )}
        
        {/* Main content */}
        <div className="flex flex-col">
          {/* Desktop header */}
          <header className="hidden lg:flex items-center justify-end h-16 px-6 bg-white border-b border-gray-200">
          </header>
          
          <main className={`${showSidebar ? 'lg:pl-64' : ''} flex-1 ${showSidebar ? 'pt-16' : ''}`}>
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </AuthProvider>
  );
}
