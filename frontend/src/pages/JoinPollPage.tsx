import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../services/api';
import { Hash, Lock, ArrowRight, AlertCircle, Search } from 'lucide-react';

export default function JoinPollPage() {
  const navigate = useNavigate();
  const [pollId, setPollId] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const identifier = pollId.trim();
    if (!identifier) {
      setError('Please enter a poll ID or link.');
      return;
    }

    // Strip full URLs down to just the slug if pasted
    const slug = identifier
      .replace(/^https?:\/\/[^/]+\/vote\//, '')
      .replace(/^\/vote\//, '')
      .trim();

    setIsLoading(true);
    setError('');

    try {
      // First check the poll exists and get its access type
      const res = await pollApi.getPoll(slug);
      const poll = res.data.poll;

      if (!poll) {
        setError('Poll not found. Check the ID and try again.');
        return;
      }

      if (poll.status === 'draft' || poll.status === 'scheduled') {
        setError('This poll is not open for voting yet.');
        return;
      }

      if (poll.status === 'closed') {
        setError('This poll has closed. You can view its results instead.');
        return;
      }

      // For code-gated polls, require the code before navigating
      if (poll.accessType === 'code') {
        if (!code.trim()) {
          setError('This poll requires an access code. Please enter it above.');
          setIsLoading(false);
          return;
        }
        // Validate the code against the backend
        try {
          const accessRes = await pollApi.validateAccess(slug, { code: code.trim().toUpperCase() });
          if (!accessRes.data.accessGranted) {
            setError('Invalid access code. Please check and try again.');
            setIsLoading(false);
            return;
          }
        } catch (e: any) {
          setError(e.response?.data?.message || 'Invalid access code.');
          setIsLoading(false);
          return;
        }
        // Code is valid — navigate with code in query string so VotePage skips the gate
        navigate(`/vote/${poll.slug}?code=${code.trim().toUpperCase()}`);
        return;
      }

      // Public / account / other access types — go straight to vote page
      navigate(`/vote/${poll.slug}`);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setError('Poll not found. Check the ID and try again.');
      } else {
        setError(e.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto pt-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-pm-text mb-2">JOIN A POLL</h1>
        <p className="text-pm-muted text-sm">
          Enter a poll ID, short code, or paste a poll link. If the poll requires an access code, enter it too.
        </p>
      </div>

      <div className="pm-card p-6 space-y-5">

        {/* Poll identifier */}
        <div>
          <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">
            Poll ID or Link
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
            <input
              value={pollId}
              onChange={(e) => { setPollId(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="pm-input pl-10"
              placeholder="e.g. my-poll-AB12CD34 or https://..."
              autoFocus
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-pm-muted mt-1.5">
            Paste a full vote link or just the poll slug / short ID
          </p>
        </div>

        {/* Access code */}
        <div>
          <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">
            Access Code <span className="text-pm-muted font-normal normal-case">(if required)</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className={`pm-input pl-10 font-mono tracking-widest uppercase ${error && code ? 'border-red-500' : ''}`}
              placeholder="XXXXXXXX"
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={isLoading || !pollId.trim()}
          className="pm-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><ArrowRight className="w-4 h-4" /> Join Poll</>
          }
        </button>
      </div>

      {/* Helper */}
      <div className="mt-6 pm-card p-4">
        <p className="text-xs font-semibold text-pm-muted uppercase tracking-wider mb-3">How to find a poll</p>
        <div className="space-y-2 text-xs text-pm-muted">
          <div className="flex items-start gap-2">
            <Hash className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pm-red" />
            <span>Ask the poll host for the <span className="text-pm-text">poll link</span> or <span className="text-pm-text">short ID</span></span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pm-red" />
            <span>For access-code polls, you'll need the <span className="text-pm-text">code from the host</span> as well</span>
          </div>
          <div className="flex items-start gap-2">
            <Search className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pm-red" />
            <span>Public polls are also listed in <span className="text-pm-text cursor-pointer hover:text-pm-red" onClick={() => navigate('/dashboard/explore')}>Explore</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}