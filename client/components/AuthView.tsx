import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { reconnectSocket } from '../services/socket';

interface Props {
  onLogin: (user: User, token: string) => void;
}

export const AuthView: React.FC<Props> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = isRegistering
        ? await api.register(username || 'Pilot01', email, password)
        : await api.login(email, password);

      // Persist token
      localStorage.setItem('skyhigh_token', result.token);

      // Reconnect socket with the new token
      reconnectSocket();

      onLogin({
        ...result.user,
        realBalance: Number(result.user.realBalance ?? 0),
        demoBalance: Number(result.user.demoBalance ?? 0),
      }, result.token);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh max-h-dvh w-full bg-[#0b0e11] flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#e50539]/10 via-[#0b0e11] to-[#0b0e11] overflow-auto">
      <div className="w-full max-w-md bg-[#141516] rounded-3xl border border-[#2d2d2d] p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic text-[#e50539] tracking-tighter mb-2">Aviator</h1>
          <p className="text-gray-500 text-sm font-medium">Provably Fair Crash Game</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5 ml-1">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#0f1012] border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:border-[#e50539] transition-all"
                placeholder="SkyPilot_77"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5 ml-1">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0f1012] border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:border-[#e50539] transition-all"
              placeholder="pilot@skyhigh.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1.5 ml-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0f1012] border border-[#2d2d2d] rounded-xl px-4 py-3 focus:outline-none focus:border-[#e50539] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e50539] py-4 rounded-xl font-black text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(229,5,57,0.3)] flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : (isRegistering ? 'CREATE ACCOUNT' : 'LOG IN')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            {isRegistering ? 'Already have an account? Log in' : 'New pilot? Register now'}
          </button>
        </div>
      </div>
    </div>
  );
};
