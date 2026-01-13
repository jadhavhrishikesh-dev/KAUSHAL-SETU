
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

import MailModal from './MailModal';
import { useState, useEffect } from 'react';

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/mail/unread-count', {
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

    const ws = new WebSocket(`ws://localhost:8000/ws/mail/${user.user_id}`);

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
    <nav className="bg-teal-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-md">
              <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight">KAUSHAL-SETU</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Mail Button */}
            <button
              onClick={() => setIsMailOpen(true)}
              className="relative p-2 hover:bg-teal-600 rounded-full transition-colors"
              title="Internal Mail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-teal-200 capitalize">{user.role.replace('_', ' ')} • {user.company || 'Battalion'}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded text-sm transition-colors border border-teal-600"
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
