import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../services/api';
import { AccessType, PollCategory, QuestionType, ResultVisibilityMode, CreatePollPayload } from '../types';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ArrowLeft, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Question Types ────────────────────────────────────────────────────────────
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'open_text', label: 'Open Text' },
];

const ACCESS_TYPES: { value: AccessType; label: string; desc: string }[] = [
  { value: 'public', label: 'Public', desc: 'Anyone can vote' },
  { value: 'code', label: 'Access Code', desc: 'Share a single code' },
  { value: 'token', label: 'Token-Based', desc: 'Unique token per voter' },
  { value: 'invite', label: 'Invite-Only', desc: 'Email invites' },
  { value: 'account', label: 'Account-Gated', desc: 'Requires account' },
  { value: 'link', label: 'Link-Based', desc: 'Tokenized URL' },
];

const RESULT_MODES: { value: ResultVisibilityMode; label: string }[] = [
  { value: 'real_time', label: 'Real-Time (live results)' },
  { value: 'on_close', label: 'On Close (when poll ends)' },
  { value: 'host_release', label: 'Host Release (you decide)' },
  { value: 'hidden', label: 'Hidden (never shown)' },
];

const CATEGORIES: PollCategory[] = ['general', 'governance', 'community', 'event', 'competition', 'award', 'survey', 'dao', 'other'];

type NewOption = { id: string; text: string };
type NewQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: NewOption[];
};

const makeId = () => Math.random().toString(36).slice(2, 10);

const makeQuestion = (): NewQuestion => ({
  id: makeId(),
  type: 'single_choice',
  text: '',
  required: true,
  options: [
    { id: makeId(), text: '' },
    { id: makeId(), text: '' },
  ],
});

export default function CreatePollPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=content, 2=access, 3=settings
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PollCategory>('general');
  const [tags, setTags] = useState('');
  const [questions, setQuestions] = useState<NewQuestion[]>([makeQuestion()]);

  const [accessType, setAccessType] = useState<AccessType>('public');
  const [inviteEmails, setInviteEmails] = useState('');
  const [tokenCount, setTokenCount] = useState(50);
  const [accessCode, setAccessCode] = useState('');

  const [resultMode, setResultMode] = useState<ResultVisibilityMode>('on_close');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [launchNow, setLaunchNow] = useState(false);

  // ─── Question Helpers ───────────────────────────────────────────────────────
  const addQuestion = () => setQuestions((q) => [...q, makeQuestion()]);
  const removeQuestion = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQuestion = (id: string, updates: Partial<NewQuestion>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...updates } : x)));

  const addOption = (qId: string) =>
    setQuestions((q) =>
      q.map((x) =>
        x.id === qId ? { ...x, options: [...x.options, { id: makeId(), text: '' }] } : x
      )
    );

  const removeOption = (qId: string, oId: string) =>
    setQuestions((q) =>
      q.map((x) =>
        x.id === qId ? { ...x, options: x.options.filter((o) => o.id !== oId) } : x
      )
    );

  const updateOption = (qId: string, oId: string, text: string) =>
    setQuestions((q) =>
      q.map((x) =>
        x.id === qId
          ? { ...x, options: x.options.map((o) => (o.id === oId ? { ...o, text } : o)) }
          : x
      )
    );

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (publishNow: boolean) => {
    if (!title.trim()) return toast.error('Poll title is required');
    if (questions.some((q) => !q.text.trim())) return toast.error('All questions need text');
    if (questions.some((q) => ['single_choice', 'multiple_choice'].includes(q.type) && q.options.some((o) => !o.text.trim()))) {
      return toast.error('All options need text');
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePollPayload = {
        title,
        description,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        questions: questions.map((q, i) => ({
          ...q,
          order: i,
          options: q.options.map((o, j) => ({ ...o, order: j, voteCount: 0 })),
        })),
        accessType,
        eligibility: {
          type: accessType,
          invitedEmails: accessType === 'invite' ? inviteEmails.split('\n').map((e) => e.trim()).filter(Boolean) : [],
          tokenCount: accessType === 'token' ? tokenCount : undefined,
          accessCode: accessType === 'code' ? accessCode || undefined : undefined,
        },
        resultVisibility: { mode: resultMode },
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        status: publishNow || launchNow ? 'active' : 'draft',
      };

      const res = await pollApi.createPoll(payload);
      const poll = res.data.poll;
      toast.success(publishNow ? 'Poll is live! 🚀' : 'Poll saved as draft');
      navigate(`/dashboard/poll/${poll._id}/manage`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsOptions = (type: QuestionType) => ['single_choice', 'multiple_choice'].includes(type);

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/dashboard')} className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-4xl text-pm-text">CREATE POLL</h1>
          <p className="text-pm-muted text-sm mt-0.5">Configure your poll from scratch</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, label: 'Content' }, { n: 2, label: 'Access' }, { n: 3, label: 'Settings' }].map(({ n, label }) => (
          <button key={n} onClick={() => setStep(n)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === n ? 'bg-pm-red/15 text-pm-red border border-pm-red/30' : 'text-pm-muted hover:text-pm-text'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === n ? 'bg-pm-red text-white' : 'bg-pm-border text-pm-muted'}`}>{n}</span>
            {label}
          </button>
        ))}
      </div>

      {/* STEP 1: Content */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="pm-card p-6 space-y-5">
            <h2 className="font-semibold text-pm-text">Poll Details</h2>
            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Title <span className="text-pm-red">*</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="pm-input" placeholder="What's this poll about?" maxLength={200} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="pm-input resize-none" rows={3} placeholder="Provide context for voters (optional)" maxLength={5000} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as PollCategory)} className="pm-input">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} className="pm-input" placeholder="tag1, tag2, tag3" />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="pm-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <GripVertical className="w-4 h-4 text-pm-border shrink-0" />
                  <span className="text-xs font-bold text-pm-muted uppercase tracking-wider">Q{qi + 1}</span>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                    className="pm-input flex-1 py-1.5 text-xs"
                  >
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-pm-muted cursor-pointer">
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="accent-pm-red" />
                    Required
                  </label>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(q.id)} className="p-1.5 text-pm-muted hover:text-red-400 transition-colors rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  className="pm-input mb-4"
                  placeholder="Question text..."
                />

                {needsOptions(q.type) && (
                  <div className="space-y-2 pl-2 border-l-2 border-pm-border">
                    {q.options.map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="text-xs text-pm-muted w-4 text-right shrink-0">{oi + 1}.</span>
                        <input
                          value={opt.text}
                          onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                          className="pm-input flex-1 py-2 text-sm"
                          placeholder={`Option ${oi + 1}`}
                        />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(q.id, opt.id)} className="p-1 text-pm-muted hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOption(q.id)} className="text-xs text-pm-muted hover:text-pm-red transition-colors flex items-center gap-1.5 mt-2 ml-6">
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addQuestion} className="pm-btn-secondary w-full flex items-center justify-center gap-2 py-3">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="pm-btn-primary flex items-center gap-2">
              Next: Access Control <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Access */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="pm-card p-6 space-y-5">
            <h2 className="font-semibold text-pm-text">Access Control</h2>
            <p className="text-pm-muted text-sm">Who is allowed to vote in this poll?</p>

            <div className="grid grid-cols-2 gap-3">
              {ACCESS_TYPES.map((at) => (
                <button
                  key={at.value}
                  onClick={() => setAccessType(at.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    accessType === at.value
                      ? 'border-pm-red bg-pm-red/10 text-pm-text'
                      : 'border-pm-border hover:border-pm-red/40 text-pm-muted'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{at.label}</div>
                  <div className="text-xs opacity-70">{at.desc}</div>
                </button>
              ))}
            </div>

            {/* Access type specific config */}
            {accessType === 'invite' && (
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Invited Emails (one per line)</label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="pm-input resize-none font-mono text-sm"
                  rows={6}
                  placeholder={"alice@example.com\nbob@example.com\ncharlie@example.com"}
                />
                <p className="text-xs text-pm-muted mt-2">
                  {inviteEmails.split('\n').filter((e) => e.trim()).length} email(s) added
                </p>
              </div>
            )}

            {accessType === 'token' && (
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Number of Tokens to Generate</label>
                <input
                  type="number"
                  value={tokenCount}
                  onChange={(e) => setTokenCount(parseInt(e.target.value) || 50)}
                  className="pm-input"
                  min={1}
                  max={10000}
                />
                <p className="text-xs text-pm-muted mt-2">Each token is unique and single-use.</p>
              </div>
            )}

            {accessType === 'code' && (
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Access Code (leave blank to auto-generate)</label>
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 10))}
                  className="pm-input font-mono uppercase tracking-widest"
                  placeholder="e.g. VOTE2025"
                  maxLength={10}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="pm-btn-secondary flex items-center gap-2">
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" /> Back
            </button>
            <button onClick={() => setStep(3)} className="pm-btn-primary flex items-center gap-2">
              Next: Settings <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Settings */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div className="pm-card p-6 space-y-5">
            <h2 className="font-semibold text-pm-text">Result Visibility</h2>
            <div className="space-y-2">
              {RESULT_MODES.map((rm) => (
                <label key={rm.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${resultMode === rm.value ? 'border-pm-red bg-pm-red/10' : 'border-pm-border hover:border-pm-border'}`}>
                  <input type="radio" name="resultMode" value={rm.value} checked={resultMode === rm.value} onChange={() => setResultMode(rm.value)} className="accent-pm-red" />
                  <span className="text-sm font-medium text-pm-text">{rm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pm-card p-6 space-y-5">
            <h2 className="font-semibold text-pm-text">Timing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Starts At</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="pm-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Ends At</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="pm-input" />
              </div>
            </div>
          </div>

          {/* Launch options */}
          <div className="pm-card p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={launchNow} onChange={(e) => setLaunchNow(e.target.checked)} className="accent-pm-red w-4 h-4" />
              <div>
                <span className="text-sm font-semibold text-pm-text">Launch immediately</span>
                <p className="text-xs text-pm-muted mt-0.5">Poll will go live right after creation</p>
              </div>
            </label>
          </div>

          <div className="flex justify-between gap-3">
            <button onClick={() => setStep(2)} className="pm-btn-secondary flex items-center gap-2">
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" /> Back
            </button>
            <div className="flex gap-3">
              <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="pm-btn-secondary">
                Save as Draft
              </button>
              <button onClick={() => handleSubmit(true)} disabled={isSubmitting} className="pm-btn-primary flex items-center gap-2">
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Zap className="w-4 h-4" /> Launch Poll</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
