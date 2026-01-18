
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

import { API_BASE_URL, WS_BASE_URL } from '../config';
import MailModal from './MailModal';
import { useState, useEffect } from 'react';

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/mail/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const count = await res.json();
          setUnreadCount(count);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUnread();

    // WebSocket for real-time updates
    if (!user.user_id) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/mail/${user.user_id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_mail' || data.type === 'unread_update') {
          fetchUnread(); // Refresh unread count
        }
      } catch {
        // Heartbeat response, ignore
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 30000);

    // Fallback: Still poll every 60s in case WebSocket fails
    const fallbackInterval = setInterval(fetchUnread, 60000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(fallbackInterval);
      ws.close();
    };
  }, [user.user_id]);

  return (
    <nav className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white shadow-xl border-b border-stone-700 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-yellow-600 rounded-full opacity-25 group-hover:opacity-50 blur transition duration-200"></div>
              <img
                src="/indian_army_logo.png"
                alt="Indian Army Logo"
                className="h-14 w-auto object-contain mix-blend-screen hover:scale-110 transition-transform duration-300 drop-shadow-2xl"
              />
            </div>
            <div>
              <span className="block font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 uppercase" style={{ textShadow: '0 2px 10px rgba(234, 179, 8, 0.2)' }}>Kaushal-Setu</span>
              <span className="block text-[10px] font-bold text-stone-400 tracking-widest uppercase">System for Evaluating, Training & Utilisation</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Mail Button */}
            <button
              onClick={() => setIsMailOpen(true)}
              className="relative p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
              title="Internal Mail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 border-2 border-stone-900 rounded-full shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="text-right hidden sm:block border-r border-stone-700 pr-4 mr-1">
              <p className="text-sm font-bold text-stone-200">{user.name}</p>
              <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider">{user.rank || user.role.replace('_', ' ')} • {user.company || 'HQ'}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all border border-stone-600 shadow-sm uppercase tracking-wide"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <MailModal isOpen={isMailOpen} onClose={() => setIsMailOpen(false)} user={user} />
    </nav>
  );
};

export default Navbar;
