import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pollApi } from '../services/api';
import { Poll } from '../types';
import { Search, Globe, Clock, BarChart2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PollStatusBadge from '../components/ui/PollStatusBadge';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'governance', label: 'Governance' },
  { value: 'community', label: 'Community' },
  { value: 'event', label: 'Events' },
  { value: 'competition', label: 'Competitions' },
  { value: 'dao', label: 'DAO' },
  { value: 'survey', label: 'Surveys' },
  { value: 'award', label: 'Awards' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'ending_soon', label: 'Ending Soon' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['public-polls', search, category, sort, page],
    queryFn: () =>
      pollApi.getPublicPolls({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        sort,
        page,
      }).then((r) => r.data),
  });

  const polls: Poll[] = data?.polls || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-pm-text mb-2">EXPLORE POLLS</h1>
        <p className="text-pm-muted text-sm">Discover and participate in public polls</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pm-input pl-10"
            placeholder="Search polls..."
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="pm-input w-auto min-w-[140px]"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              category === cat.value
                ? 'bg-pm-red text-white'
                : 'bg-pm-card border border-pm-border text-pm-muted hover:border-pm-red/40 hover:text-pm-text'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Poll grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pm-card p-6 animate-pulse">
              <div className="h-4 bg-pm-border rounded mb-3 w-3/4" />
              <div className="h-3 bg-pm-border rounded mb-2 w-full" />
              <div className="h-3 bg-pm-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-pm-border mx-auto mb-4" />
          <h3 className="font-semibold text-pm-text mb-2">No polls found</h3>
          <p className="text-pm-muted text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {polls.map((poll) => (
            <div
              key={poll._id}
              className="pm-card p-5 hover:border-pm-red/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/vote/${poll.slug}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2 flex-wrap">
                  <PollStatusBadge status={poll.status} />
                  {poll.category && (
                    <span className="pm-badge bg-pm-surface text-pm-muted capitalize text-xs">
                      {poll.category}
                    </span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-pm-border group-hover:text-pm-red transition-colors shrink-0 mt-0.5" />
              </div>

              <h3 className="font-semibold text-pm-text mb-2 leading-snug group-hover:text-pm-red transition-colors line-clamp-2">
                {poll.title}
              </h3>

              {poll.description && (
                <p className="text-pm-muted text-xs leading-relaxed mb-3 line-clamp-2">
                  {poll.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-pm-muted pt-3 border-t border-pm-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" />
                    {poll.stats.totalVotes} vote{poll.stats.totalVotes !== 1 ? 's' : ''}
                  </span>
                  <span>{poll.questions.length} Q</span>
                </div>
                {poll.endsAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                p === page
                  ? 'bg-pm-red text-white'
                  : 'bg-pm-card border border-pm-border text-pm-muted hover:text-pm-text'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}