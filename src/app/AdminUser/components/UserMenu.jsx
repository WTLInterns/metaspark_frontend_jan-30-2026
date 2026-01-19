'use client';
import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    {
      label: 'Profile',
      icon: User,
      href: '/profile',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
    },
    {
      label: 'Logout',
      icon: LogOut,
      className: 'text-red-600 hover:bg-red-50',
      onClick: () => {
        setIsOpen(false);
        logout();
      },
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
          AU
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700">Admin User</p>
          <p className="text-xs text-gray-500">admin@swiftflow.com</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {menuItems.map((item, index) => (
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${item.className || ''}`}
                  role="menuitem"
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${item.className || ''}`}
                  role="menuitem"
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
