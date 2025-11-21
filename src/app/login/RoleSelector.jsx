'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, User, UserCircle, UserCheck, UserCog, UserPlus, UserX } from 'lucide-react';

// Generate initials from name
const getInitials = (name) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

// Color palette for avatars
const colors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
  'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'
];

const users = [
  { 
    id: 1, 
    name: 'Admin User', 
    role: 'admin', 
    department: 'Admin',
    icon: UserCog,
    color: 'bg-blue-600'
  },
  { 
    id: 2, 
    name: 'Dana Scully', 
    role: 'designer', 
    department: 'Design',
    icon: UserCheck,
    color: 'bg-green-500'
  },
  { 
    id: 3, 
    name: 'Production Team', 
    role: 'production', 
    department: 'Production',
    icon: User,
    color: 'bg-yellow-500'
  },
  { 
    id: 4, 
    name: 'Tony Stark', 
    role: 'machinist', 
    department: 'Machining',
    icon: UserCog,
    color: 'bg-red-500'
  },
  { 
    id: 5, 
    name: 'Inspection Team', 
    role: 'inspector', 
    department: 'Inspection',
    icon: UserCheck,
    color: 'bg-purple-500'
  },
  { 
    id: 6, 
    name: 'Fox Mulder', 
    role: 'designer', 
    department: 'Design',
    icon: User,
    color: 'bg-indigo-500'
  },
];

export default function RoleSelector({ selectedUser, onSelect, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = () => !disabled && setIsOpen(!isOpen);
  const handleUserSelect = (user) => {
    if (typeof onSelect === 'function') {
      onSelect(user);
    }
  };
  
  // Avatar component
  const UserAvatar = ({ user, size = 'h-6 w-6', className = '' }) => {
    const Icon = user.icon || UserCircle;
    return (
      <div className={`${size} rounded-full ${user.color} flex items-center justify-center text-white ${className}`}>
        <Icon className="h-4 w-4" />
      </div>
    );
  };
  
  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        className={`w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-default hover:border-gray-400'
        } focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        onClick={toggleDropdown}
      >
        <div className="flex items-center">
          {selectedUser ? (
            <>
              <UserAvatar user={selectedUser} />
              <span className="ml-3 block truncate">
                {selectedUser.name} - {selectedUser.role}
              </span>
            </>
          ) : (
            <span className="text-gray-500">Select a user role</span>
          )}
        </div>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className={`h-5 w-5 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {users.map((user) => {
            const isSelected = selectedUser?.id === user.id;
            return (
              <div
                key={user.id}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  handleUserSelect(user);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center">
                  <UserAvatar user={user} />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role} • {user.department}</div>
                  </div>
                </div>
                {isSelected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
