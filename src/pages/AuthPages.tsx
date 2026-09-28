import React, { useState } from 'react';
import { Lock, Mail, User, Phone, Check, AlertCircle, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
  token?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const AuthPages: React.FC<AuthPageProps> = ({ initialMode = 'login', token, onNavigate }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+92 ');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regTerms, setRegTerms] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  // Reset password
  const [resetPass, setResetPass] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState({ text: '', isError: false });

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const res = await login(loginEmail, loginPassword);
    setLoginLoading(false);

    if (res.success) {
      onNavigate('home');
    } else {
      setLoginError(res.error || 'Login failed.');
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (!regTerms) {
      setRegError('Please accept the Terms & Conditions.');
      return;
    }

    setRegLoading(true);
    const res = await register({
      firstName: regFirstName,
      lastName: regLastName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      terms: regTerms
    });
    setRegLoading(false);

    if (res.success) {
      onNavigate('home');
    } else {
      setRegError(res.error || 'Registration failed.');
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      setForgotMsg(data.message || 'If an account exists, a reset link was sent.');
    } catch {
      setForgotMsg('Failed to dispatch request.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg({ text: '', isError: false });

    if (resetPass !== resetConfirm) {
      setResetMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: resetPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetMsg({ text: 'Password reset successfully! Redirecting to login...', isError: false });
        setTimeout(() => setMode('login'), 2000);
      } else {
        setResetMsg({ text: data.error || 'Reset failed.', isError: true });
      }
    } catch {
      setResetMsg({ text: 'Failed to reset password.', isError: true });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Branding Title */}
        <div className="text-center mb-8">
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer inline-flex items-center gap-2 mb-2"
          >
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-left leading-none">
              <span className="font-extrabold text-slate-900 text-lg block">CHAUDHARY BATTERY</span>
              <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">& UPS · F-10 ISLAMABAD</span>
            </div>
          </div>
        </div>

        {/* 1. Login Form */}
        {mode === 'login' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-1">Customer Sign In</h2>
            <p className="text-xs text-slate-500 mb-6">Access order history, warranties, and fast checkout.</p>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-red-600 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {loginLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-red-600 font-bold hover:underline"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* 2. Registration Form */}
        {mode === 'register' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-1">Register Account</h2>
            <p className="text-xs text-slate-500 mb-6">Create an account for official warranty tracking & faster order processing.</p>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={e => setRegFirstName(e.target.value)}
                    placeholder="Tariq"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={e => setRegLastName(e.target.value)}
                    placeholder="Mehmood"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="tariq@gmail.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Pakistani Phone / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Password (min 8 characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regTerms}
                    onChange={e => setRegTerms(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span className="text-[11px] text-slate-600">
                    I accept the{' '}
                    <button type="button" onClick={() => onNavigate('terms')} className="text-red-600 underline">Terms</button>{' '}
                    and{' '}
                    <button type="button" onClick={() => onNavigate('privacy')} className="text-red-600 underline">Privacy Policy</button>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {regLoading ? 'CREATING ACCOUNT...' : 'REGISTER ACCOUNT'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-red-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* 3. Forgot Password Form */}
        {mode === 'forgot' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-1">Reset Password</h2>
            <p className="text-xs text-slate-500 mb-6">Enter your registered email address to receive a secure 15-minute reset link.</p>

            <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              {forgotMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg font-medium text-xs">
                  {forgotMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                {forgotLoading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              <button onClick={() => setMode('login')} className="text-red-600 font-bold hover:underline">
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* 4. Reset Password Form */}
        {mode === 'reset' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-1">Set New Password</h2>
            <p className="text-xs text-slate-500 mb-6">Enter your new secure password below.</p>

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetPass}
                  onChange={e => setResetPass(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              {resetMsg.text && (
                <div className={`p-2.5 rounded-lg font-semibold ${resetMsg.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {resetMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs"
              >
                {resetLoading ? 'SAVING...' : 'RESET PASSWORD'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
