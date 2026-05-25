import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FlaskConical, 
  UserCheck, 
  Briefcase,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { title: string; path: string }[];
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenu, setExpandedMenu] = useState<string>('');

  const menuItems: MenuItem[] = [
    {
      title: 'ADMIN',
      icon: <LayoutDashboard size={20} />,
      subItems: [
        { title: 'Overview', path: '/dashboard/admin' },
        { title: 'Accounting', path: '/dashboard/admin/accounting' },
        { title: 'Supply & Purchasing', path: '/dashboard/admin/supply' },
      ],
    },
    {
      title: 'PDO',
      icon: <Package size={20} />,
      subItems: [
        { title: 'Overview', path: '/dashboard/pdo' },
        { title: 'NBS Facilities', path: '/dashboard/pdo/nsf-database'},
        { title: 'Sample Received', path: '/dashboard/pdo/sample-received' },
        { title: 'Sample Screened', path: '/dashboard/pdo/sample-screened' },
        { title: 'Unsatisfactory', path: '/dashboard/pdo/unsatisfactory' },
        { title: 'NSF Performance', path: '/dashboard/pdo/nsf-performance' },
        { title: 'List of Car', path: '/dashboard/pdo/list-of-car' },
        { title: 'Lopez Quezon', path: '/dashboard/pdo/lopez-quezon' },
      ],
    },
    {
      title: 'LABORATORY',
      icon: <FlaskConical size={20} />,
      subItems: [
        { title: 'Overview', path: '/dashboard/laboratory' },
        { title: 'Demo & Unsat', path: '/dashboard/laboratory/demo-unsat' },
        { title: 'Inventory', path: '/dashboard/laboratory/inventory' },
        { title: 'Patient Information System', path: '/dashboard/laboratory/patient-information-system' },
        { title: 'Endorsement to Follow Up', path: '/dashboard/laboratory/endorsement-to-followup' },
      ],
    },
    {
      title: 'FOLLOWUP',
      icon: <UserCheck size={20} />,
      subItems: [
        { title: 'Overview', path: '/dashboard/followup' },
        { title: 'Logbook Endorsement', path: '/dashboard/followup/logbook-endorsement' },
        { title: 'CMS Urgent', path: '/dashboard/followup/cms-urgent' },
        { title: 'Patient Information System', path: '/dashboard/followup/patient-information-system' },
      ],
    },
    {
      title: 'IT JOB ORDER',
      icon: <Briefcase size={20} />,
      subItems: [
        { title: 'Overview', path: '/dashboard/it-job-order' },
        { title: "Summary", path: '/dashboard/it-job-order/summary'}
      ],
    },
  ];

  // Function to determine which menu should be expanded based on current route
  const getMenuFromPath = (path: string): string => {
    if (path.includes('/dashboard/admin')) return 'ADMIN';
    if (path.includes('/dashboard/pdo')) return 'PDO';
    if (path.includes('/dashboard/laboratory')) return 'LABORATORY';
    if (path.includes('/dashboard/followup')) return 'FOLLOWUP';
    if (path.includes('/dashboard/it-job-order')) return 'IT JOB ORDER';
    return '';
  };

  // Function to map user department to menu title
  const getDepartmentMenu = (dept: string): string => {
    const deptMap: { [key: string]: string } = {
      'admin': 'ADMIN',
      'Admin': 'ADMIN',
      'ADMIN': 'ADMIN',
      'administration': 'ADMIN',
      'Administration': 'ADMIN',
      
      'pdo': 'PDO',
      'PDO': 'PDO',
      'program': 'PDO',
      'Program': 'PDO',
      'PROGRAM': 'PDO',
      
      'laboratory': 'LABORATORY',
      'Laboratory': 'LABORATORY',
      'LABORATORY': 'LABORATORY',
      'lab': 'LABORATORY',
      'Lab': 'LABORATORY',
      
      'followup': 'FOLLOWUP',
      'Followup': 'FOLLOWUP',
      'Follow-up': 'FOLLOWUP',
      'follow-up': 'FOLLOWUP',
      'FOLLOWUP': 'FOLLOWUP',
      
      'it-job-order': 'IT JOB ORDER',
      'it': 'IT JOB ORDER',
      'IT': 'IT JOB ORDER',
      'Information Technology': 'IT JOB ORDER',
      
      'all': 'PDO',
      'All': 'PDO',
      'ALL': 'PDO',
    };
    
    return deptMap[dept] || 'PDO';
  };

  // Auto-expand based on user department and current route
  useEffect(() => {
    // First priority: expand based on current route
    const menuFromPath = getMenuFromPath(location.pathname);
    if (menuFromPath) {
      setExpandedMenu(menuFromPath);
      return;
    }

    // Second priority: expand based on user's department
    if (user?.department) {
      const userDeptMenu = getDepartmentMenu(user.department);
      setExpandedMenu(userDeptMenu);
    }
  }, [location.pathname, user?.department]);

  const toggleMenu = (title: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedMenu(title);
    } else {
      setExpandedMenu(expandedMenu === title ? '' : title);
    }
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo & Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NS</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              NSCSL
            </h1>
          </div>
        )}
        
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">NS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.title}>
              <button
                onClick={() => toggleMenu(item.title)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200 group ${
                  expandedMenu === item.title
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isCollapsed ? item.title : ''}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className={`${expandedMenu === item.title ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} group-hover:scale-110 transition-transform duration-200`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && <span>{item.title}</span>}
                </div>
                {!isCollapsed && (
                  expandedMenu === item.title ? (
                    <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )
                )}
              </button>

              {/* Submenu - Only show when expanded and menu is open */}
              {!isCollapsed && expandedMenu === item.title && item.subItems && (
                <ul className="ml-11 mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((subItem) => (
                    <li key={subItem.path}>
                      <Link
                        to={subItem.path}
                        className={`block px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                          location.pathname === subItem.path
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        {subItem.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};