import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { voteApi, pollApi } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { Lock, BarChart2, Users, TrendingUp } from 'lucide-react';

const COLORS = ['#e94560', '#4a90d9', '#7c4dff', '#f59e0b', '#10b981', '#ec4899'];

export default function ResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: pollData } = useQuery({
    queryKey: ['results-poll', slug],
    queryFn: () => pollApi.getPoll(slug!).then((r) => r.data),
    enabled: !!slug,
  });

  const poll = pollData?.poll;
  const isHost = user && poll && (typeof poll.host === 'object' ? poll.host._id === user.id : poll.host === user.id);

  const { data: resultsData, isLoading, isError } = useQuery({
    queryKey: ['results', slug],
    queryFn: () => voteApi.getResults(slug!, undefined).then((r) => r.data),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !resultsData) return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div>
        <div className="w-16 h-16 bg-pm-border rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-pm-muted" />
        </div>
        <h1 className="font-display text-4xl text-pm-text mb-2">RESULTS NOT AVAILABLE</h1>
        <p className="text-pm-muted">
          {poll?.resultVisibility?.mode === 'host_release'
            ? "The host hasn't released the results yet."
            : poll?.resultVisibility?.mode === 'hidden'
            ? "Results are hidden for this poll."
            : "Results will be available when the poll closes."}
        </p>
      </div>
    </div>
  );

  const { questions, stats, pollTitle, status } = resultsData;

  return (
    <div className="min-h-screen bg-pm-darker pb-16">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative max-w-3xl mx-auto px-4 pt-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className={`pm-badge ${status === 'active' ? 'status-active' : status === 'closed' ? 'status-closed' : 'status-draft'}`}>
              {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {status}
            </span>
          </div>
          <h1 className="font-display text-5xl text-pm-text">{pollTitle.toUpperCase()}</h1>

          {/* Stats bar */}
          <div className="flex gap-6 mt-6 pb-6 border-b border-pm-border">
            {[
              { label: 'Total Votes', value: stats.totalVotes, icon: BarChart2 },
              { label: 'Unique Voters', value: stats.uniqueVoters ?? stats.totalVotes, icon: Users },
              { label: 'Questions', value: questions.length, icon: TrendingUp },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <s.icon className="w-4 h-4 text-pm-muted" />
                <div>
                  <div className="font-display text-2xl text-pm-red">{s.value}</div>
                  <div className="text-xs text-pm-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {questions.map((q: any, qi: number) => {
            const chartData = q.options.map((o: any) => ({ name: o.text, votes: o.voteCount, pct: o.percentage }));
            const maxVotes = Math.max(...q.options.map((o: any) => o.voteCount), 1);

            return (
              <div key={q.id} className="pm-card overflow-hidden animate-slide-up" style={{ animationDelay: `${qi * 0.1}s` }}>
                <div className="px-6 py-4 border-b border-pm-border bg-pm-surface/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-pm-muted bg-pm-border px-2 py-0.5 rounded font-mono">Q{qi + 1}</span>
                      <h3 className="font-semibold text-pm-text">{q.text}</h3>
                    </div>
                    <span className="text-xs text-pm-muted">{q.totalResponses} response{q.totalResponses !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Bar results */}
                  {q.options.length > 0 && (
                    <>
                      {/* Visual bars */}
                      <div className="space-y-3 mb-6">
                        {q.options.map((opt: any, oi: number) => {
                          const pct = q.totalResponses > 0 ? Math.round((opt.voteCount / q.totalResponses) * 100) : 0;
                          const isWinner = opt.voteCount === maxVotes && opt.voteCount > 0;
                          return (
                            <div key={opt.id}>
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className={`font-medium ${isWinner ? 'text-pm-red' : 'text-pm-text'}`}>
                                  {isWinner && '⭑ '}{opt.text}
                                </span>
                                <span className="font-mono text-pm-muted text-xs">
                                  {opt.voteCount} · {pct}%
                                </span>
                              </div>
                              <div className="h-3 bg-pm-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    background: COLORS[oi % COLORS.length],
                                    opacity: isWinner ? 1 : 0.6,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recharts bar chart */}
                      {chartData.length >= 2 && chartData.length <= 10 && (
                        <div className="h-40 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="30%">
                              <XAxis dataKey="name" tick={{ fill: '#8888aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }}
                                labelStyle={{ color: '#e8e8f0', fontWeight: 600 }}
                                itemStyle={{ color: '#8888aa' }}
                                formatter={(v: number) => [`${v} votes`, '']}
                              />
                              <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                                {chartData.map((_: any, i: number) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.8} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
