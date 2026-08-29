'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Question {
  id: number;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

interface LeaderboardEntry {
  student_name: string;
  score: number;
  total_marks: number;
  correct_count: number;
  created_at: string;
}

export default function StudentTestScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('test_id');

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const [studentUser, setStudentUser] = useState<any>(null);
  const [studentName, setStudentName] = useState('विद्यार्थी');

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'solutions' | 'leaderboard'>('solutions');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentUser(user);
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'विद्यार्थी';
        setStudentName(name);
      }

      if (!testId) return;

      // 1. टेस्ट डिटेल्स लोड
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', Number(testId))
        .single();

      if (testData) {
        setTest(testData);
        setTimeLeft((testData.duration_minutes || 60) * 60);
      }

      // 2. टेस्ट के सवाल लोड
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', Number(testId))
        .order('id', { ascending: true });

      if (qData) {
        setQuestions(qData);
      }
    }
    init();
  }, [testId]);

  // टाइमर
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const selectOption = (qId: number, optIndex: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
  };

  const clearOption = (qId: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleSubmitTest = async () => {
    if (submitting || isSubmitted) return;
    setSubmitting(true);

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalScore = 0;
    let maxMarks = 0;

    const negPerQ = Number(test?.negative_marks || 0);

    questions.forEach((q) => {
      const qMarks = Number(q.marks || 2);
      maxMarks += qMarks;
      const userAns = answers[q.id];

      if (userAns === undefined) {
        unattemptedCount++;
      } else if (userAns === q.correct_option) {
        correctCount++;
        totalScore += qMarks;
      } else {
        incorrectCount++;
        totalScore -= negPerQ;
      }
    });

    const finalScore = Math.max(0, Number(totalScore.toFixed(2)));

    setScoreResult({
      score: finalScore,
      maxMarks,
      correctCount,
      incorrectCount,
      unattemptedCount,
      percentage: ((finalScore / (maxMarks || 1)) * 100).toFixed(1),
    });

    try {
      // Supabase में रिजल्ट इंसर्ट
      await supabase.from('test_attempts').insert([
        {
          test_id: Number(testId),
          user_id: studentUser?.id || null,
          student_name: studentName,
          score: finalScore,
          total_marks: maxMarks,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unattempted_count: unattemptedCount,
        },
      ]);

      // इस टेस्ट का तुरंत लीडरबोर्ड लोड
      const { data: rankData } = await supabase
        .from('test_attempts')
        .select('student_name, score, total_marks, correct_count, created_at')
        .eq('test_id', Number(testId))
        .order('score', { ascending: false })
        .limit(20);

      if (rankData) {
        setLeaderboard(rankData);
      }
    } catch (err) {
      console.error(err);
    }

    setIsSubmitted(true);
    setSubmitting(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        पेपर लोड हो रहा है, कृपया प्रतीक्षा करें...
      </div>
    );
  }

  // रिजल्ट और एनालिसिस स्क्रीन
  if (isSubmitted && scoreResult) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-bold">
              {test.title} - परिणाम
            </span>
            <h1 className="text-3xl font-black text-white mt-2">
              स्कोर: <span className="text-emerald-400">{scoreResult.score}</span> / {scoreResult.maxMarks}
            </h1>
            <p className="text-xs text-slate-400 mt-1">सफलता दर: {scoreResult.percentage}%</p>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-6">
              <div className="bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-2xl">
                <div className="text-emerald-400 font-bold text-lg">{scoreResult.correctCount}</div>
                <div className="text-[11px] text-slate-400">सही प्रश्न ✅</div>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/40 p-3 rounded-2xl">
                <div className="text-rose-400 font-bold text-lg">{scoreResult.incorrectCount}</div>
                <div className="text-[11px] text-slate-400">गलत प्रश्न ❌</div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-2xl">
                <div className="text-slate-300 font-bold text-lg">{scoreResult.unattemptedCount}</div>
                <div className="text-[11px] text-slate-400">छोड़े गए ⚪</div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              ← वापस डैशबोर्ड जाएँ
            </button>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('solutions')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'solutions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📝 सभी प्रश्नों के उत्तर व हल (Solutions)
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'leaderboard' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 इस टेस्ट का लीडरबोर्ड (Rankings)
            </button>
          </div>

          {activeTab === 'solutions' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300">
                प्रत्येक प्रश्न का विश्लेषण (आपका उत्तर vs सही उत्तर):
              </h3>
              {questions.map((q, qIndex) => {
                const userChoice = answers[q.id];
                const isCorrect = userChoice === q.correct_option;
                const isSkipped = userChoice === undefined;

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-2xl border ${
                      isSkipped
                        ? 'bg-slate-900 border-slate-800'
                        : isCorrect
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-rose-950/20 border-rose-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400">प्रश्न #{qIndex + 1}</span>
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                          isSkipped
                            ? 'bg-slate-800 text-slate-400'
                            : isCorrect
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isSkipped ? '⚪ छोड़ा गया (0 अंक)' : isCorrect ? `✅ सही (+${q.marks} अंक)` : `❌ गलत (-${test.negative_marks || 0} अंक)`}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white mb-4 whitespace-pre-line leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isThisCorrect = optIdx === q.correct_option;
                        const isThisUserSelected = optIdx === userChoice;

                        let optClass = 'bg-slate-950 border-slate-800 text-slate-300';
                        if (isThisCorrect) {
                          optClass = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold';
                        } else if (isThisUserSelected && !isCorrect) {
                          optClass = 'bg-rose-950/70 border-rose-500 text-rose-200 line-through';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs ${optClass}`}
                          >
                            <span>
                              <b className="mr-2">{String.fromCharCode(65 + optIdx)}.</b> {opt}
                            </span>
                            {isThisCorrect && <span className="text-emerald-400 font-bold text-[11px]">✓ सही उत्तर</span>}
                            {isThisUserSelected && !isThisCorrect && (
                              <span className="text-rose-400 font-bold text-[11px]">✗ आपका गलत उत्तर</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                🏆 टॉप रैंकर्स सूची (Leaderboard)
              </h3>
              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400">अभी तक कोई अन्य रिकॉर्ड उपलब्ध नहीं है।</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {leaderboard.map((entry, rIdx) => (
                    <div key={rIdx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            rIdx === 0
                              ? 'bg-amber-500 text-black'
                              : rIdx === 1
                              ? 'bg-slate-300 text-black'
                              : rIdx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rIdx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">{entry.student_name}</p>
                          <p className="text-[10px] text-slate-400">{entry.correct_count} सही उत्तर</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400">{entry.score} अंक</span>
                        <p className="text-[10px] text-slate-400">/ {entry.total_marks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // लाइव टेस्ट स्क्रीन
  const currentQ = questions[currentQIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase">{test.category}</span>
            <h2 className="text-xs md:text-sm font-bold text-white">{test.title}</h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 border border-rose-900/40 px-3 py-1.5 rounded-xl">
            <span className="text-rose-400 text-xs animate-pulse">⏱️</span>
            <span className="font-mono text-xs font-black text-rose-400">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl max-h-24 overflow-y-auto">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCur = idx === currentQIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isCur
                    ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white'
                    : isAnswered
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {currentQ && (
          <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-bold text-indigo-400">
                प्रश्न {currentQIndex + 1} / {questions.length}
              </span>
              <span>अंक: +{currentQ.marks} | Neg: -{test.negative_marks || 0}</span>
            </div>

            <p className="text-sm font-medium text-white whitespace-pre-line leading-relaxed">
              {currentQ.question_text}
            </p>

            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt, optIndex) => {
                const isSelected = answers[currentQ.id] === optIndex;
                return (
                  <button
                    key={optIndex}
                    onClick={() => selectOption(currentQ.id, optIndex)}
                    className={`w-full text-left p-3.5 rounded-2xl border text-xs transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {answers[currentQ.id] !== undefined && (
              <button
                onClick={() => clearOption(currentQ.id)}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
              >
                उत्तर हटाएं (Clear Answer)
              </button>
            )}
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <button
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex((prev) => prev - 1)}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 disabled:opacity-40 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
          >
            ← पिछला
          </button>

          {currentQIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQIndex((prev) => prev + 1)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              अगला →
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={handleSubmitTest}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg animate-pulse cursor-pointer"
            >
              {submitting ? 'सबमिट हो रहा है...' : '✅ टेस्ट सबमिट करें'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
