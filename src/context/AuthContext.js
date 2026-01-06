import React, { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';
import { RoleType } from '../utils/constants';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activePage, setActivePage] = useState('Dashboard');

  const login = async (usernameOrEmail, password) => {
    try {
      const response = await authAPI.login({ usernameOrEmail, password });
      const userData = response.data;
      
      const newUser = {
        user_id: userData.user_id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        department_id: userData.department_id
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      if (userData.role === RoleType.OWNER) setActivePage('Reports');
      else if (userData.role === RoleType.ADMIN) setActivePage('User Management');
      else setActivePage('Dashboard');
    } catch (error) {
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setActivePage('Dashboard');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, activePage, setActivePage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};







