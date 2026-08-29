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

      // 1. सभी टेस्ट लोड
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .order('id', { ascending: false });

      if (testsData) setTests(testsData);

      // 2. मुख्य लीडरबोर्ड
      const { data: leadData } = await supabase
        .from('test_attempts')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (leadData) setTopRankers(leadData);

      // 3. छात्र के अपने टेस्ट
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

  // गणना (Accuracy & Weakness)
  const totalCorrect = myAttempts.reduce((acc, a) => acc + (a.correct_count || 0), 0);
  const totalIncorrect = myAttempts.reduce((acc, a) => acc + (a.incorrect_count || 0), 0);
  const totalQuestions = totalCorrect + totalIncorrect;
  const accuracyRate = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e1c] text-cyan-400 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>डैशबोर्ड लोड हो रहा है...</span>
        </div>
      </div>
    );
  }

  const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'विद्यार्थी';

  return (
    <main className="min-h-screen bg-[#080f1d] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="bg-[#0f1d36] border border-[#1b315b] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              नमस्ते, <span className="text-cyan-400">{studentName}</span> 👋
            </h1>
            <p className="text-xs text-blue-200/70 mt-1">
              अपने टेस्ट दें, वास्तविक समय में अपनी रैंक व कमजोरी का विश्लेषण देखें।
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs bg-[#162a4d] hover:bg-[#1f3a6b] text-cyan-300 font-semibold px-4 py-2.5 rounded-xl border border-cyan-500/30 transition shadow-md"
          >
            ⚙️ एडमिन पोर्टल
          </button>
        </div>

        {/* 3 Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0f1d36] border border-[#1b315b] p-5 rounded-2xl">
            <span className="text-xs text-blue-300 font-medium">कुल टेस्ट दिए गए</span>
            <div className="text-3xl font-black text-white mt-2">{myAttempts.length}</div>
            <p className="text-[11px] text-blue-300/60 mt-1">सक्रिय अभ्यास सत्र</p>
          </div>

          <div className="bg-[#0f1d36] border border-[#1b315b] p-5 rounded-2xl">
            <span className="text-xs text-blue-300 font-medium">सटीकता (Accuracy Rate)</span>
            <div className="text-3xl font-black text-cyan-400 mt-2">{accuracyRate}%</div>
            <p className="text-[11px] text-blue-300/60 mt-1">{totalCorrect} सही / {totalIncorrect} गलत</p>
          </div>

          <div className="bg-[#1e1528] border border-[#48234f] p-5 rounded-2xl">
            <span className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
              ⚠️ कमजोरी विश्लेषण (Weakness Alert)
            </span>
            <div className="text-xs text-slate-200 mt-2 leading-relaxed">
              {totalIncorrect > 0 ? (
                <>आपने पिछले टेस्टों में <b>{totalIncorrect} प्रश्न गलत</b> किए हैं। नेगेटिव मार्किंग सुधारने हेतु इन टॉपिकों का दोबारा अभ्यास करें।</>
              ) : (
                <>✨ बेहतरीन तैयारी! अभी तक कोई बड़ी कमजोरी दर्ज नहीं हुई है।</>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Tests List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              📚 उपलब्ध मॉक टेस्ट (Available Tests)
            </h2>

            {tests.length === 0 ? (
              <div className="p-10 text-center bg-[#0f1d36] border border-[#1b315b] rounded-2xl text-blue-200/60 text-xs">
                अभी कोई टेस्ट उपलब्ध नहीं है।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#0f1d36] border border-[#1b315b] hover:border-cyan-500/50 p-5 rounded-2xl flex flex-col justify-between transition group shadow-md"
                  >
                    <div>
                      <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 px-2.5 py-1 rounded-full font-bold">
                        {t.category || 'General'}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-3 group-hover:text-cyan-300 transition">
                        {t.title}
                      </h3>
                      <p className="text-[11px] text-blue-200/60 mt-1">
                        ⏱️ {t.duration_minutes || 60} मिनट &nbsp;|&nbsp; 🎯 {t.total_marks || 20} अंक
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/test?test_id=${t.id}`)}
                      className="mt-5 w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#070e1c] font-black text-xs rounded-xl transition shadow-lg text-center"
                    >
                      टेस्ट शुरू करें →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Original Styled Leaderboard */}
          <div className="bg-[#0f1d36] border border-[#1b315b] p-5 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1b315b] pb-3">
              🏆 मुख्य लीडरबोर्ड (Top Rankers)
            </h2>

            {topRankers.length === 0 ? (
              <p className="text-xs text-blue-200/50 text-center py-6">अभी तक कोई टेस्ट रिकॉर्ड नहीं है।</p>
            ) : (
              <div className="space-y-2">
                {topRankers.map((rank, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#081224] border border-[#152747]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                          idx === 0
                            ? 'bg-amber-400 text-black'
                            : idx === 1
                            ? 'bg-slate-300 text-black'
                            : idx === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-[#162a4d] text-blue-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[110px]">
                          {rank.student_name}
                        </p>
                        <p className="text-[10px] text-blue-300/60">{rank.correct_count} सही</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-cyan-400">{rank.score} अंक</span>
                      <p className="text-[10px] text-blue-300/50">/ {rank.total_marks}</p>
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
