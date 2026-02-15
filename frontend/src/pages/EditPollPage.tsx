import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollApi } from '../services/api';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating' },
  { value: 'open_text', label: 'Open Text' },
];

const RESULT_MODES = [
  { value: 'real_time', label: 'Real-time' },
  { value: 'on_close', label: 'On Close' },
  { value: 'host_release', label: 'Host Release' },
  { value: 'hidden', label: 'Hidden' },
];

export default function EditPollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['edit-poll', pollId],
    queryFn: () => pollApi.getPoll(pollId!).then((r) => r.data),
    enabled: !!pollId,
  });

  const poll = data?.poll;
  const isActive = poll?.status === 'active' || poll?.status === 'paused';

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [resultMode, setResultMode] = useState('real_time');
  const [questions, setQuestions] = useState<any[]>([]);

  // Populate form once poll loads
  useEffect(() => {
    if (!poll) return;
    setTitle(poll.title || '');
    setDescription(poll.description || '');
    setEndsAt(poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : '');
    setResultMode(poll.resultVisibility?.mode || 'real_time');
    setQuestions(
      poll.questions.map((q: any) => ({
        ...q,
        options: q.options ? [...q.options] : [],
      }))
    );
  }, [poll]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => pollApi.updatePoll(pollId!, payload),
    onSuccess: () => {
      toast.success('Poll updated');
      qc.invalidateQueries({ queryKey: ['poll', pollId] });
      qc.invalidateQueries({ queryKey: ['edit-poll', pollId] });
      navigate(`/dashboard/poll/${pollId}/manage`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save changes'),
  });

  const handleSave = () => {
    if (!title.trim()) return toast.error('Title is required');

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      endsAt: endsAt || null,
      resultVisibility: { mode: resultMode },
    };

    // Only send questions for draft polls — can't change questions on active polls
    if (!isActive) {
      payload.questions = questions.map((q, i) => ({ ...q, order: i }));
    }

    saveMutation.mutate(payload);
  };

  // ── Question helpers ──────────────────────────────────────────────────────
  const updateQuestion = (idx: number, updates: any) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOption = { id: `opt_${Date.now()}`, text: '', voteCount: 0, order: q.options.length };
      return { ...q, options: [...q.options, newOption] };
    }));
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = q.options.map((o: any, j: number) => j === oIdx ? { ...o, text } : o);
      return { ...q, options };
    }));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.filter((_: any, j: number) => j !== oIdx) };
    }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      id: `q_${Date.now()}`,
      text: '',
      type: 'single_choice',
      required: true,
      order: prev.length,
      options: [
        { id: `opt_${Date.now()}_a`, text: '', voteCount: 0, order: 0 },
        { id: `opt_${Date.now()}_b`, text: '', voteCount: 0, order: 1 },
      ],
      settings: {},
    }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!poll) return (
    <div className="text-center py-20 text-pm-muted">Poll not found.</div>
  );

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/dashboard/poll/${pollId}/manage`)}
          className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-4xl text-pm-text">EDIT POLL</h1>
          <p className="text-pm-muted text-sm mt-0.5 capitalize">{poll.status} poll</p>
        </div>
      </div>

      {isActive && (
        <div className="mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          This poll is <strong>active</strong> — you can update the title, description, end time, and result visibility, but questions cannot be changed while voting is open.
        </div>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <div className="pm-card p-6 space-y-5">
          <h2 className="font-semibold text-pm-text text-sm uppercase tracking-wider">Basic Info</h2>

          <div>
            <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pm-input"
              placeholder="Poll title"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="pm-input resize-none"
              rows={3}
              placeholder="Optional description"
              maxLength={1000}
            />
          </div>
        </div>

        {/* Settings */}
        <div className="pm-card p-6 space-y-5">
          <h2 className="font-semibold text-pm-text text-sm uppercase tracking-wider">Settings</h2>

          <div>
            <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">End Date & Time</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="pm-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Result Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {RESULT_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setResultMode(m.value)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                    resultMode === m.value
                      ? 'border-pm-red bg-pm-red/10 text-pm-red'
                      : 'border-pm-border text-pm-muted hover:border-pm-red/40 hover:text-pm-text'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions — only editable on draft polls */}
        {!isActive && (
          <div className="pm-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-pm-text text-sm uppercase tracking-wider">Questions</h2>
              <button onClick={addQuestion} className="pm-btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.length === 0 && (
              <p className="text-pm-muted text-sm text-center py-6">No questions yet. Add one above.</p>
            )}

            {questions.map((q, qi) => (
              <div key={q.id} className="border border-pm-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-pm-border shrink-0" />
                  <span className="text-xs font-bold text-pm-muted">Q{qi + 1}</span>
                  <div className="flex-1">
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      className="pm-input text-sm"
                      placeholder="Question text"
                    />
                  </div>
                  <button onClick={() => removeQuestion(qi)} className="text-pm-muted hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 pl-9">
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(qi, { type: e.target.value })}
                    className="pm-input text-xs py-1.5 w-auto"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-xs text-pm-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(qi, { required: e.target.checked })}
                      className="accent-red-500"
                    />
                    Required
                  </label>
                </div>

                {/* Options for choice-type questions */}
                {['single_choice', 'multiple_choice'].includes(q.type) && (
                  <div className="pl-9 space-y-2">
                    {q.options.map((opt: any, oi: number) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-pm-border shrink-0" />
                        <input
                          value={opt.text}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          className="pm-input text-sm py-1.5 flex-1"
                          placeholder={`Option ${oi + 1}`}
                        />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} className="text-pm-muted hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOption(qi)} className="text-xs text-pm-muted hover:text-pm-text flex items-center gap-1.5 mt-1 transition-colors">
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={() => navigate(`/dashboard/poll/${pollId}/manage`)}
            className="pm-btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="pm-btn-primary flex items-center gap-2"
          >
            {saveMutation.isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}