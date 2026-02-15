import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, pollApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Poll } from '../types';
import { Plus, TrendingUp, Vote, BarChart2, Clock, ExternalLink, Settings2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PollStatusBadge from '../components/ui/PollStatusBadge';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then((r) => r.data),
  });

  const { data: pollsData, isLoading: pollsLoading } = useQuery({
    queryKey: ['my-polls'],
    queryFn: () => pollApi.getMyPolls({ limit: 20 }).then((r) => r.data),
  });

  const overview = dashData?.overview;
  const polls: Poll[] = pollsData?.polls || [];

  const statCards = [
    { label: 'Total Polls', value: overview?.totalPolls ?? '—', icon: BarChart2, color: 'text-pm-blue' },
    { label: 'Active Now', value: overview?.activePolls ?? '—', icon: TrendingUp, color: 'text-green-400' },
    { label: 'Total Votes', value: overview?.totalVotes?.toLocaleString() ?? '—', icon: Vote, color: 'text-pm-red' },
    { label: 'Drafts', value: overview?.draftPolls ?? '—', icon: Clock, color: 'text-pm-muted' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-pm-text">
            HEY, {(user?.displayName || user?.username || 'HOST').toUpperCase()}
          </h1>
          <p className="text-pm-muted mt-1 text-sm">Here's what's happening with your polls</p>
        </div>
        <button onClick={() => navigate('/dashboard/create')} className="pm-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Poll
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="pm-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-pm-muted text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className={`font-display text-4xl ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Polls table */}
      <div className="pm-card overflow-hidden">
        <div className="px-6 py-4 border-b border-pm-border flex items-center justify-between">
          <h2 className="font-semibold text-pm-text">Your Polls</h2>
          <span className="text-xs text-pm-muted">{polls.length} poll{polls.length !== 1 ? 's' : ''}</span>
        </div>

        {pollsLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : polls.length === 0 ? (
          <div className="p-16 text-center">
            <Vote className="w-12 h-12 text-pm-border mx-auto mb-4" />
            <h3 className="font-semibold text-pm-text mb-2">No polls yet</h3>
            <p className="text-pm-muted text-sm mb-6">Create your first poll and start collecting votes</p>
            <button onClick={() => navigate('/dashboard/create')} className="pm-btn-primary flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Create Poll
            </button>
          </div>
        ) : (
          <div className="divide-y divide-pm-border">
            {polls.map((poll) => (
              <div key={poll._id} className="px-6 py-4 hover:bg-pm-surface/50 transition-colors flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-pm-text truncate">{poll.title}</h3>
                    <PollStatusBadge status={poll.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-pm-muted">
                    <span className="font-mono">{poll.shortId}</span>
                    <span>{poll.stats?.totalVotes ?? 0} votes</span>
                    <span>{poll.accessType}</span>
                    <span>{formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {poll.status === 'active' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/vote/${poll.slug}`);
                        toast.success('Vote link copied!');
                      }}
                      className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors"
                      title="Copy vote link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/results/${poll.slug}`)}
                    className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors"
                    title="View results"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/poll/${poll._id}/manage`)}
                    className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors"
                    title="Manage poll"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
