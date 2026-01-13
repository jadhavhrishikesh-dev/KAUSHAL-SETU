
import React, { useState } from 'react';
import { UserRole, User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.AGNIVEER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();

      // Decode token or fetch user details? 
      // For simplicity, we decode or just trust the response if it included user details.
      // The current backend /login returns just token. 
      // We might need to fetch user profile /me or hack it by fetching based on known username if we want full details.
      // Let's rely on the role returned in the token (jwt decode) OR Update backend to return user object too.
      // Actually, updating Login to just pass a constructed user object based on successful role login is risky but consistent with current simple state.
      // BETTER: Let's quickly update backend `login` to return User object + Token to make frontend easier? 
      // OR, simpler: Just set the user locally based on input + role selected (since backend validated password). 
      // But role selection in UI is for filtering? No, authentication determines role.
      // The UI has "Role Selection" buttons. This is confusing if Auth determines Role. 
      // Let's trust the backend validation. If password is correct for "admin", backend knows it's admin.
      // We should parse the JWT to get the role.

      // TEMPORARY: Construct user object assuming success and keeping UI simple for now.
      // Ideally we decode the token.

      const payload = JSON.parse(atob(data.access_token.split('.')[1]));

      const realUser: User = {
        id: 'usr_' + Date.now(),
        user_id: 0, // Placeholder
        username: username,
        name: username, // Placeholder until we fetch profile
        role: payload.role as UserRole,
        agniveer_id: payload.agniveer_id
      };

      // If role is Agniveer, we might want to fetch the profile /api/agniveers/by_service_id?
      // Let's keep it simple: Validate login, then store token. App.tsx usually loads user from localstorage.

      localStorage.setItem('token', data.access_token);
      onLogin(realUser); // App.tsx handles the rest

    } catch (err) {
      setError('Login Invalid. Check Service ID and Password.');
    }
  };

  const inputClasses = "mt-1 block w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-stone-900 placeholder:text-stone-400 outline-none transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-teal-700 p-8 text-center">
          <h1 className="text-white text-3xl font-bold">KAUSHAL-SETU</h1>
          <p className="text-teal-100 mt-2">Retention Readiness & Assessment Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Role buttons removed as role is determined by credentials now, 
              BUT user might expect them if they are logging in as specific role. 
              Actually, "Service ID" implies unified login. 
              Let's remove Role Selection to clean up UI as requested ("credentials created by admin").
          */}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-tight">Service ID / Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClasses}
              placeholder="e.g. AG001 or admin"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-tight">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-md transition-all shadow-lg uppercase tracking-widest text-sm"
          >
            Secure Sign In
          </button>

          <p className="text-center text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
            Internal Defense Network Protocol
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
