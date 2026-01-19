'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, Search, X } from 'lucide-react';

export default function Topbar({ onMenuClick }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      // Focus the search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }, 0);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Menu button and page title */}
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <h1 className="ml-2 text-lg font-semibold text-gray-900">Dashboard</h1>
          </div>

          {/* Right side - Search and user menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile search button */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 lg:hidden"
              onClick={toggleSearch}
            >
              <span className="sr-only">Search</span>
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Desktop search */}
            <div className="hidden lg:block w-64">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="desktop-search"
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search..."
                />
              </div>
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 relative"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* User menu */}
            <div className="ml-2">
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="mt-2 lg:hidden" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="mobile-search"
                type="text"
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                >
                  <span className="sr-only">Close search</span>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
