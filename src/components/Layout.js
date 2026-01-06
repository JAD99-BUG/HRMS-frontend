import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Building2, 
  Wallet, 
  BarChart3, 
  UserCog, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleType } from '../utils/constants';

const SidebarItem = ({ icon: Icon, label, active, onClick, show }) => {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export const Layout = ({ children }) => {
  const { user, logout, activePage, setActivePage } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { label: 'Dashboard', icon: LayoutDashboard, role: [RoleType.HR_MANAGER, RoleType.HR_ASSISTANT, RoleType.MANAGER] },
    { label: 'Employees', icon: Users, role: [RoleType.HR_MANAGER, RoleType.HR_ASSISTANT] },
    { label: 'Leave Management', icon: Calendar, role: [RoleType.HR_MANAGER, RoleType.HR_ASSISTANT, RoleType.MANAGER] },
    { label: 'Attendance', icon: Clock, role: [RoleType.HR_MANAGER, RoleType.HR_ASSISTANT, RoleType.MANAGER] },
    { label: 'Departments', icon: Building2, role: [RoleType.HR_MANAGER, RoleType.HR_ASSISTANT, RoleType.MANAGER] },
    { label: 'Payroll', icon: Wallet, role: [RoleType.HR_MANAGER] },
    { label: 'Reports', icon: BarChart3, role: [RoleType.ADMIN, RoleType.HR_MANAGER, RoleType.HR_ASSISTANT, RoleType.OWNER] },
    { label: 'User Management', icon: UserCog, role: [RoleType.ADMIN] },
  ];

  const hasAccess = (roles) => roles.includes(user?.role);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">H</div>
            <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-800 leading-none">HR Management</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">System</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => (
              <SidebarItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                active={activePage === item.label}
                onClick={() => {
                  setActivePage(item.label);
                  setIsSidebarOpen(false);
                }}
                show={hasAccess(item.role)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="px-4 py-3 mb-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 uppercase">Current User</p>
              <p className="text-sm font-bold text-slate-700 truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-500 font-medium bg-slate-200 inline-block px-1.5 py-0.5 rounded mt-1">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto min-h-screen">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{activePage}</h1>
            <p className="text-slate-500">Welcome back, {user?.username}.</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};







