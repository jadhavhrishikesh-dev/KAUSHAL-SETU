
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { API_BASE_URL } from '../config';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.AGNIVEER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();

      const realUser: User = {
        id: 'usr_' + Date.now(),
        user_id: data.user_id,
        username: data.username,
        name: data.full_name || data.username,
        role: data.role as UserRole,
        rank: data.rank,
        company: data.assigned_company,
        agniveer_id: data.agniveer_id
      };

      localStorage.setItem('token', data.access_token);
      onLogin(realUser); // App.tsx handles the rest

    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Network Error: Unable to connect to server. Check your connection.');
      } else {
        setError(err instanceof Error ? err.message : 'Login Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "mt-1 block w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-stone-200 placeholder:text-stone-600 outline-none transition-all shadow-inner backdrop-blur-sm hover:border-stone-600";

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full bg-stone-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-800 overflow-hidden relative z-10">
        <div className="p-8 text-center border-b border-stone-800 bg-gradient-to-b from-stone-800/50 to-transparent">
          <div className="flex justify-center mb-2 relative">
            <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full transform scale-150"></div>
            <img src="/indian_army_logo.png" alt="Indian Army" className="h-32 w-32 object-contain relative z-10 drop-shadow-2xl mix-blend-screen" />
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 uppercase drop-shadow-sm mb-1">
            Kaushal-Setu
          </h1>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em]">
            System for Evaluating, Training & Utilisation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm font-bold text-center animate-pulse">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 pl-1">Service ID / Username</label>
            <div className="relative group">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClasses}
                placeholder="AG001"
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-600 group-focus-within:text-yellow-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 pl-1">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses + " pr-10"}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-stone-500 hover:text-yellow-500 focus:outline-none transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-stone-900 font-bold py-3 px-4 rounded-lg transition-all shadow-lg uppercase tracking-widest text-sm relative overflow-hidden group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-shine"></div>
            {loading ? 'Authenticating...' : 'Secure Sign In'}
          </button>

          <div className="mt-8 text-center space-y-2">
            <p className="text-[10px] font-bold text-stone-600 uppercase tracking-[0.2em] border-t border-stone-800 pt-6">
              Internal Defense Network Protocol
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
