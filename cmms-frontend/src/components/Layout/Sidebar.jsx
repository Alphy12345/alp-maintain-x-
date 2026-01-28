import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Package, 
  Tags,
  Boxes,
  BarChart3, 
  Menu,
  X,
  Users,
  Truck,
  FileText
} from 'lucide-react';
import useStore from '../../store/useStore';

const navigation = [
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Reporting', href: '/reporting', icon: BarChart3 },
  { name: 'Assets', href: '/assets', icon: Package },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Parts Inventory', href: '/parts', icon: Boxes },
  { name: 'Procedures', href: '/library/procedures', icon: Tags },
  { name: 'Output Data', href: '/output-data', icon: FileText },
  { name: 'Teams / Users', href: '/teams-users', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Truck },
];

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-white dark:bg-gray-950 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex h-full flex-col">
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <div />
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) => `
                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                      ${isActive
                        ? 'bg-gray-900/40 text-white border-r-2 border-primary-500'
                        : 'text-gray-300 hover:bg-gray-900/30 hover:text-white'
                      }
                    `}
                    onClick={() => {
                      // Close mobile sidebar after navigation
                      if (window.innerWidth < 1024) {
                        toggleSidebar();
                      }
                    }}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        </div>
      </div>
    </>
  );
};

export default Sidebar;
