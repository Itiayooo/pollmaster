import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-pm-darker flex items-center justify-center text-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative animate-slide-up">
        <div className="font-display text-[180px] text-pm-border leading-none select-none">404</div>
        <h1 className="font-display text-4xl text-pm-text -mt-8 mb-4">PAGE NOT FOUND</h1>
        <p className="text-pm-muted mb-8">This page doesn't exist or was moved.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="pm-btn-primary">Go Home</button>
          <button onClick={() => navigate(-1)} className="pm-btn-secondary">Go Back</button>
        </div>
      </div>
    </div>
  );
}
