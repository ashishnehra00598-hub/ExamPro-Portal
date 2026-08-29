'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAIL = 'nehraa365@gmail.com';

export default function AdminControlMaster() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [tab, setTab] = useState<'questions' | 'tests' | 'exams' | 'capsule'>('questions');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testCategory, setTestCategory] = useState('Rajasthan CET (10+2)');
  const [testType, setTestType] = useState('Full Mock Test');
  const [testDuration, setTestDuration] = useState(60);
  const [testMarks, setTestMarks] = useState(100);
  const [negativeMarks, setNegativeMarks] = useState(0.50);

  const [selectedTestId, setSelectedTestId] = useState(1);
  const [testsList, setTestsList] = useState<any[]>([]);
  const [rawTextInput, setRawTextInput] = useState('');
  const [defaultMarks, setDefaultMarks] = useState(2);

  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examBadge, setExamBadge] = useState('Imp Exam');
  const [matTitle, setMatTitle] = useState('');
  const [matCategory, setMatCategory] = useState('Current Affairs');
  const [matContent, setMatContent] = useState('');

  useEffect(() => {
    async function verifyAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        alert('अनधिकृत प्रवेश! केवल एडमिन को अनुमति है।');
        window.location.href = '/dashboard';
        return;
      }
      setIsAdmin(true);
      setAuthChecking(false);

      const { data } = await supabase.from('tests').select('id, title, category, test_type, negative_marks');
      if (data && data.length > 0) {
        setTestsList(data);
        setSelectedTestId(data[0].id);
      }
    }
    verifyAdmin();
  }, [tab]);

  const cleanCitationTags = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\[\s*cite\s*:\s*[\d\s,]+\]/gi, '')
      .replace(/cite\s*:\s*\d+/gi, '')
      .replace(/\[\d+\]/g, '')
      .trim();
  };

  // कथन और बहु-पंक्ति प्रश्नों को सुरक्षित पार्स करने वाला फ़ंक्शन
  const parseQuestionsRobust = (text: string) => {
    const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const questions: any[] = [];
    let currentQ: any = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // केवल Q1, Q.1, प्रश्न 1 से नया प्रश्न शुरू होगा (कथन 1., 2. को प्रश्न का हिस्सा माना जाएगा)
      const isNewQuestion = /^(Q\s*\.?\s*\d+|प्रश्न\s*\.?\s*\d+)[\.\:\)\s\-]/i.test(line);

      if (isNewQuestion) {
        if (currentQ && currentQ.question_text && currentQ.options.length >= 2) {
          questions.push(currentQ);
        }
        const cleanedQ = cleanCitationTags(line.replace(/^(Q\s*\.?\s*\d+|प्रश्न\s*\.?\s*\d+)[\.\:\)\s\-]*/i, ''));
        currentQ = {
          test_id: Number(selectedTestId),
          question_text: cleanedQ,
          options: [],
          correct_option: 0,
          marks: Number(defaultMarks),
        };
        continue;
      }

      if (!currentQ) {
        currentQ = {
          test_id: Number(selectedTestId),
          question_text: cleanCitationTags(line),
          options: [],
          correct_option: 0,
          marks: Number(defaultMarks),
        };
        continue;
      }

      // Options detection (A., B., C., D. या (A), (B))
      const isOptA = /^(\([A1a]\)|[A1a][\.\:\)\s\-])/i.test(line);
      const isOptB = /^(\([B2b]\)|[B2b][\.\:\)\s\-])/i.test(line);
      const isOptC = /^(\([C3c]\)|[C3c][\.\:\)\s\-])/i.test(line);
      const isOptD = /^(\([D4d]\)|[D4d][\.\:\)\s\-])/i.test(line);

      if (isOptA) {
        currentQ.options[0] = cleanCitationTags(line.replace(/^(\([A1a]\)|[A1a][\.\:\)\s\-])\s*/i, ''));
      } else if (isOptB) {
        currentQ.options[1] = cleanCitationTags(line.replace(/^(\([B2b]\)|[B2b][\.\:\)\s\-])\s*/i, ''));
      } else if (isOptC) {
        currentQ.options[2] = cleanCitationTags(line.replace(/^(\([C3c]\)|[C3c][\.\:\)\s\-])\s*/i, ''));
      } else if (isOptD) {
        currentQ.options[3] = cleanCitationTags(line.replace(/^(\([D4d]\)|[D4d][\.\:\)\s\-])\s*/i, ''));
      } else if (/^(Ans|Answer|उत्तर|सही उत्तर)[\s\.\:\-\=]*/i.test(line)) {
        const val = cleanCitationTags(line.replace(/^(Ans|Answer|उत्तर|सही उत्तर)[\s\.\:\-\=]*/i, '')).toUpperCase();
        if (val.startsWith('A') || val === '1') currentQ.correct_option = 0;
        else if (val.startsWith('B') || val === '2') currentQ.correct_option = 1;
        else if (val.startsWith('C') || val === '3') currentQ.correct_option = 2;
        else if (val.startsWith('D') || val === '4') currentQ.correct_option = 3;
      } else {
        // कथन (1, 2, 3) या अतिरिक्त प्रश्न विवरण को प्रश्न में जोड़ना
        if (currentQ.options.length === 0) {
          currentQ.question_text += '\n' + cleanCitationTags(line);
        }
      }
    }

    if (currentQ && currentQ.question_text && currentQ.options.length >= 2) {
      questions.push(currentQ);
    }
    return questions;
  };

  const handleSmartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');

    try {
      let finalQuestions: any[] = [];
      if (rawTextInput.trim().startsWith('[')) {
        const parsedJSON = JSON.parse(rawTextInput);
        finalQuestions = parsedJSON.map((item: any) => ({
          test_id: Number(selectedTestId),
          question_text: cleanCitationTags(item.question),
          options: Array.isArray(item.options) ? item.options.map((opt: string) => cleanCitationTags(opt)) : [],
          correct_option: typeof item.answer === 'string' ? item.answer.trim().toUpperCase().charCodeAt(0) - 65 : Number(item.answer || 0),
          marks: Number(item.marks || defaultMarks),
        }));
      } else {
        finalQuestions = parseQuestionsRobust(rawTextInput);
      }

      if (finalQuestions.length === 0) {
        throw new Error('कोई सवाल सही से नहीं पढ़ा जा सका। कृपया फॉर्मेट जाँचें (जैसे Q1. प्रश्न... A. B. C. D. Answer: A)');
      }

      const chunkSize = 30;
      for (let i = 0; i < finalQuestions.length; i += chunkSize) {
        const chunk = finalQuestions.slice(i, i + chunkSize);
        const { error } = await supabase.from('questions').insert(chunk);
        if (error) throw new Error(error.message);
      }

      setLoading(false);
      setStatusMsg(`शानदार! कुल ${finalQuestions.length} सवाल पूरे कथनों के साथ Test #${selectedTestId} में सेव हो गए।`);
      setRawTextInput('');
    } catch (err: any) {
      setLoading(false);
      setStatusMsg('अपलोड एरर: ' + err.message);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    const { error } = await supabase.from('tests').insert([
      {
        title: testTitle,
        description: testDesc,
        category: testCategory,
        test_type: testType,
        duration_minutes: testDuration,
        total_marks: testMarks,
        negative_marks: Number(negativeMarks),
      },
    ]);
    setLoading(false);
    if (error) setStatusMsg('Error: ' + error.message);
    else {
      setStatusMsg(`नया टेस्ट [${testCategory} - ${testType}] सफलता से बन गया!`);
      setTestTitle('');
      setTestDesc('');
      const { data } = await supabase.from('tests').select('id, title, category, test_type, negative_marks');
      if (data) setTestsList(data);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    const { error } = await supabase.from('exam_alerts').insert([
      { exam_name: examName, exam_date: examDate, badge_text: examBadge }
    ]);
    setLoading(false);
    if (error) setStatusMsg('Error: ' + error.message);
    else {
      setStatusMsg('परीक्षा अलर्ट जुड़ गया!');
      setExamName('');
      setExamDate('');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    const { error } = await supabase.from('study_materials').insert([
      { title: matTitle, category: matCategory, content_or_link: matContent }
    ]);
    setLoading(false);
    if (error) setStatusMsg('Error: ' + error.message);
    else {
      setStatusMsg('स्टडी नोट्स सेव हो गए!');
      setMatTitle('');
      setMatContent('');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        एडमिन सुरक्षा जांच जारी है...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-black text-white">Smart Admin Master Controller 🔒</h1>
            <p className="text-xs text-slate-400">कथन आधारित प्रश्न एवं टेस्ट कंट्रोल</p>
          </div>
          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl transition"
          >
            डैशबोर्ड देखें
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          {[
            { id: 'questions', label: '1. 🚀 सवाल अपलोड' },
            { id: 'tests', label: '2. नया टेस्ट बनाएँ' },
            { id: 'exams', label: '3. एग्जाम अलर्ट' },
            { id: 'capsule', label: '4. नोट्स / PDF' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as any); setStatusMsg(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition ${
                tab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {statusMsg && (
          <div className={`mb-6 p-4 rounded-2xl text-xs font-bold text-center border ${
            statusMsg.includes('एरर') || statusMsg.includes('Error')
              ? 'bg-rose-950/40 border-rose-800/40 text-rose-400'
              : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
          }`}>
            {statusMsg}
          </div>
        )}

        {tab === 'questions' && (
          <form onSubmit={handleSmartUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">टेस्ट चुनें</label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 outline-none cursor-pointer"
                >
                  {testsList.map((t) => (
                    <option key={t.id} value={t.id}>Test #{t.id}: [{t.category}] {t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">प्रति प्रश्न सही अंक (+Marks)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultMarks}
                  onChange={(e) => setDefaultMarks(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">सवाल यहाँ पेस्ट करें (कथन सहित पूरा पेस्ट करें):</label>
                <span className="text-[11px] text-emerald-400 font-medium">Statements Protected</span>
              </div>
              <textarea
                required
                rows={12}
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder={`Q1. भटनेर दुर्ग के संदर्भ में निम्न कथनों पर विचार कीजिये-\n1. यह भारत के सबसे पुराने किलो में से एक है।\n2. इसे उत्तरी सीमा का प्रहरी भी कहा जाता है।\n3. 52 बीघा भूमि इसमें स्थित है।\nउपरोक्त में से कौनसा कथन सत्य हैं?\nA. केवल 1 व 2\nB. केवल 2 व 3\nC. केवल 1 व 3\nD. 1, 2 व 3\nAnswer: D`}
                className="w-full font-mono text-xs p-4 bg-slate-950 border border-slate-800 rounded-2xl text-indigo-300 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold py-4 rounded-xl shadow-lg transition"
            >
              {loading ? 'अपलोड हो रहा है...' : '🚀 सभी सवाल अपलोड करें'}
            </button>
          </form>
        )}

        {tab === 'tests' && (
          <form onSubmit={handleAddTest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">🎯 1. परीक्षा चुनें (Exam)</label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 outline-none font-bold cursor-pointer"
                >
                  <option value="Rajasthan CET (10+2)">Rajasthan CET (10+2)</option>
                  <option value="Rajasthan CET (Graduation)">Rajasthan CET (Graduation)</option>
                  <option value="Rajasthan Police Constable">Rajasthan Police Constable</option>
                  <option value="Rajasthan Police SI">Rajasthan Police SI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">📑 2. टेस्ट का प्रकार</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 outline-none font-bold cursor-pointer"
                >
                  <option value="Full Mock Test">📑 Full Mock Test (पूरा पेपर)</option>
                  <option value="Subject-wise">📚 Subject-wise Test (विषयवार)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">टेस्ट का नाम (Test Title)</label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="उदा. Rajasthan CET Full Mock #01"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">विवरण (Description)</label>
              <textarea
                rows={2}
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
                placeholder="टेस्ट के बारे में संक्षिप्त जानकारी..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">समय (Minutes)</label>
                <input
                  type="number"
                  value={testDuration}
                  onChange={(e) => setTestDuration(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">कुल पूर्णांक (Total Marks)</label>
                <input
                  type="number"
                  value={testMarks}
                  onChange={(e) => setTestMarks(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-400 mb-1">❌ नेगेटिव मार्किंग</label>
                <select
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-rose-900/60 rounded-xl text-xs text-rose-300 font-bold outline-none cursor-pointer"
                >
                  <option value={0}>0 (No Negative Marking)</option>
                  <option value={0.25}>-0.25 (1/4th Marks)</option>
                  <option value={0.33}>-0.33 (1/3rd Marks)</option>
                  <option value={0.50}>-0.50 (1/2 Marks)</option>
                  <option value={0.66}>-0.66 (2/3rd Marks)</option>
                  <option value={1.00}>-1.00 (1 Full Mark)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg transition mt-4"
            >
              {loading ? 'सेव हो रहा है...' : 'नया टेस्ट बनाएँ (Create Test)'}
            </button>
          </form>
        )}

        {tab === 'exams' && (
          <form onSubmit={handleAddExam} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">परीक्षा का नाम</label>
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="उदा. Rajasthan CET 2026"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">परीक्षा तारीख</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">बैज</label>
                <input
                  type="text"
                  value={examBadge}
                  onChange={(e) => setExamBadge(e.target.value)}
                  placeholder="Target #01"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg transition"
            >
              {loading ? 'सेव हो रहा है...' : 'एग्जाम अलर्ट जोड़ें'}
            </button>
          </form>
        )}

        {tab === 'capsule' && (
          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">शीर्षक</label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="उदा. राजस्थान भूगोल PYQ"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">श्रेणी</label>
                <select
                  value={matCategory}
                  onChange={(e) => setMatCategory(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="Current Affairs">Current Affairs</option>
                  <option value="PDF Notes">PDF Notes / PYQ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">कंटेंट या लिंक</label>
              <textarea
                rows={3}
                required
                value={matContent}
                onChange={(e) => setMatContent(e.target.value)}
                placeholder="यहाँ नोट्स लिखें..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg transition"
            >
              {loading ? 'सेव हो रहा है...' : 'अपडेट सेव करें'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
