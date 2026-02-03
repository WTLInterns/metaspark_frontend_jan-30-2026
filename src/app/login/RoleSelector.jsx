'use client';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  User,
  UserCircle,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
} from 'lucide-react';

// Generate initials from name
const getInitials = (name) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

// Color palette for avatars
const colors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-indigo-500",
];

// Department icons mapping
const getDepartmentIcon = (department) => {
  switch (department?.toUpperCase()) {
    case "ADMIN":
      return UserCog;
    case "DESIGN":
      return UserCheck;
    case "PRODUCTION":
      return User;
    case "MACHINING":
      return UserCog;
    case "INSPECTION":
      return UserCheck;
    default:
      return UserCircle;
  }
};

// Department color mapping
const getDepartmentColor = (department) => {
  switch (department?.toUpperCase()) {
    case "ADMIN":
      return "bg-blue-600";
    case "DESIGN":
      return "bg-green-500";
    case "PRODUCTION":
      return "bg-yellow-500";
    case "MACHINING":
      return "bg-red-500";
    case "INSPECTION":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
};

// Icon mapping for predefined roles
const getIconComponent = (iconName) => {
  switch (iconName) {
    case "USER_COG":
      return UserCog;
    case "USER_CHECK":
      return UserCheck;
    case "USER":
      return User;
    case "USER_PLUS":
      return UserPlus;
    case "USER_X":
      return UserX;
    default:
      return UserCircle;
  }
};

// Static roles: frontend-only, no backend dependency
const STATIC_ROLES = [
  {
    id: "role-admin",
    label: "Admin",
    department: "ADMIN",
    email: "admin@metaspark.com",
    description: "System administrator with full access",
    icon: "USER_COG",
  },
  {
    id: "role-design",
    label: "Designer",
    department: "DESIGN",
    email: "design@metaspark.com",
    description: "Design department user",
    icon: "USER_CHECK",
  },
  {
    id: "role-production",
    label: "Production",
    department: "PRODUCTION",
    email: "production@metaspark.com",
    description: "Production department user",
    icon: "USER",
  },
  {
    id: "role-machining",
    label: "Machinist",
    department: "MACHINING",
    email: "machining@metaspark.com",
    description: "Machining department user",
    icon: "USER_COG",
  },
  {
    id: "role-inspection",
    label: "Inspection",
    department: "INSPECTION",
    email: "inspection@metaspark.com",
    description: "Inspection department user",
    icon: "USER_CHECK",
  },
];

export default function RoleSelector({ selectedUser, onSelect, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const roles = STATIC_ROLES;

  const toggleDropdown = () => !disabled && setIsOpen(!isOpen);
  const handleUserSelect = (user) => {
    if (typeof onSelect === "function") {
      onSelect(user);
    }
  };

  // Avatar component
  const UserAvatar = ({ user, size = "h-6 w-6", className = "" }) => {
    // For predefined roles, use the icon from the user object
    // For actual users, use department-based icon
    let Icon;
    let color;

    if (user.icon) {
      // Predefined role
      Icon = getIconComponent(user.icon);
      color = getDepartmentColor(user.department);
    } else {
      // Fallback (kept consistent with previous behavior)
      Icon = getDepartmentIcon(user.department);
      color = getDepartmentColor(user.department);
    }

    return (
      <div
        className={`${size} rounded-full ${color} flex items-center justify-center text-white ${className}`}
      >
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
          disabled
            ? "bg-gray-50 cursor-not-allowed"
            : "cursor-default hover:border-gray-400"
        } focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        onClick={toggleDropdown}
      >
        <div className="flex items-center">
          {selectedUser ? (
            <>
              <UserAvatar user={selectedUser} />
              <span className="ml-3 block truncate">
                {selectedUser.label || selectedUser.fullName || "Unknown User"} -
                {" "}
                {selectedUser.department}
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
            <ChevronDown
              className={`h-5 w-5 ${disabled ? "text-gray-300" : "text-gray-400"}`}
            />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {roles.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No roles configured</div>
          ) : (
            roles.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    handleUserSelect(user);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    <UserAvatar user={user} />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {user.label || user.fullName || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.department} • {user.email}
                      </div>
                      {user.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {user.description}
                        </div>
                      )}
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
            })
          )}
        </div>
      )}
    </div>
  );
}
