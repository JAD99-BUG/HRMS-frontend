import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Departments from './pages/Departments';
import Payroll from './pages/Payroll';
import LeaveManagement from './pages/LeaveManagement';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import { LogIn, Mail, Lock } from 'lucide-react';

const AppContent = () => {
  const { user, login, activePage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!user) {
    const handleLogin = (e) => {
      e.preventDefault();
      if (!email || !password) return alert('Please enter both email and password');
      login(email, password);
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="p-10">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-xl shadow-blue-500/30">H</div>
              <h1 className="text-3xl font-extrabold text-slate-800">HR Management System</h1>
              <p className="text-slate-500 mt-2 font-medium">Enterprise Suite Login</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email or Username</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@hrms.local"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
              >
                <span>Sign In</span>
                <LogIn size={20} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Demo Access</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['admin', 'hrmanager', 'assistant', 'manager', 'owner'].map((hint) => (
                  <button 
                    key={hint}
                    onClick={() => { setEmail(hint); setPassword('password'); }}
                    className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors capitalize"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard': return <Dashboard />;
      case 'Employees': return <Employees />;
      case 'Attendance': return <Attendance />;
      case 'Departments': return <Departments />;
      case 'Payroll': return <Payroll />;
      case 'Leave Management': return <LeaveManagement />;
      case 'Reports': return <Reports />;
      case 'User Management': return <UserManagement />;
      default: return <Dashboard />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;







