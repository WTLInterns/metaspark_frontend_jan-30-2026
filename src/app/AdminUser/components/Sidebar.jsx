'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

const menuItems = [
  { name: 'Dashboard', href: '/AdminUser/dashboard', icon: FiHome },
  { name: 'Communications', href: '/AdminUser/communications', icon: FiInbox },
  { name: 'All Orders', href: '/AdminUser/orders', icon: FiClipboard },
  { name: 'Customers', href: '/AdminUser/customers', icon: FiUsers },
  { name: 'Products', href: '/AdminUser/products', icon: FiPackage },
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
  { name: 'User Management', href: '/AdminUser/users', icon: FiUsers },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const pathname = usePathname();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const toggleExpand = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isActive = (href) => {
    return pathname === href ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100';
  };

  return (
    <div className={`
      fixed top-0 left-0 h-screen z-50
      bg-white border-r border-gray-200 shadow-sm
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && <h1 className="text-xl font-bold text-blue-600">SwiftFlow</h1>}
        <button 
          onClick={toggleCollapse} 
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium ${isActive(item.href)}`}
                  >
                    <div className="flex items-center">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <span className="ml-2">
                        {expandedItems[item.name] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </span>
                    )}
                  </button>
                  
                  {expandedItems[item.name] && !collapsed && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link 
                            href={child.href}
                            className={`block p-2 text-sm rounded-lg ${pathname === child.href ? 'text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg text-sm font-medium ${isActive(item.href)}`}
                >
                  <item.icon className="h-5 w-5" />
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            AU
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@swiftflow.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
