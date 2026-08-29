'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface TestItem {
  id: number;
  title: string;
  category: string;
  duration_minutes: number;
  total_marks: number;
}

interface AttemptItem {
  id: number;
  test_id: number;
  student_name: string;
  score: number;
  total_marks: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  created_at: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [myAttempts, setMyAttempts] = useState<AttemptItem[]>([]);
  const [topRankers, setTopRankers] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 1. सभी टेस्ट लोड करें
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .order('id', { ascending: false });

      if (testsData) setTests(testsData);

      // 2. ओवरऑल टॉप 10 लीडरबोर्ड
      const { data: leadData } = await supabase
        .from('test_attempts')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (leadData) setTopRankers(leadData);

      // 3. इस छात्र के अपने पिछले टेस्ट (कमजोरी विश्लेषण के लिए)
      if (user) {
        const { data: userAttempts } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: false });

        if (userAttempts) setMyAttempts(userAttempts);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // कमजोरी व सटीकता की गणना
  const totalCorrect = myAttempts.reduce((acc, a) => acc + (a.correct_count || 0), 0);
  const totalIncorrect = myAttempts.reduce((acc, a) => acc + (a.incorrect_count || 0), 0);
  const totalQuestions = totalCorrect + totalIncorrect;
  const accuracyRate = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        डैशबोर्ड लोड हो रहा है...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">
              नमस्ते, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'विद्यार्थी'} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">अपने टेस्ट दें और अपनी रैंकिंग व कमजोरियों का विश्लेषण देखें।</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 transition"
          >
            ⚙️ एडमिन पोर्टल
          </button>
        </div>

        {/* Performance & AI Weakness Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <span className="text-xs text-slate-400 font-bold">कुल टेस्ट दिए गए</span>
            <div className="text-3xl font-black text-white mt-2">{myAttempts.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">सक्रिय अभ्यास</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <span className="text-xs text-slate-400 font-bold">कुल सटीकता (Accuracy Rate)</span>
            <div className="text-3xl font-black text-indigo-400 mt-2">{accuracyRate}%</div>
            <p className="text-[11px] text-slate-500 mt-1">{totalCorrect} सही / {totalIncorrect} गलत</p>
          </div>

          <div className="bg-rose-950/20 border border-rose-900/40 p-5 rounded-3xl">
            <span className="text-xs text-rose-400 font-bold">कमजोरी विश्लेषण (Weakness Alert)</span>
            <div className="text-xs text-slate-300 mt-2 leading-relaxed">
              {totalIncorrect > 0 ? (
                <>⚠️ आपने पिछले टेस्टों में <b>{totalIncorrect} प्रश्न गलत</b> किए हैं। नेगेटिव मार्किंग से बचने के लिए कठिन प्रश्नों का रिवीजन करें।</>
              ) : (
                <>✨ शानदार! अभी तक कोई बड़ी कमजोरी दर्ज नहीं हुई है।</>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Available Tests */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📚 उपलब्ध मॉक टेस्ट (Available Tests)
            </h2>

            {tests.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-xs">
                अभी कोई टेस्ट उपलब्ध नहीं है। एडमिन पैनल से नया टेस्ट जोड़ें।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((t) => (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between hover:border-indigo-500/50 transition">
                    <div>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                        {t.category || 'General'}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-3">{t.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        ⏱️ {t.duration_minutes || 60} मिनट | 🎯 {t.total_marks || 20} अंक
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/test?test_id=${t.id}`)}
                      className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg text-center"
                    >
                      टेस्ट शुरू करें →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Col: Dashboard Live Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              🏆 मुख्य लीडरबोर्ड (Top Rankers)
            </h2>

            {topRankers.length === 0 ? (
              <p className="text-xs text-slate-500">अभी तक कोई टेस्ट रिकॉर्ड नहीं है।</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {topRankers.map((rank, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0
                            ? 'bg-amber-500 text-black'
                            : idx === 1
                            ? 'bg-slate-300 text-black'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{rank.student_name}</p>
                        <p className="text-[10px] text-slate-400">{rank.correct_count} सही प्रश्न</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400">{rank.score} अंक</span>
                      <p className="text-[10px] text-slate-400">/ {rank.total_marks}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
