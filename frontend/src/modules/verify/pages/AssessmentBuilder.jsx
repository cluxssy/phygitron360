import React, { useState, useEffect } from 'react';
import {
  Plus, Loader2, Save, Send, UploadCloud, Link as LinkIcon,
  Image as ImageIcon, Play, CheckCircle, Trash2, ArrowUp, ArrowDown,
  Wand2, Settings, List, Eye, Shuffle, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

const QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'written', label: 'Written Answer' },
  { id: 'coding', label: 'Coding Challenge' },
  { id: 'file_upload', label: 'File Upload' },
];

export default function AssessmentBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const asmId = params.get('id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Mixed');
  const [timeLimit, setTimeLimit] = useState(60);
  const [passScore, setPassScore] = useState(70);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(true);

  // Questions
  const [questions, setQuestions] = useState([]);
  
  // Modals
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);

  useEffect(() => {
    if (asmId) {
      setLoading(true);
      fetch(`/api/verify/builder/assessments/${asmId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const asm = d.data;
            setTitle(asm.title);
            setDescription(asm.description || '');
            setType(asm.type);
            setTimeLimit(asm.time_limit_minutes);
            setPassScore(asm.pass_score);
            setShuffleQuestions(asm.shuffle_questions);
            setShowResultImmediately(asm.show_result_immediately);
            setQuestions(asm.questions || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [asmId]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `temp_${Date.now()}`,
        question_type: 'mcq',
        question_text: '',
        marks: 1.0,
        options: ['', ''],
        correct_answer: '',
        model_answer: '',
        programming_language: 'python',
        starter_code: '',
        test_cases: [],
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], [field]: value };
    setQuestions(newQs);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newQs = [...questions];
      [newQs[index - 1], newQs[index]] = [newQs[index], newQs[index - 1]];
      setQuestions(newQs);
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQs = [...questions];
      [newQs[index + 1], newQs[index]] = [newQs[index], newQs[index + 1]];
      setQuestions(newQs);
    }
  };

  const handleImportUrl = async (e) => {
    e.preventDefault();
    if (!importUrl) return;
    setImportingUrl(true);
    try {
      const r = await fetch('/api/verify/builder/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setQuestions([...questions, ...d.data]);
        setShowImportUrl(false);
        setImportUrl('');
        toast.success('Questions imported!');
      } else {
        toast.error(d.detail || 'Import failed');
      }
    } catch (e) {
      toast.error('Import failed');
    } finally {
      setImportingUrl(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!title) return toast.error('Title is required');
    if (questions.length === 0 && publish) return toast.error('Add questions before publishing');
    
    setSaving(true);
    const payload = {
      title,
      description,
      type,
      time_limit_minutes: timeLimit,
      pass_score: passScore,
      shuffle_questions: shuffleQuestions,
      show_result_immediately: showResultImmediately,
      questions: questions.map((q, i) => ({ ...q, order_index: i }))
    };

    try {
      let r, d;
      if (asmId) {
        // Update
        r = await fetch(`/api/verify/builder/assessments/${asmId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        d = await r.json();
      } else {
        // Create
        r = await fetch('/api/verify/builder/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        d = await r.json();
      }

      if (r.ok && d.success) {
        const newId = asmId || d.data.id;
        if (publish) {
          const pr = await fetch(`/api/verify/builder/assessments/${newId}/publish`, {
            method: 'POST'
          });
          if (pr.ok) {
            toast.success('Assessment published!');
            navigate('/verify?tab=manage');
            return;
          }
        }
        toast.success('Assessment saved!');
        if (!asmId) navigate(`/verify?tab=builder&id=${newId}`);
      } else {
        toast.error(d.detail || 'Save failed');
      }
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">
          Assessment <span className="text-primary">Builder</span>
        </h1>
        <div className="flex gap-2">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="px-6 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors">
              Next Step
            </button>
          ) : (
            <>
              <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2 rounded-xl bg-white/5 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2">
                <Save size={14} /> Draft
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="px-6 py-2 rounded-xl bg-emerald-400 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-300 transition-colors flex items-center gap-2">
                <Send size={14} /> Publish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex gap-4">
        {[
          { icon: Settings, label: 'Settings' },
          { icon: List, label: 'Questions' },
          { icon: Eye, label: 'Review' }
        ].map((s, i) => (
          <div key={i} className={`flex-1 flex items-center gap-3 p-4 rounded-xl border ${step === i + 1 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-white/40'}`}>
            <s.icon size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Step {i + 1}: {s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Settings */}
      {step === 1 && (
        <div className="glass-panel p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40" placeholder="e.g. Senior Frontend Developer Assessment" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40 min-h-[100px]" placeholder="Brief description of the assessment..." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Assessment Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40">
                <option value="Mixed">Mixed</option>
                <option value="MCQ">Multiple Choice Only</option>
                <option value="Coding">Coding Only</option>
                <option value="Written">Written Only</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Time Limit (Minutes)</label>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Pass Score (%)</label>
              <input type="number" value={passScore} onChange={e => setPassScore(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40" />
            </div>
          </div>
          <div className="flex gap-6 pt-4 border-t border-white/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="hidden" />
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${shuffleQuestions ? 'bg-primary border-primary text-black' : 'border-white/20 text-transparent group-hover:border-white/40'}`}>
                <CheckCircle size={12} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white/70">Shuffle Questions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={showResultImmediately} onChange={e => setShowResultImmediately(e.target.checked)} className="hidden" />
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showResultImmediately ? 'bg-primary border-primary text-black' : 'border-white/20 text-transparent group-hover:border-white/40'}`}>
                <CheckCircle size={12} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white/70">Show Result Immediately</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Questions */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <button onClick={addQuestion} className="px-4 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-2">
              <Plus size={14} /> Add Question
            </button>
            <button onClick={() => setShowImportUrl(true)} className="px-4 py-3 rounded-xl bg-white/5 text-white/70 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2">
              <LinkIcon size={14} /> Import from URL (LeetCode)
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="glass-panel p-12 text-center text-white/40 text-xs font-black uppercase tracking-widest">
              No questions added yet.
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.id || i} className="glass-panel p-6 border-l-2 border-l-primary relative group">
                  <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveQuestion(i, 'up')} disabled={i === 0} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30"><ArrowUp size={14}/></button>
                    <button onClick={() => moveQuestion(i, 'down')} disabled={i === questions.length - 1} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30"><ArrowDown size={14}/></button>
                    <button onClick={() => removeQuestion(i)} className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"><Trash2 size={14}/></button>
                  </div>

                  <div className="flex gap-4 mb-4 pr-32">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-display font-black text-lg text-white/40 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex gap-4">
                        <select value={q.question_type} onChange={e => updateQuestion(i, 'question_type', e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
                          {QUESTION_TYPES.map(qt => <option key={qt.id} value={qt.id}>{qt.label}</option>)}
                        </select>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <span className="text-[10px] font-black uppercase text-white/40">Marks:</span>
                          <input type="number" value={q.marks || 1} onChange={e => updateQuestion(i, 'marks', parseFloat(e.target.value) || 0)} className="bg-transparent w-12 text-xs text-white outline-none text-right" />
                        </div>
                      </div>

                      <textarea
                        value={q.question_text}
                        onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                        placeholder="Enter question text... (Markdown supported)"
                        className="w-full bg-transparent border-b border-white/10 focus:border-primary outline-none py-2 text-sm text-white resize-none min-h-[60px]"
                      />

                      {/* Type-specific UI */}
                      {q.question_type === 'mcq' && (
                        <div className="space-y-2 mt-4 pl-4 border-l border-white/10">
                          {(q.options || []).map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={`correct_${i}`}
                                checked={q.correct_answer === opt && opt !== ''}
                                onChange={() => updateQuestion(i, 'correct_answer', opt)}
                                className="w-4 h-4 accent-primary"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...(q.options || [])];
                                  newOpts[oIdx] = e.target.value;
                                  updateQuestion(i, 'options', newOpts);
                                  if (q.correct_answer === opt) updateQuestion(i, 'correct_answer', e.target.value);
                                }}
                                placeholder={`Option ${oIdx + 1}`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50"
                              />
                              <button onClick={() => updateQuestion(i, 'options', q.options.filter((_, idx) => idx !== oIdx))} className="text-white/30 hover:text-rose-400"><X size={14}/></button>
                            </div>
                          ))}
                          <button onClick={() => updateQuestion(i, 'options', [...(q.options || []), ''])} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors mt-2">
                            + Add Option
                          </button>
                        </div>
                      )}

                      {q.question_type === 'coding' && (
                        <div className="space-y-4 mt-4 p-4 bg-black/30 rounded-xl border border-white/5">
                          <div className="flex gap-4 items-center">
                            <select value={q.programming_language || 'python'} onChange={e => updateQuestion(i, 'programming_language', e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
                              <option value="python">Python</option>
                              <option value="javascript">JavaScript</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                              <Wand2 size={12} /> AI Generate Template
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Starter Code</label>
                            <textarea
                              value={q.starter_code || ''}
                              onChange={e => updateQuestion(i, 'starter_code', e.target.value)}
                              className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono outline-none min-h-[120px]"
                              placeholder="def solve(x):\n    pass"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex justify-between">
                              <span>Test Cases</span>
                              <button onClick={() => updateQuestion(i, 'test_cases', [...(q.test_cases || []), {input: '', expected_output: ''}])} className="text-primary hover:text-white">+ Add Test</button>
                            </label>
                            <div className="space-y-2">
                              {(q.test_cases || []).map((tc, tIdx) => (
                                <div key={tIdx} className="flex gap-2 items-start bg-white/5 p-2 rounded-lg">
                                  <textarea value={tc.input} onChange={e => {
                                    const tcs = [...q.test_cases]; tcs[tIdx].input = e.target.value; updateQuestion(i, 'test_cases', tcs);
                                  }} placeholder="Input (stdin)" className="flex-1 bg-transparent border border-white/10 rounded p-2 text-xs font-mono text-white outline-none h-16 resize-none" />
                                  <textarea value={tc.expected_output} onChange={e => {
                                    const tcs = [...q.test_cases]; tcs[tIdx].expected_output = e.target.value; updateQuestion(i, 'test_cases', tcs);
                                  }} placeholder="Expected Output" className="flex-1 bg-transparent border border-white/10 rounded p-2 text-xs font-mono text-white outline-none h-16 resize-none" />
                                  <button onClick={() => updateQuestion(i, 'test_cases', q.test_cases.filter((_, idx) => idx !== tIdx))} className="p-2 text-white/30 hover:text-rose-400"><Trash2 size={14}/></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {q.question_type === 'written' && (
                        <div className="mt-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Model Answer (for AI Grading)</label>
                          <textarea
                            value={q.model_answer || ''}
                            onChange={e => updateQuestion(i, 'model_answer', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40 min-h-[80px]"
                            placeholder="Expected points to cover..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="glass-panel p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-display font-black text-white">{title}</h2>
            <p className="text-sm text-white/50 mt-2">{description}</p>
            <div className="flex justify-center gap-4 mt-6">
              <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60">{type}</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60">{timeLimit} Mins</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60">{questions.length} Questions</span>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Question Summary</h3>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                    <span className="text-sm text-white/80 line-clamp-1">{q.question_text || '(Empty Question)'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{q.question_type}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{q.marks} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImportUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportUrl(false)}>
          <div className="glass-panel w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowImportUrl(false)} className="absolute top-5 right-5 p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter italic mb-6 flex items-center gap-3">
              <LinkIcon className="text-primary"/> Import from URL
            </h2>
            <form onSubmit={handleImportUrl}>
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">LeetCode URL</label>
                <input
                  type="url"
                  required
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder="https://leetcode.com/problems/two-sum/"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
                />
              </div>
              <button type="submit" disabled={importingUrl} className="w-full py-3 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
                {importingUrl ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Import Questions'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
