'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  FiHome, 
  FiInbox, 
  FiClipboard, 
  FiUsers, 
  FiPackage, 
  FiSettings, 
  FiUserPlus,
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiCheckCircle,
  FiLogOut,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

// Menu configurations for different roles
const adminMenuItems = [
  { name: 'Dashboard', href: '/AdminUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/AdminUser/communications', icon: FiInbox },
  { name: 'All Orders', href: '/AdminUser/orders', icon: FiClipboard },
  { name: 'Customers', href: '/AdminUser/customers', icon: FiUsers },
  { name: 'Products', href: '/AdminUser/products', icon: FiPackage },
  { name: 'Inventory', href: '/AdminUser/inventory', icon: FiPackage },
  { name: 'Machines', href: '/AdminUser/machines', icon: FiSettings },
  { name: 'HRM', href: '/AdminUser/hrm', icon: FiUserPlus },
  { 
    name: 'Accountant', 
    href: '/AdminUser/accountant',
    icon: FiDollarSign,
    children: [
      { name: 'Invoices', href: '/AdminUser/accountant/invoices' },
      { name: 'Expenses', href: '/AdminUser/accountant/expenses' },
      { name: 'Reports', href: '/AdminUser/accountant/reports' },
    ]
  },
  { name: 'Design Queue', href: '/AdminUser/design-queue', icon: FiFileText },
  { name: 'Production Line', href: '/AdminUser/production-line', icon: FiTruck },
  { name: 'Machining Jobs', href: '/AdminUser/machining-jobs', icon: FiSettings },
  { name: 'Inspection Queue', href: '/AdminUser/inspection-queue', icon: FiCheckCircle },
  { name: 'User Management', href: '/AdminUser/user-management', icon: FiUsers },
];

const designerMenuItems = [
  { name: 'Dashboard', href: '/DesignUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/DesignUser/communications', icon: FiInbox },
  { name: 'Design Queue', href: '/DesignUser/design-queue', icon: FiFileText },
  { name: 'Inventory', href: '/DesignUser/inventory', icon: FiPackage },
];

const mechanistMenuItems = [
  { name: 'Dashboard', href: '/MechanistUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/MechanistUser/communications', icon: FiInbox },
  { name: 'Machining Jobs', href: '/MechanistUser/machining-jobs', icon: FiSettings },
  { name: 'Inventory', href: '/MechanistUser/inventory', icon: FiPackage },
];

const inspectorMenuItems = [
  { name: 'Dashboard', href: '/InspectionUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/InspectionUser/communications', icon: FiInbox },
  { name: 'Inspection Queue', href: '/InspectionUser/inspection-queue', icon: FiCheckCircle },
  { name: 'Inventory', href: '/InspectionUser/inventory', icon: FiPackage },
];
const productionMenuItems = [
  { name: 'Dashboard', href: '/ProductionUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/ProductionUser/communications', icon: FiInbox },
  { name: 'Production Line', href: '/ProductionUser/production-line', icon: FiCheckCircle },
  { name: 'Inventory', href: '/ProductionUser/inventory', icon: FiPackage },
];

// Helper function to get menu items based on user role and current path
const getMenuItems = (user) => {
  if (typeof window === 'undefined') return [];
  
  const path = window.location.pathname;
  
  // First check the current path to handle direct navigation
  if (path.startsWith('/MechanistUser')) {
    return mechanistMenuItems;
  }
  if (path.startsWith('/AdminUser')) {
    return adminMenuItems;
  }
  if (path.startsWith('/DesignUser')) {
    return designerMenuItems;
  }
  if (path.startsWith('/InspectionUser')) {
    return inspectorMenuItems;
  }
  if (path.startsWith('/ProductionUser')) {
    return productionMenuItems;
  }
  
  // Fallback to role-based menu if path check doesn't work
  if (!user) return [];
  
  switch(user.role) {
    case 'admin':
      return adminMenuItems;
    case 'mechanist':
      return mechanistMenuItems;
    case 'inspector':
    case 'inspection':
      return inspectorMenuItems;
    case 'production':
      return productionMenuItems;
    default:
      return designerMenuItems;
  }
};

export default function Sidebar({ user }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const pathname = usePathname();
  const { logout } = useAuth();

  const isAdminSidebar = pathname?.startsWith('/AdminUser');

  useEffect(() => {
    if (user) {
      const items = getMenuItems(user);
      setMenuItems(items);
    }
  }, [user]);

  const toggleExpand = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isActive = (href) => {
    return pathname === href ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100';
  };

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">MetaSpark</h1>
      </div>

      {/* Logout (non-admin roles): directly under header/logo */}
      {!isAdminSidebar && (
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center p-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      )}
      
      {/* Navigation */}
      <div className="flex-1 flex flex-col min-h-0">
        <nav className="flex-1 overflow-y-auto py-2 sidebar-scroll">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium ${isActive(item.href)}`}
                    >
                      <div className="flex items-center">
                        <item.icon className="h-5 w-5" />
                        <span className="ml-3">{item.name}</span>
                      </div>
                      <span className="ml-2">
                        {expandedItems[item.name] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </span>
                    </button>
                    
                    {expandedItems[item.name] && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link 
                              href={child.href}
                              className={`block p-2 text-sm rounded-lg ${
                                pathname === child.href 
                                  ? 'text-blue-600 font-medium' 
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-lg text-sm font-medium ${isActive(item.href)}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="ml-3">{item.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center p-2 rounded-lg hover:bg-gray-50">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || user?.email?.split('@')[0] || ''}
            </p>
            <p className="text-xs text-gray-500">
              {user?.email || user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Logout pinned at bottom */}
      {isAdminSidebar && (
        <div className="px-4 pb-4 flex-shrink-0">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center p-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
