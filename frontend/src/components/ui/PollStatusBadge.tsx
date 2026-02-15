import { PollStatus } from '../../types';

const STATUS_CONFIG: Record<PollStatus, { label: string; cls: string; dot?: boolean }> = {
  active: { label: 'Live', cls: 'status-active', dot: true },
  draft: { label: 'Draft', cls: 'status-draft' },
  closed: { label: 'Closed', cls: 'status-closed' },
  scheduled: { label: 'Scheduled', cls: 'status-scheduled' },
  paused: { label: 'Paused', cls: 'status-paused' },
  archived: { label: 'Archived', cls: 'bg-pm-border/30 text-pm-muted border border-pm-border' },
};

export default function PollStatusBadge({ status }: { status: PollStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`pm-badge ${cfg.cls}`}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {cfg.label}
    </span>
  );
}
