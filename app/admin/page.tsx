'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAIL = 'nehraa365@gmail.com';

interface ParsedQuestion {
  id: string;
  test_id: number;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

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

  // Live Review & Edit State
  const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestion[]>([]);

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

  const cleanText = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\[\s*cite\s*:\s*[\d\s,]+\]/gi, '')
      .replace(/cite\s*:\s*\d+/gi, '')
      .replace(/\[\d+\]/g, '')
      .trim();
  };

  const parseQuestionsAdvanced = (text: string): ParsedQuestion[] => {
    const rawBlocks = text.split(/\n(?=(?:Q\s*\.?\s*\d+|प्रश्न\s*\.?\s*\d+)[\.\:\)\s\-])/i);
    const parsed: ParsedQuestion[] = [];

    for (let bIndex = 0; bIndex < rawBlocks.length; bIndex++) {
      const block = rawBlocks[bIndex].trim();
      if (!block) continue;

      const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) continue;

      let questionLines: string[] = [];
      let options: string[] = [];
      let answerIndex = 0;
      let inOptions = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i === 0 && /^(Q\s*\.?\s*\d+|प्रश्न\s*\.?\s*\d+)[\.\:\)\s\-]*/i.test(line)) {
          const cleanFirstLine = line.replace(/^(Q\s*\.?\s*\d+|प्रश्न\s*\.?\s*\d+)[\.\:\)\s\-]*/i, '').trim();
          if (cleanFirstLine) questionLines.push(cleanText(cleanFirstLine));
          continue;
        }

        if (/^(Ans|Answer|उत्तर|सही उत्तर)[\s\.\:\-\=]*/i.test(line)) {
          const ansVal = line.replace(/^(Ans|Answer|उत्तर|सही उत्तर)[\s\.\:\-\=]*/i, '').trim().toUpperCase();
          if (ansVal.startsWith('A') || ansVal === '1' || ansVal.startsWith('क')) answerIndex = 0;
          else if (ansVal.startsWith('B') || ansVal === '2' || ansVal.startsWith('ख')) answerIndex = 1;
          else if (ansVal.startsWith('C') || ansVal === '3' || ansVal.startsWith('ग')) answerIndex = 2;
          else if (ansVal.startsWith('D') || ansVal === '4' || ansVal.startsWith('घ')) answerIndex = 3;
          continue;
        }

        const optMatch = line.match(/^(\([A-Da-d]\)|[A-Da-d][\.\:\)\-\s]+|\([1-4]\)|[1-4][\.\:\)\-\s]+|\([क-घ]\)|[क-घ][\.\:\)\-\s]+)(.*)/);
        const isStrictOption = /^(\([A-Da-d]\)|[A-Da-d][\.\:\)\-\s]+|\([क-घ]\)|[क-घ][\.\:\)\-\s]+)/i.test(line);

        if (isStrictOption) {
          inOptions = true;
          const optContent = line.replace(/^(\([A-Da-d]\)|[A-Da-d][\.\:\)\-\s]+|\([क-घ]\)|[क-घ][\.\:\)\-\s]+)\s*/i, '').trim();
          options.push(cleanText(optContent));
        } else if (inOptions && optMatch) {
          const optContent = optMatch[2].trim();
          options.push(cleanText(optContent));
        } else {
          questionLines.push(cleanText(line));
        }
      }

      const fullQuestionText = questionLines.join('\n').trim();

      if (fullQuestionText && options.length >= 2) {
        parsed.push({
          id: `q_${Date.now()}_${bIndex}`,
          test_id: Number(selectedTestId),
          question_text: fullQuestionText,
          options: options,
          correct_option: answerIndex,
          marks: Number(defaultMarks),
        });
      }
    }
    return parsed;
  };

  const handleGeneratePreview = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      let finalQuestions: ParsedQuestion[] = [];
      if (rawTextInput.trim().startsWith('[')) {
        const parsedJSON = JSON.parse(rawTextInput);
        finalQuestions = parsedJSON.map((item: any, idx: number) => ({
          id: `q_${Date.now()}_${idx}`,
          test_id: Number(selectedTestId),
          question_text: cleanText(item.question),
          options: Array.isArray(item.options) ? item.options.map((opt: string) => cleanText(opt)) : [],
          correct_option: typeof item.answer === 'string' ? item.answer.trim().toUpperCase().charCodeAt(0) - 65 : Number(item.answer || 0),
          marks: Number(item.marks || defaultMarks),
        }));
      } else {
        finalQuestions = parseQuestionsAdvanced(rawTextInput);
      }

      if (finalQuestions.length === 0) {
        throw new Error('कोई सवाल सही से नहीं पढ़ा जा सका। कृपया फॉर्मेट जाँचें।');
      }

      setPreviewQuestions(finalQuestions);
      setStatusMsg(`कुल ${finalQuestions.length} सवाल तैयार हैं। नीचे चेक करें, एडिट करें और फिर डेटाबेस में सेव करें!`);
    } catch (err: any) {
      setStatusMsg('एरर: ' + err.message);
    }
  };

  const updateQuestionField = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...previewQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...previewQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = text;
    updated[qIndex].options = newOptions;
    setPreviewQuestions(updated);
  };

  const removeQuestionFromPreview = (index: number) => {
    const updated = previewQuestions.filter((_, i) => i !== index);
    setPreviewQuestions(updated);
  };

  const handleFinalUploadToDatabase = async () => {
    if (previewQuestions.length === 0) return;
    setLoading(true);
    setStatusMsg('');

    try {
      const payload = previewQuestions.map(({ id, ...rest }) => ({
        ...rest,
        test_id: Number(selectedTestId),
      }));

      const chunkSize = 30;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from('questions').insert(chunk);
        if (error) throw new Error(error.message);
      }

      setLoading(false);
      setStatusMsg(`🎉 बधाई! सभी ${previewQuestions.length} सवाल Test #${selectedTestId} में सफलतापूर्वक सेव हो गए!`);
      setPreviewQuestions([]);
      setRawTextInput('');
    } catch (err: any) {
      setLoading(false);
      setStatusMsg('डेटाबेस सेव एरर: ' + err.message);
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
      setStatusMsg(`नया टेस्ट [${testCategory} - ${testType}] बन गया!`);
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
            <p className="text-xs text-slate-400">लाइव प्रीव्यू, एडिट एवं कथन सुरक्षित सिस्टम</p>
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
            { id: 'questions', label: '1. 🚀 सवाल अपलोड & रिव्यू' },
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
          <div className="space-y-6">
            <form onSubmit={handleGeneratePreview} className="space-y-4">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">प्रति प्रश्न अंक (+Marks)</label>
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  सवाल यहाँ पेस्ट करें (कथन सहित):
                </label>
                <textarea
                  required
                  rows={8}
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  placeholder={`Q1. भटनेर दुर्ग के संदर्भ में निम्न कथनों पर विचार कीजिये-\n1. यह भारत के सबसे पुराने किलो में से एक है।\n2. इसे उत्तरी सीमा का प्रहरी भी कहा जाता है।\n3. 52 बीघा भूमि इसमें स्थित है।\nउपरोक्त में से कौनसा कथन सत्य हैं?\nA. केवल 1 व 2\nB. केवल 2 व 3\nC. केवल 1 व 3\nD. 1, 2 व 3\nAnswer: D`}
                  className="w-full font-mono text-xs p-4 bg-slate-950 border border-slate-800 rounded-2xl text-indigo-300 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 text-xs font-bold py-3.5 rounded-xl shadow transition"
              >
                🔍 सवाल चेक और एडिट करें (Preview & Check)
              </button>
            </form>

            {/* Live Editable Review Cards */}
            {previewQuestions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-emerald-400">
                    📋 चेक करें ({previewQuestions.length} प्रश्न तैयार हैं):
                  </h3>
                  <span className="text-[11px] text-slate-400">आप सीधे बॉक्स में सुधार कर सकते हैं</span>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {previewQuestions.map((q, qIdx) => (
                    <div key={q.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400">प्रश्न #{qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeQuestionFromPreview(qIdx)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          🗑️ हटाएँ
                        </button>
                      </div>

                      {/* Editable Question & Statements */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">प्रश्न व कथन (Editable):</label>
                        <textarea
                          rows={4}
                          value={q.question_text}
                          onChange={(e) => updateQuestionField(qIdx, 'question_text', e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 font-sans leading-relaxed"
                        />
                      </div>

                      {/* Editable Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                            <span className="text-xs font-bold text-indigo-400 w-5 text-center">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                              className="w-full bg-transparent text-xs text-slate-200 outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Correct Answer & Marks Selection */}
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-semibold">सही उत्तर:</label>
                          <select
                            value={q.correct_option}
                            onChange={(e) => updateQuestionField(qIdx, 'correct_option', Number(e.target.value))}
                            className="bg-slate-900 border border-emerald-600/50 text-emerald-400 text-xs font-bold p-1.5 rounded-lg outline-none cursor-pointer"
                          >
                            {q.options.map((_, i) => (
                              <option key={i} value={i}>
                                Option {String.fromCharCode(65 + i)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-semibold">अंक:</label>
                          <input
                            type="number"
                            step="0.5"
                            value={q.marks}
                            onChange={(e) => updateQuestionField(qIdx, 'marks', Number(e.target.value))}
                            className="w-16 bg-slate-900 border border-slate-700 text-xs text-white p-1.5 rounded-lg text-center outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Upload Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalUploadToDatabase}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-4 rounded-xl shadow-lg transition"
                >
                  {loading ? 'डेटाबेस में सेव हो रहा है...' : `✅ सब ठीक है! सभी ${previewQuestions.length} सवाल टेस्ट #${selectedTestId} में सेव करें`}
                </button>
              </div>
            )}
          </div>
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
