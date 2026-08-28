'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }

        // Sign Up with User Full Name Metadata
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('Account created successfully! You can now log in.');
        setIsSignUp(false);
        setFullName('');
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden relative z-10">
        
        {/* Left Side: Hindi Brand Showcase (जैसा था वैसा ही) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30">
                EX
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-wide">ExamPro Portal</h1>
                <p className="text-xs text-indigo-300 font-medium">Rajasthan Competitive Exam Hub</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                🌟 All-in-One Mock Hub
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                सफलता की सटीक तैयारी, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                  असली परीक्षा माहौल में!
                </span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rajasthan CET (10+2 & Grad), Rajasthan Police Constable, SI व अन्य भर्ती परीक्षाओं के लिए विशेष टेस्ट सीरीज़ और लाइव रैंकिंग।
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-800/80 mt-6">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">✓</div>
              <span>नवीनतम 2026 परीक्षा पैटर्न पर आधारित प्रश्न</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">✓</div>
              <span>रियल-टाइम लीडरबोर्ड और एक्यूरेसी एनालिसिस</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">✓</div>
              <span>डेली करंट अफेयर्स बूस्टर & पीडीएफ नोट्स</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean English Interface */}
        <div className="lg:col-span-6 p-8 md:p-10 flex flex-col justify-center bg-slate-900/40">
          <div className="max-w-sm w-full mx-auto space-y-6">
            {/* Form Header */}
            <div>
              <h3 className="text-xl font-bold text-white">
                {isSignUp ? 'Create an Account 🚀' : 'Welcome Back! 👋'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isSignUp
                  ? 'Enter your details below to start taking mock tests'
                  : 'Enter your credentials to access your student dashboard'}
              </p>
            </div>

            {/* Toggle Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  !isSignUp
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  isSignUp
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Status Messages */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-800/50 rounded-2xl text-rose-400 text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/50 rounded-2xl text-emerald-400 text-xs font-medium text-center">
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Full Name Input (Only on Sign Up) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {showPassword ? 'Hide 🙈' : 'Show 👁️'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-950 transition duration-150 disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'Processing...'
                  : isSignUp
                  ? 'Create Free Account ➔'
                  : 'Continue to Portal ➔'}
              </button>
            </form>

            <p className="text-[11px] text-center text-slate-500">
              Secure Authentication • 100% Data Privacy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}