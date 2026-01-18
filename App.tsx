
import React, { useState, useEffect } from 'react';
import { UserRole, User } from './types';
import Login from './components/Login';
import AgniveerDashboard from './components/AgniveerDashboard';
import OfficerDashboard from './components/OfficerDashboard';
import TrainingOfficerDashboard from './components/TrainingOfficerDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import BattalionDashboard from './components/BattalionDashboard';
import AdminDashboard from './components/AdminDashboard';
import ClerkDashboard from './components/ClerkDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (mockUser: User) => {
    setUser(mockUser);
    localStorage.setItem('kaushal_user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kaushal_user');
  };

  useEffect(() => {
    const saved = localStorage.getItem('kaushal_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case UserRole.AGNIVEER:
        return <AgniveerDashboard user={user} />;
      case UserRole.OFFICER:
        return <TrainingOfficerDashboard user={user} />;
      case UserRole.COY_CDR:
        return <CompanyDashboard user={user} />;
      case UserRole.COY_CLK:
        return <ClerkDashboard user={user} />;
      case UserRole.CO:
        return <BattalionDashboard user={user} />;
      case UserRole.ADMIN:
        return <AdminDashboard user={user} />;
      default:
        return <div>Unauthorized Access</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-1 bg-[#fdfbf7] p-4 md:p-8">
        <div className="w-full">
          {renderDashboard()}
        </div>
      </main>
      <footer className="bg-stone-800 text-stone-400 py-4 px-8 text-center text-xs">
        © 2026 KAUSHAL-SETU Assessment System | Offline Deployment v1.0
      </footer>
    </div>
  );
};

export default App;
