import React, { useState } from 'react';
import { User, LogOut, Settings, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import { isMockMode } from '../mocks/config';
import { Notifications } from '../components';
import { DarkModeToggle } from '../components/DarkModeToggle';

interface NavbarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [_darkMode] = useDarkMode();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get user info from auth context
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userRole = user?.role || "user";
  const userDept = user?.department || "";

  // Function to get current dashboard from route
  const getCurrentDashboard = (pathname: string): string => {
    if (pathname.includes('/dashboard/admin')) return 'Admin';
    if (pathname.includes('/dashboard/pdo')) return 'Program';
    if (pathname.includes('/dashboard/laboratory')) return 'Laboratory';
    if (pathname.includes('/dashboard/followup')) return 'Follow-up';
    if (pathname.includes('/dashboard/it-job-order')) return 'IT Job Order';
    if (pathname.includes('/dashboard/intranet-file-management')) return 'Intranet';
    return 'Dashboard';
  };

  // Get the current dashboard name from the route
  const currentDashboard = getCurrentDashboard(location.pathname);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate(isMockMode() ? '/dashboard/pdo' : '/login');
  };

  // Format role for display
  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrator',
      'super-user': 'Super User',
      'user': 'User'
    };
    return roleMap[role] || role;
  };

  // Format department for display (user's actual department)
  const formatDept = (dept: string) => {
    const deptMap: { [key: string]: string } = {
      'pdo': 'PDO',
      'program': 'Program',
      'admin': 'Admin',
      'laboratory': 'Laboratory',
      'followup': 'Follow-up',
      'it-job-order': 'IT Job Order',
      'all': 'All Departments'
    };
    return deptMap[dept] || dept;
  };

  return (
    <nav 
      className={`fixed top-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 z-40 transition-all duration-300 ${
        isCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Toggle & Welcome Text */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-base text-gray-600 dark:text-gray-400">
              Hello, <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Welcome to {currentDashboard} Dashboard
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* Notifications Component */}
          <Notifications />

          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                ></div>

                {/* Dropdown Content */}
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{userName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{userEmail}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            {formatRole(userRole)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                            {formatDept(userDept)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};