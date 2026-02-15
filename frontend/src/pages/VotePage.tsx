import { useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { pollApi, voteApi } from '../services/api';
import { Poll, VoteAnswer, PollQuestion } from '../types';
import { Zap, Clock, Lock, ChevronRight, Check, Star, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const SESSION_ID = `sess_${Math.random().toString(36).slice(2)}`;

export default function VotePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || undefined;

  // Access code state
  const [accessCode, setAccessCode] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [answers, setAnswers] = useState<Record<string, VoteAnswer>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());

  // Load poll metadata
  const { data: pollData, isLoading } = useQuery({
    queryKey: ['vote-poll', slug],
    queryFn: () => pollApi.getPoll(slug!).then((r) => r.data),
    enabled: !!slug,
  });

  const poll: Poll | undefined = pollData?.poll;

  // Only check vote status once past the access gate
  const { data: voteStatus } = useQuery({
    queryKey: ['vote-status', slug, token],
    queryFn: () => voteApi.checkVoteStatus(slug!, { sessionId: SESSION_ID, token }).then((r) => r.data),
    enabled: !!slug && (poll?.accessType !== 'code' || accessGranted),
  });

  const voteMutation = useMutation({
    mutationFn: (payload: unknown) => voteApi.submitVote(payload),
    onSuccess: (res) => {
      setSubmitted(true);
      if (res.data.showResults) {
        setTimeout(() => navigate(`/results/${slug}`), 2000);
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to submit vote'),
  });

  // Verify the access code against the backend before letting voter in
  const handleCodeSubmit = async () => {
    if (!accessCode.trim()) {
      setAccessError('Please enter the access code.');
      return;
    }
    setIsVerifying(true);
    setAccessError('');
    try {
      const res = await pollApi.validateAccess(slug!, { code: accessCode.trim().toUpperCase() });
      if (res.data.accessGranted) {
        setAccessGranted(true);
        startTime.current = Date.now();
      } else {
        setAccessError('Access denied. Please check your code.');
      }
    } catch (e: any) {
      setAccessError(e.response?.data?.message || 'Invalid access code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const setAnswer = (questionId: string, update: Partial<VoteAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, questionType: 'single_choice', ...prev[questionId], ...update },
    }));
  };

  const toggleOption = (question: PollQuestion, optionId: string) => {
    const qId = question.id;
    const current = answers[qId]?.selectedOptions || [];
    if (question.type === 'single_choice' || question.type === 'yes_no') {
      setAnswer(qId, { selectedOptions: [optionId], questionType: question.type });
    } else {
      const next = current.includes(optionId)
        ? current.filter((o) => o !== optionId)
        : [...current, optionId];
      setAnswer(qId, { selectedOptions: next, questionType: question.type });
    }
  };

  const handleSubmit = () => {
    if (!poll) return;

    const answerList = poll.questions
      .map((q) => ({ questionId: q.id, questionType: q.type, ...answers[q.id] }))
      .filter((a) => a.questionId);

    for (const q of poll.questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      if (!a) return toast.error(`Please answer: "${q.text}"`);
      if (
        ['single_choice', 'multiple_choice', 'yes_no'].includes(q.type) &&
        (!a.selectedOptions || a.selectedOptions.length === 0)
      ) {
        return toast.error(`Please select an option for: "${q.text}"`);
      }
    }

    voteMutation.mutate({
      pollSlug: slug,
      answers: answerList,
      accessToken: token,
      accessCode: poll.accessType === 'code' ? accessCode.toUpperCase() : undefined,
      sessionId: SESSION_ID,
      completionTimeSeconds: Math.round((Date.now() - startTime.current) / 1000),
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!poll) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div>
        <h1 className="font-display text-4xl text-pm-text mb-2">POLL NOT FOUND</h1>
        <p className="text-pm-muted">This poll doesn't exist or has been removed.</p>
      </div>
    </div>
  );

  if (poll.status === 'closed') return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div>
        <div className="w-16 h-16 bg-pm-border rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-pm-muted" />
        </div>
        <h1 className="font-display text-4xl text-pm-text mb-2">POLL CLOSED</h1>
        <p className="text-pm-muted mb-6">Voting has ended for this poll.</p>
        <button onClick={() => navigate(`/results/${slug}`)} className="pm-btn-primary">View Results</button>
      </div>
    </div>
  );

  if (poll.status !== 'active') return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div>
        <div className="w-16 h-16 bg-pm-border rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-pm-muted" />
        </div>
        <h1 className="font-display text-4xl text-pm-text mb-2">NOT AVAILABLE</h1>
        <p className="text-pm-muted">This poll is not currently accepting votes.</p>
      </div>
    </div>
  );

  // ── Access Code Gate ────────────────────────────────────────────────────────
  if (poll.accessType === 'code' && !accessGranted) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-pm-red/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-pm-red/20">
            <Lock className="w-8 h-8 text-pm-red" />
          </div>
          <h1 className="font-display text-4xl text-pm-text mb-2">{poll.title.toUpperCase()}</h1>
          <p className="text-pm-muted text-sm">This poll requires an access code.<br />Enter it below to participate.</p>
        </div>

        <div className="pm-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">
              Access Code
            </label>
            <input
              value={accessCode}
              onChange={(e) => { setAccessCode(e.target.value.toUpperCase()); setAccessError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
              className={`pm-input font-mono text-center tracking-[0.3em] text-lg uppercase ${accessError ? 'border-red-500' : ''}`}
              placeholder="ENTER CODE"
              maxLength={12}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {accessError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {accessError}
              </div>
            )}
          </div>

          <button
            onClick={handleCodeSubmit}
            disabled={isVerifying || !accessCode.trim()}
            className="pm-btn-primary w-full flex items-center justify-center gap-2"
          >
            {isVerifying
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Lock className="w-4 h-4" /> Enter Poll</>
            }
          </button>
        </div>

        <p className="text-center text-pm-muted text-xs mt-4">
          Don't have a code? Contact the poll host.
        </p>
      </div>
    </div>
  );

  if (voteStatus?.hasVoted) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div>
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="font-display text-4xl text-pm-text mb-2">ALREADY VOTED</h1>
        <p className="text-pm-muted mb-6">You've already cast your vote in this poll.</p>
        <button onClick={() => navigate(`/results/${slug}`)} className="pm-btn-secondary">View Results</button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div className="animate-slide-up">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/40">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="font-display text-5xl text-pm-text mb-3">VOTE CAST!</h1>
        <p className="text-pm-muted mb-8">Your vote has been recorded successfully.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(`/results/${slug}`)} className="pm-btn-primary">View Results</button>
          <button onClick={() => navigate('/')} className="pm-btn-secondary">Back to Home</button>
        </div>
      </div>
    </div>
  );

  // ── Voting UI ───────────────────────────────────────────────────────────────
  const questions = [...poll.questions].sort((a, b) => a.order - b.order);
  const q = questions[currentQ];
  const totalQ = questions.length;
  const progress = (currentQ / totalQ) * 100;
  const answeredCurrent =
    (answers[q?.id]?.selectedOptions?.length ?? 0) > 0 ||
    answers[q?.id]?.rating != null ||
    !!answers[q?.id]?.textResponse?.trim();

  return (
    <div className="min-h-screen bg-pm-darker">
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="relative sticky top-0 bg-pm-darker/90 backdrop-blur-sm border-b border-pm-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-pm-red rounded flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-lg tracking-wide text-pm-text">POLLMASTER</span>
          </div>
          <div className="flex items-center gap-3">
            {poll.endsAt && (
              <span className="text-xs text-pm-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Closes {formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}
              </span>
            )}
            <span className="text-xs font-mono text-pm-muted">{currentQ + 1}/{totalQ}</span>
          </div>
        </div>
        <div className="h-0.5 bg-pm-border">
          <div className="h-full bg-pm-red transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        {currentQ === 0 && (
          <div className="mb-8 animate-slide-up">
            <h1 className="font-display text-4xl text-pm-text mb-2">{poll.title.toUpperCase()}</h1>
            {poll.description && <p className="text-pm-muted text-sm leading-relaxed">{poll.description}</p>}
          </div>
        )}

        {q && (
          <div key={q.id} className="pm-card p-8 animate-slide-up">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-pm-muted uppercase tracking-wider">
                  Question {currentQ + 1} of {totalQ}
                </span>
                {q.required && <span className="text-xs text-pm-red">Required</span>}
              </div>
              <h2 className="text-xl font-semibold text-pm-text leading-snug">{q.text}</h2>
              {q.description && <p className="text-pm-muted text-sm mt-2">{q.description}</p>}
            </div>

            {['single_choice', 'multiple_choice', 'yes_no'].includes(q.type) && (
              <div className="space-y-2">
                {(q.type === 'yes_no'
                  ? [{ id: 'yes', text: 'Yes', voteCount: 0, order: 0 }, { id: 'no', text: 'No', voteCount: 0, order: 1 }]
                  : [...q.options].sort((a, b) => a.order - b.order)
                ).map((opt) => {
                  const selected = answers[q.id]?.selectedOptions?.includes(opt.id);
                  const isRadio = q.type === 'single_choice' || q.type === 'yes_no';
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(q, opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center gap-3 ${
                        selected
                          ? 'border-pm-red bg-pm-red/10 text-pm-text'
                          : 'border-pm-border hover:border-pm-red/40 text-pm-muted hover:text-pm-text'
                      }`}
                    >
                      <div className={`w-5 h-5 ${isRadio ? 'rounded-full' : 'rounded-md'} border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-pm-red bg-pm-red' : 'border-pm-border'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'rating' && (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: q.settings.maxRating || 5 }, (_, i) => i + 1).map((n) => {
                  const current = answers[q.id]?.rating;
                  const filled = current !== undefined && n <= current;
                  return (
                    <button
                      key={n}
                      onClick={() => setAnswer(q.id, { rating: n, questionType: 'rating' })}
                      className={`p-2 transition-all ${filled ? 'text-yellow-400 scale-110' : 'text-pm-border hover:text-yellow-300'}`}
                    >
                      <Star className="w-8 h-8" fill={filled ? 'currentColor' : 'none'} />
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'open_text' && (
              <textarea
                value={answers[q.id]?.textResponse || ''}
                onChange={(e) => setAnswer(q.id, { textResponse: e.target.value, questionType: 'open_text' })}
                className="pm-input resize-none"
                rows={4}
                placeholder="Type your response here..."
                maxLength={5000}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="pm-btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              disabled={!!(q?.required && !answeredCurrent)}
              className="pm-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={voteMutation.isPending}
              className="pm-btn-primary flex items-center gap-2 px-8"
            >
              {voteMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check className="w-4 h-4" /> Submit Vote</>
              }
            </button>
          )}
        </div>

        {totalQ > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentQ ? 'bg-pm-red w-6' : answers[questions[i].id] ? 'bg-pm-red/40' : 'bg-pm-border'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}