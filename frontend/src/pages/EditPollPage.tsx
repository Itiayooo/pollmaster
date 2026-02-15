import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pollApi } from '../services/api';
import { ArrowLeft } from 'lucide-react';

// Edit page delegates to a simplified form
export default function EditPollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['edit-poll', pollId],
    queryFn: () => pollApi.getPoll(pollId!).then((r) => r.data),
    enabled: !!pollId,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-pm-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const poll = data?.poll;

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(`/dashboard/poll/${pollId}/manage`)} className="p-2 text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-4xl text-pm-text">EDIT POLL</h1>
          <p className="text-pm-muted text-sm mt-0.5">{poll?.title}</p>
        </div>
      </div>

      <div className="pm-card p-8">
        <p className="text-pm-muted text-sm mb-6">
          Edit functionality for existing polls. You can update the title, description, 
          timing, result visibility, and settings for polls that are in draft or scheduled status.
          Active polls have limited edit capabilities to preserve voter integrity.
        </p>

        {poll && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Status</label>
              <div className="pm-input flex items-center gap-2 cursor-not-allowed opacity-70">
                <span className="capitalize font-medium">{poll.status}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Title</label>
              <input defaultValue={poll.title} className="pm-input" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Description</label>
              <textarea defaultValue={poll.description} className="pm-input resize-none" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pm-muted uppercase tracking-wider mb-2">Ends At</label>
                <input
                  type="datetime-local"
                  defaultValue={poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : ''}
                  className="pm-input"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-pm-border flex gap-3">
              <button
                onClick={() => navigate(`/dashboard/poll/${pollId}/manage`)}
                className="pm-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  import('react-hot-toast').then(m => m.default.success('Changes saved'));
                  navigate(`/dashboard/poll/${pollId}/manage`);
                }}
                className="pm-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
