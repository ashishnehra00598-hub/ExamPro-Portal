'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAIL = 'nehraa365@gmail.com';

const EXAM_CATEGORIES = [
  { id: 'all', name: '⚡ All Exams' },
  { id: 'cet_12th', name: '🎯 Rajasthan CET (10+2)' },
  { id: 'cet_grad', name: '🎓 Rajasthan CET (Graduation)' },
  { id: 'police_constable', name: '👮 Rajasthan Police Constable' },
  { id: 'rajasthan_si', name: '⭐ Rajasthan Police SI' },
];

export default function SuperDashboard() {
  const [user, setUser] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [examAlerts, setExamAlerts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('cet_12th');
  const [selectedSubTab, setSelectedSubTab] = useState<string>('all');
  const [selectedLeaderboardTest, setSelectedLeaderboardTest] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // डिफ़ॉल्ट मुख्य परीक्षा काउंटडाउन (Target Exam Date)
  const defaultTargetDate = '2026-10-15';

  useEffect(() => {
    async function loadMasterData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);

      // 1. Tests
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .order('id', { ascending: true });
      if (testsData) setTests(testsData);

      // 2. Student Personal Results (Attempts)
      const { data: userScores } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_email', user.email)
        .order('id', { ascending: false });
      if (userScores) setResults(userScores);

      // 3. Global Scores for Leaderboard
      const { data: globalScores } = await supabase
        .from('test_results')
        .select('*');
      if (globalScores) setAllScores(globalScores);

      // 4. Alerts
      const { data: examsData } = await supabase
        .from('exam_alerts')
        .select('*');
      if (examsData) setExamAlerts(examsData);

      // 5. Materials
      const { data: matData } = await supabase
        .from('study_materials')
        .select('*')
        .order('id', { ascending: false });
      if (matData) setMaterials(matData);

      setLoading(false);
    }
    loadMasterData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getDaysLeft = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} दिन शेष` : 'Exam Active';
  };

  // Real Streak & Accuracy
  const calculateRealStreak = () => {
    if (results.length === 0) return 0;
    const uniqueDates = new Set(
      results.map((r) => new Date(r.created_at || Date.now()).toISOString().split('T')[0])
    );
    return uniqueDates.size;
  };

  const calculateRealAccuracy = () => {
    if (results.length === 0) return 0;
    let totalScoreObtained = 0;
    let totalMaxScore = 0;
    results.forEach((r) => {
      totalScoreObtained += (r.score || 0);
      totalMaxScore += (r.total_questions ? r.total_questions * 2 : r.total_marks || 20);
    });
    if (totalMaxScore === 0) return 0;
    return Math.round((totalScoreObtained / totalMaxScore) * 100);
  };

  // कुल गलत प्रश्न (कमजोरी विश्लेषण के लिए)
  const calculateTotalIncorrect = () => {
    return results.reduce((acc, r) => acc + (r.incorrect_count || (r.wrong_answers ? r.wrong_answers : 0)), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-400">पोर्टल लोड हो रहा है...</p>
      </div>
    );
  }

  // 2-Level Filter
  const filteredTests = tests.filter((t) => {
    const cat = (t.category || 'Rajasthan CET (10+2)').toLowerCase();
    const type = (t.test_type || 'Full Mock Test').toLowerCase();

    let matchCat = true;
    if (selectedCategory === 'cet_12th') matchCat = cat.includes('10+2') || cat.includes('12th');
    else if (selectedCategory === 'cet_grad') matchCat = cat.includes('grad');
    else if (selectedCategory === 'police_constable') matchCat = cat.includes('constable');
    else if (selectedCategory === 'rajasthan_si') matchCat = cat.includes('si');

    let matchType = true;
    if (selectedSubTab === 'mock') matchType = type.includes('full') || type.includes('mock');
    else if (selectedSubTab === 'subject') matchType = type.includes('subject');

    return matchCat && matchType;
  });

  // Leaderboard Calculation
  const calculateOverallLeaderboard = () => {
    const userTotals: { [email: string]: { totalScore: number; testsGiven: number; name: string } } = {};
    allScores.forEach((row) => {
      const email = row.user_email || 'student@exampro.com';
      if (!userTotals[email]) {
        userTotals[email] = {
          totalScore: 0,
          testsGiven: 0,
          name: row.user_name || email.split('@')[0],
        };
      }
      userTotals[email].totalScore += (row.score || 0);
      userTotals[email].testsGiven += 1;
    });
    return Object.entries(userTotals)
      .map(([email, d]) => ({ email, ...d }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);
  };

  const calculateTestLeaderboard = (testId: number) => {
    return allScores
      .filter((row) => Number(row.test_id) === testId)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
  };

  const currentLeaderboard =
    selectedLeaderboardTest === 'all'
      ? calculateOverallLeaderboard()
      : calculateTestLeaderboard(Number(selectedLeaderboardTest));

  const totalScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const realStreak = calculateRealStreak();
  const realAccuracy = calculateRealAccuracy();
  const totalIncorrect = calculateTotalIncorrect();
  const studentDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'विद्यार्थी';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center font-black text-white shadow-lg">
            EX
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white">ExamPro Portal</h1>
            <p className="text-xs text-slate-400">Rajasthan Competitive Exam Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user?.email === ADMIN_EMAIL && (
            <button
              onClick={() => (window.location.href = '/admin')}
              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
            >
              ⚙️ Admin Panel
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Top Header: नमस्ते + मुख्य एग्जाम काउंटडाउन */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              नमस्ते, <span className="text-indigo-400">{studentDisplayName}</span> 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              अपने टेस्ट दें और अपनी रैंकिंग व कमजोरियों का लाइव विश्लेषण देखें।
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider block">
                🎯 आगामी मुख्य परीक्षा
              </span>
              <span className="text-sm font-black text-amber-400">
                ⏳ {getDaysLeft(examAlerts[0]?.exam_date || defaultTargetDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Exam Alerts Carousel */}
        {examAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examAlerts.map((ex, i) => (
              <div
                key={i}
                className="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-2xl flex justify-between items-center shadow-lg"
              >
                <div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-2 py-0.5 rounded-md font-bold uppercase">
                    {ex.badge_text}
                  </span>
                  <h3 className="font-bold text-white text-sm mt-1">{ex.exam_name}</h3>
                  <p className="text-[11px] text-slate-400">लक्ष्य दिनांक: {ex.exam_date}</p>
                </div>
                <div className="bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-black text-sm px-3.5 py-2 rounded-xl">
                  ⏳ {getDaysLeft(ex.exam_date)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real Stats + Weakness Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">🔥</div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Study Streak</p>
              <p className="text-2xl font-black text-amber-400">{realStreak} {realStreak === 1 ? 'Day' : 'Days'}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">🎯</div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">कुल स्कोर</p>
              <p className="text-2xl font-black text-emerald-400">{totalScore} Marks</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">📝</div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">दिए गए टेस्ट</p>
              <p className="text-2xl font-black text-purple-400">{results.length}</p>
            </div>
          </div>

          <div className="bg-rose-950/20 border border-rose-900/40 p-5 rounded-2xl flex flex-col justify-center">
            <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
              ⚠️ कमजोरी अलर्ट (Weakness)
            </span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              {totalIncorrect > 0 ? (
                <>कुल <b>{totalIncorrect} गलत प्रश्न</b> हुए हैं। गलत टॉपिक्स का रिवीज़न करें।</>
              ) : (
                <>✨ कोई गंभीर कमजोरी नहीं! प्रदर्शन उत्कृष्ट है।</>
              )}
            </p>
          </div>
        </div>

        {/* 2-Level Exam Selector */}
        <section className="space-y-5 bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">🎯 1. अपना टारगेट एग्जाम चुनें</h2>
            <div className="flex gap-2.5 overflow-x-auto pb-2 mt-3 scrollbar-none">
              {EXAM_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              📑 2. टेस्ट कैटेगरी चुनें:
            </h3>
            <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 max-w-md">
              <button
                onClick={() => setSelectedSubTab('all')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedSubTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ All ({filteredTests.length})
              </button>
              <button
                onClick={() => setSelectedSubTab('mock')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedSubTab === 'mock' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                📑 Full Mock Tests
              </button>
              <button
                onClick={() => setSelectedSubTab('subject')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedSubTab === 'subject' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                📚 Subject-wise Tests
              </button>
            </div>
          </div>

          {/* Test Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {filteredTests.length === 0 ? (
              <div className="col-span-full bg-slate-950 border border-slate-800 p-8 rounded-3xl text-center text-slate-400 text-xs">
                इस कैटेगरी में अभी कोई टेस्ट उपलब्ध नहीं है। एडमिन पैनल से नया टेस्ट जोड़ें।
              </div>
            ) : (
              filteredTests.map((t, idx) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-indigo-500/50 transition shadow-xl relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold px-3 py-1 rounded-full">
                        Test #{idx + 1}
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md font-bold uppercase">
                        {t.test_type || 'Full Mock'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug">{t.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{t.description || 'नवीनतम पाठ्यक्रम पर आधारित टेस्ट।'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>⏱️ {t.duration_minutes} मिनट</span>
                      <span>🎖️ {t.total_marks} अंक</span>
                    </div>

                    <button
                      onClick={() => (window.location.href = `/test?test_id=${t.id}`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition shadow-lg cursor-pointer"
                    >
                      Start Test Paper
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Dual Leaderboard + Accuracy Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white flex items-center gap-2">🏆 लीडरबोर्ड</h2>
              <select
                value={selectedLeaderboardTest}
                onChange={(e) => setSelectedLeaderboardTest(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs font-bold text-indigo-300 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">🌟 All-Over Rank</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>Test #{t.id}: {t.title.slice(0, 15)}...</option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {currentLeaderboard.map((item: any, idx: number) => {
                const email = item.email || item.user_email;
                const isCurrent = email === user?.email;
                const displayName = item.name || item.user_name || email?.split('@')[0] || 'विद्यार्थी';

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      isCurrent ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-950/50 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <p className="text-xs font-bold text-white truncate max-w-[140px]">
                        {displayName} {isCurrent && <span className="text-[10px] text-indigo-400 font-normal">(You)</span>}
                      </p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">
                      {item.totalScore !== undefined ? item.totalScore : item.score} Marks
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real Accuracy Breakdown */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">📊 वास्तविक एक्यूरेसी (Real Performance)</h2>
            {results.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                अभी तक कोई टेस्ट नहीं दिया गया है।
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>समग्र एक्यूरेसी (Overall Test Accuracy)</span>
                    <span className={`font-bold ${realAccuracy >= 70 ? 'text-emerald-400' : realAccuracy >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {realAccuracy}% {realAccuracy >= 70 ? '(Strong)' : realAccuracy >= 40 ? '(Average)' : '(Need Revision)'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        realAccuracy >= 70 ? 'bg-emerald-500' : realAccuracy >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(5, realAccuracy)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-indigo-300">💡 स्मार्ट सुझाव (Smart Tip):</p>
                  <p className="text-[11px] text-slate-400">
                    {realAccuracy >= 70
                      ? 'शानदार तैयारी! लगातार मॉक टेस्ट देकर टाइम मैनेजमेंट पर ध्यान दें।'
                      : realAccuracy >= 40
                      ? 'औसत प्रदर्शन। गलत होने वाले सवालों का रिवीज़न करें।'
                      : 'कमजोर प्रदर्शन। बेसिक थ्योरी और नोट्स को दोबारा पढ़ने की जरूरत है।'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
