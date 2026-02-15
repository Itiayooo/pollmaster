import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollApi, inviteApi, voteApi } from '../services/api';
import { Poll } from '../types';
import {
  ArrowLeft, Play, Pause, Square, Eye, Copy, Send, BarChart2,
  Users, Clock, Download, RefreshCw, ExternalLink, Key
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import PollStatusBadge from '../components/ui/PollStatusBadge';

export default function PollManagePage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['poll', pollId],
    queryFn: () => pollApi.getPoll(pollId!).then((r) => r.data),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['poll-analytics', pollId],
    queryFn: () => import('../services/api').then(m => m.analyticsApi.getPollAnalytics(pollId!)).then((r) => r.data),
    enabled: !!pollId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['poll', pollId] });

  const publishMutation = useMutation({
    mutationFn: () => pollApi.publishPoll(pollId!),
    onSuccess: () => { toast.success('Poll is now live! 🚀'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to publish'),
  });

  const closeMutation = useMutation({
    mutationFn: () => pollApi.closePoll(pollId!),
    onSuccess: () => { toast.success('Poll closed'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to close'),
  });

  const releaseMutation = useMutation({
    mutationFn: () => pollApi.releaseResults(pollId!),
    onSuccess: () => { toast.success('Results released to voters!'); invalidate(); },
  });

  const sendInvitesMutation = useMutation({
    mutationFn: () => inviteApi.send(pollId!),
    onSuccess: (res) => toast.success(res.data.message),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send invites'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const poll: Poll = data?.poll;
  if (!poll) return null;

  const voteUrl = `${window.location.origin}/vote/${poll.slug}`;
  const copyLink = () => { navigator.clipboard.writeText(voteUrl); toast.success('Vote link copied!'); };

  const { status } = poll;
  const canPublish = status === 'draft' || status === 'scheduled';
  const canClose = status === 'active' || status === 'paused';
  const canRelease = poll.resultVisibility.mode === 'host_release' && !poll.resultVisibility.released;

  const analytics = analyticsData?.analytics;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl text-pm-text">{poll.title.toUpperCase()}</h1>
              <PollStatusBadge status={poll.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-pm-muted">
              <span className="font-mono bg-pm-surface px-2 py-0.5 rounded">{poll.shortId}</span>
              <span>Created {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}</span>
              <span className="capitalize">{poll.accessType} access</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canPublish && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="pm-btn-primary flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> Publish
            </button>
          )}
          {canClose && (
            <button onClick={() => { if (confirm('Close this poll?')) closeMutation.mutate(); }} disabled={closeMutation.isPending} className="pm-btn-secondary flex items-center gap-2 text-sm border-red-900/30 text-red-400 hover:border-red-500/50">
              <Square className="w-4 h-4" /> Close Poll
            </button>
          )}
          {canRelease && (
            <button onClick={() => releaseMutation.mutate()} className="pm-btn-primary flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" /> Release Results
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Stats + Controls */}
        <div className="space-y-4">
          {/* Vote link */}
          {poll.status === 'active' && (
            <div className="pm-card p-5">
              <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider mb-3">Vote Link</h3>
              <div className="flex items-center gap-2 bg-pm-surface rounded-lg px-3 py-2 mb-3">
                <span className="text-xs text-pm-muted font-mono truncate flex-1">{voteUrl}</span>
                <button onClick={copyLink} className="text-pm-muted hover:text-pm-text shrink-0"><Copy className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink} className="pm-btn-secondary text-xs py-2 flex items-center gap-1.5 flex-1 justify-center">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <a href={voteUrl} target="_blank" rel="noreferrer" className="pm-btn-secondary text-xs py-2 flex items-center gap-1.5 flex-1 justify-center">
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="pm-card p-5 space-y-4">
            <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider">Statistics</h3>
            {[
              { label: 'Total Votes', value: poll.stats.totalVotes, icon: BarChart2, color: 'text-pm-red' },
              { label: 'Unique Voters', value: poll.stats.uniqueVoters ?? poll.stats.totalVotes, icon: Users, color: 'text-pm-blue' },
              { label: 'Last Vote', value: poll.stats.lastVoteAt ? formatDistanceToNow(new Date(poll.stats.lastVoteAt), { addSuffix: true }) : 'N/A', icon: Clock, color: 'text-pm-muted' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-pm-muted">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  {s.label}
                </div>
                <span className="font-semibold text-pm-text text-sm">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Timing */}
          {(poll.startsAt || poll.endsAt) && (
            <div className="pm-card p-5 space-y-3">
              <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider">Timing</h3>
              {poll.startsAt && (
                <div className="text-sm">
                  <span className="text-pm-muted text-xs">Starts</span>
                  <p className="text-pm-text font-medium">{format(new Date(poll.startsAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
              {poll.endsAt && (
                <div className="text-sm">
                  <span className="text-pm-muted text-xs">Ends</span>
                  <p className="text-pm-text font-medium">{format(new Date(poll.endsAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          )}

          {/* Invite actions */}
          {poll.accessType === 'invite' && (
            <div className="pm-card p-5 space-y-3">
              <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider">Invites</h3>
              <p className="text-xs text-pm-muted">{poll.stats.uniqueVoters ?? 0} voted</p>
              <button onClick={() => sendInvitesMutation.mutate()} disabled={sendInvitesMutation.isPending} className="pm-btn-primary w-full text-sm flex items-center justify-center gap-2 py-2">
                {sendInvitesMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Pending Invites
              </button>
            </div>
          )}

          {/* Access code */}
          {poll.accessType === 'code' && data?.isHost && (
            <div className="pm-card p-5">
              <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider mb-3">Access Code</h3>
              <div className="flex items-center gap-3 bg-pm-surface rounded-lg px-4 py-3">
                <Key className="w-4 h-4 text-pm-red" />
                <span className="font-mono text-xl font-bold tracking-widest text-pm-text">{poll.eligibility.accessCode}</span>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="pm-card p-5 space-y-2">
            <h3 className="text-xs font-semibold text-pm-muted uppercase tracking-wider mb-3">Actions</h3>
            <button onClick={() => navigate(`/results/${poll.slug}`)} className="w-full text-left flex items-center gap-3 text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg px-3 py-2 transition-colors">
              <Eye className="w-4 h-4" /> View Results
            </button>
            <button onClick={() => navigate(`/dashboard/poll/${poll._id}/edit`)} className="w-full text-left flex items-center gap-3 text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg px-3 py-2 transition-colors">
              <BarChart2 className="w-4 h-4" /> Edit Poll
            </button>
            {poll.allowExport && (
              <button
                onClick={async () => {
                  try {
                    const res = await voteApi.exportVotes(poll._id);
                    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${poll.slug}-votes.json`; a.click();
                    toast.success('Export downloaded');
                  } catch { toast.error('Export failed'); }
                }}
                className="w-full text-left flex items-center gap-3 text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg px-3 py-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Export Votes
              </button>
            )}
          </div>
        </div>

        {/* Right: Questions + Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="pm-card overflow-hidden">
            <div className="px-6 py-4 border-b border-pm-border">
              <h3 className="font-semibold text-pm-text">Questions & Live Results</h3>
            </div>
            <div className="divide-y divide-pm-border">
              {poll.questions.map((q, qi) => (
                <div key={q.id} className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-xs font-bold text-pm-muted bg-pm-surface rounded px-2 py-1 shrink-0 mt-0.5">Q{qi + 1}</span>
                    <div>
                      <p className="font-medium text-pm-text">{q.text}</p>
                      <p className="text-xs text-pm-muted mt-0.5 capitalize">{q.type.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {q.options.length > 0 && (
                    <div className="space-y-2 pl-8">
                      {q.options.map((opt) => {
                        const total = q.options.reduce((s, o) => s + o.voteCount, 0);
                        const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-pm-muted">{opt.text || '(empty)'}</span>
                              <span className="font-mono text-xs text-pm-text">{opt.voteCount} · {pct}%</span>
                            </div>
                            <div className="h-1.5 bg-pm-surface rounded-full overflow-hidden">
                              <div
                                className="h-full bg-pm-red rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Vote Timeline */}
          {analytics?.timeline && analytics.timeline.length > 0 && (
            <div className="pm-card p-6">
              <h3 className="font-semibold text-pm-text mb-4">Vote Timeline</h3>
              <div className="space-y-2">
                {analytics.timeline.slice(-10).map((t: { date: string; count: number }) => (
                  <div key={t.date} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-pm-muted w-24 shrink-0">{t.date}</span>
                    <div className="flex-1 h-2 bg-pm-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pm-blue rounded-full"
                        style={{ width: `${Math.min((t.count / (analytics.timeline.reduce((m: number, x: { count: number }) => Math.max(m, x.count), 1))) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-pm-muted w-8 text-right">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
