import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { adminLogout } from '@/lib/admin-auth';

export default function CRMLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate('/admin/login');
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/admin/crm/dashboard',
      icon: '📊',
    },
    {
      label: 'Contacts',
      path: '/admin/crm/contacts',
      icon: '👥',
    },
    {
      label: 'Engagements',
      path: '/admin/crm/engagements',
      icon: '📋',
    },
    {
      label: 'Activity',
      path: '/admin/crm/activity',
      icon: '📝',
    },
  ];

  return (
    <div className="flex h-screen bg-[#FFFAEE]">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#37306B] text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-purple-700">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/admin/crm/dashboard')}
          >
            <div className="text-2xl font-bold">📱</div>
            {isSidebarOpen && (
              <div>
                <div className="font-bold text-lg">CRM</div>
                <div className="text-xs text-purple-300">Platform</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                isActive(item.path)
                  ? 'bg-purple-600 text-white border-r-4 border-yellow-400'
                  : 'text-purple-200 hover:bg-purple-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {isSidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-purple-700 p-4 space-y-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full py-2 px-3 rounded text-sm text-purple-200 hover:bg-purple-700 transition-colors"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full py-2 px-3 rounded text-sm text-purple-200 hover:bg-purple-700 transition-colors"
            title="Legacy Admin Dashboard"
          >
            {isSidebarOpen ? 'Legacy Admin' : '⚙️'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded text-sm bg-red-600 hover:bg-red-700 transition-colors"
          >
            {isSidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-[#37306B]"
                style={{ fontFamily: 'Epilogue, sans-serif' }}
              >
                CRM Platform
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage client engagements and projects
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
