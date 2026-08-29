'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ProfessionalTestPortal() {
  const [testId, setTestId] = useState<number>(1);
  const [testDetails, setTestDetails] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [statusMap, setStatusMap] = useState<{ [key: number]: 'answered' | 'unanswered' | 'review' | 'review_answered' | 'not_visited' }>({});
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('student@portal.com');
  const [userName, setUserName] = useState('Student');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('test_id')) || 1;
    setTestId(id);

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split('@')[0]);
      }

      const { data: tData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single();

      if (tData) {
        setTestDetails(tData);
        const exactMinutes = Number(tData.duration_minutes) || 10;
        setTimeLeft(exactMinutes * 60);
      }

      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', id);

      if (qData && qData.length > 0) {
        setQuestions(qData);
        const initStatus: any = {};
        qData.forEach((_, i) => {
          initStatus[i] = i === 0 ? 'unanswered' : 'not_visited';
        });
        setStatusMap(initStatus);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (loading || isSubmitted) return;
    if (timeLeft <= 0) {
      finalizeSubmission();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, loading]);

  const handleSelectOption = (optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleSaveAndNext = () => {
    const isAnswered = selectedAnswers[currentIdx] !== undefined;
    setStatusMap((prev) => ({
      ...prev,
      [currentIdx]: isAnswered ? 'answered' : 'unanswered',
    }));

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (statusMap[nextIdx] === 'not_visited') {
        setStatusMap((prev) => ({ ...prev, [nextIdx]: 'unanswered' }));
      }
    }
  };

  const handleMarkForReview = () => {
    const isAnswered = selectedAnswers[currentIdx] !== undefined;
    setStatusMap((prev) => ({
      ...prev,
      [currentIdx]: isAnswered ? 'review_answered' : 'review',
    }));

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (statusMap[nextIdx] === 'not_visited') {
        setStatusMap((prev) => ({ ...prev, [nextIdx]: 'unanswered' }));
      }
    }
  };

  const handleClearResponse = () => {
    const newAns = { ...selectedAnswers };
    delete newAns[currentIdx];
    setSelectedAnswers(newAns);
    setStatusMap((prev) => ({ ...prev, [currentIdx]: 'unanswered' }));
  };

  const handleJumpToQuestion = (index: number) => {
    if (statusMap[currentIdx] === 'not_visited' || !statusMap[currentIdx]) {
      setStatusMap((prev) => ({ ...prev, [currentIdx]: 'unanswered' }));
    }
    setCurrentIdx(index);
    if (statusMap[index] === 'not_visited') {
      setStatusMap((prev) => ({ ...prev, [index]: 'unanswered' }));
    }
    setShowPaletteMobile(false);
  };

  const calculateResults = () => {
    let correct = 0;
    let wrong = 0;
    let score = 0;
    const testNegative = testDetails?.negative_marks !== undefined ? Number(testDetails.negative_marks) : 0.50;

    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] !== undefined) {
        if (selectedAnswers[idx] === q.correct_option) {
          correct++;
          score += (q.marks || 2);
        } else {
          wrong++;
          score -= testNegative;
        }
      }
    });

    const unattempted = questions.length - (correct + wrong);
    return { correct, wrong, unattempted, score: Number(Math.max(0, score).toFixed(2)) };
  };

  const finalizeSubmission = async () => {
    const results = calculateResults();
    setIsSubmitted(true);
    setShowSubmitModal(false);

    await supabase.from('test_results').insert([
      {
        user_email: userEmail,
        user_name: userName,
        test_id: testId,
        score: results.score,
        total_questions: questions.length,
      },
    ]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm tracking-wide font-medium">परीक्षा पेपर लोड हो रहा है...</p>
      </div>
    );
  }

  // जब टेस्ट में कोई सवाल न हो तो साफ़ छात्र संदेश
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl flex items-center justify-center text-2xl mb-4">
          📝
        </div>
        <h2 className="text-xl font-bold mb-2">यह टेस्ट जल्द ही लाइव होगा!</h2>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          इस टेस्ट के प्रश्न जल्द उपलब्ध कराए जाएँगे। कृपया अन्य मॉक टेस्ट का अभ्यास करें।
        </p>
        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg"
        >
          डैशबोर्ड पर वापस जाएँ
        </button>
      </div>
    );
  }

  if (isSubmitted) {
    const res = calculateResults();
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Test Completed
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-3">परफॉर्मेंस स्कोरकार्ड</h1>
            <p className="text-slate-400 text-sm mt-1">{testDetails?.title || `Mock Test #${testId}`}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 text-center shadow-inner">
            <p className="text-sm font-medium text-slate-400">कुल अंतिम प्राप्तांक (Total Marks)</p>
            <p className="text-5xl font-black text-indigo-400 mt-2">
              {res.score} <span className="text-lg text-slate-500 font-normal">/ {testDetails?.total_marks || questions.length * 2}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-emerald-950/40 border border-emerald-600/30 p-4 rounded-2xl">
              <p className="text-xs text-emerald-400 font-bold">सही (Correct)</p>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{res.correct}</p>
            </div>
            <div className="bg-rose-950/40 border border-rose-600/30 p-4 rounded-2xl">
              <p className="text-xs text-rose-400 font-bold">गलत (Wrong)</p>
              <p className="text-2xl font-bold text-rose-300 mt-1">{res.wrong}</p>
            </div>
            <div className="bg-slate-700/40 border border-slate-600/30 p-4 rounded-2xl">
              <p className="text-xs text-slate-400 font-bold">छोड़े गए</p>
              <p className="text-2xl font-bold text-slate-300 mt-1">{res.unattempted}</p>
            </div>
          </div>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition"
          >
            डैशबोर्ड पर वापस जाएँ
          </button>
        </div>
      </main>
    );
  }

  const currentQ = questions[currentIdx];
  const optionsList = typeof currentQ?.options === 'string' ? JSON.parse(currentQ?.options) : currentQ?.options || [];
  const activeNeg = testDetails?.negative_marks !== undefined ? Number(testDetails.negative_marks) : 0.50;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md text-xs md:text-sm">
            EX
          </div>
          <div>
            <h1 className="font-bold text-xs md:text-sm text-white truncate max-w-[130px] md:max-w-xs">{testDetails?.title || `Test #${testId}`}</h1>
            <p className="text-[10px] md:text-xs text-slate-400">Time: {testDetails?.duration_minutes}m • Neg: -{activeNeg}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-slate-800 border border-slate-700 px-2.5 md:px-4 py-1 rounded-xl flex items-center gap-1.5 md:gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-mono text-xs md:text-sm font-bold text-rose-400">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowPaletteMobile(!showPaletteMobile)}
            className="md:hidden bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl font-bold"
          >
            📋 {currentIdx + 1}/{questions.length}
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-xl transition shadow"
          >
            Submit
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col bg-slate-900/40 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-800 text-xs">
                <span className="font-bold tracking-wider text-indigo-400 uppercase">
                  प्रश्न {currentIdx + 1} / {questions.length}
                </span>
                <div className="flex gap-2">
                  <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    +{currentQ?.marks || 2}
                  </span>
                  <span className="text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    -{activeNeg}
                  </span>
                </div>
              </div>

              {/* कथन और प्रश्न को सुरक्षित मल्टी-लाइन में दिखाना */}
              <div className="text-sm md:text-base font-semibold text-slate-100 leading-relaxed mb-6 whitespace-pre-line">
                {currentQ?.question_text}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {optionsList.map((opt: string, i: number) => {
                  const isChecked = selectedAnswers[currentIdx] === i;
                  return (
                    <label
                      key={i}
                      onClick={() => handleSelectOption(i)}
                      className={`flex items-center gap-3.5 p-3.5 md:p-4 rounded-2xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                          : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${
                          isChecked
                            ? 'bg-indigo-500 border-indigo-400 text-white'
                            : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-xs md:text-sm font-medium">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Desktop Question Palette */}
        <aside className="w-80 bg-slate-900 p-6 flex-col justify-between hidden md:flex border-l border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Question Palette</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 border-b border-slate-800 pb-3 text-slate-300">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-500"></span> Unanswered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-600"></span> Review</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-700"></span> Not Visited</div>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {questions.map((_, idx) => {
                const st = statusMap[idx] || 'not_visited';
                let bgClass = 'bg-slate-800 text-slate-400 border border-slate-700';
                if (st === 'answered') bgClass = 'bg-emerald-600 text-white';
                if (st === 'unanswered') bgClass = 'bg-rose-600 text-white';
                if (st === 'review') bgClass = 'bg-purple-600 text-white';
                if (st === 'review_answered') bgClass = 'bg-purple-600 border-2 border-emerald-400 text-white';

                const isCurrent = currentIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${bgClass} ${
                      isCurrent ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs transition shadow-lg"
          >
            Submit Test
          </button>
        </aside>

        {/* Mobile Question Palette Modal */}
        {showPaletteMobile && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-end md:hidden">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Question Palette</h3>
                <button onClick={() => setShowPaletteMobile(false)} className="text-slate-400 text-xs font-bold p-1">✕ बंद करें</button>
              </div>
              <div className="grid grid-cols-5 gap-2 overflow-y-auto p-1 flex-1">
                {questions.map((_, idx) => {
                  const st = statusMap[idx] || 'not_visited';
                  let bgClass = 'bg-slate-800 text-slate-400 border border-slate-700';
                  if (st === 'answered') bgClass = 'bg-emerald-600 text-white';
                  if (st === 'unanswered') bgClass = 'bg-rose-600 text-white';
                  if (st === 'review') bgClass = 'bg-purple-600 text-white';
                  if (st === 'review_answered') bgClass = 'bg-purple-600 border-2 border-emerald-400 text-white';

                  return (
                    <button
                      key={idx}
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center ${bgClass} ${
                        currentIdx === idx ? 'ring-2 ring-indigo-400' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar (Mobile Friendly) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleClearResponse}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold"
            >
              Clear
            </button>
            <button
              onClick={handleMarkForReview}
              className="px-3 py-2 bg-purple-950/70 border border-purple-700/50 text-purple-300 rounded-xl text-[11px] font-semibold"
            >
              Review
            </button>
          </div>

          <div className="flex gap-2">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(currentIdx - 1)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={handleSaveAndNext}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save & Next
            </button>
          </div>
        </div>
      </footer>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 max-w-sm w-full p-6 rounded-3xl shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">क्या आप टेस्ट सबमिट करना चाहते हैं?</h3>
            <p className="text-xs text-slate-400">सबमिट करने के बाद आप उत्तर नहीं बदल सकेंगे।</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-xl text-xs font-semibold"
              >
                कैंसिल
              </button>
              <button
                onClick={finalizeSubmission}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold"
              >
                सबमिट करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
