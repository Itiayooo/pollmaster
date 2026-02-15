import { useNavigate } from 'react-router-dom';
import { Zap, Globe, Shield, BarChart2, ArrowRight, Users, Lock, Code2, ChevronRight } from 'lucide-react';

const features = [
  { icon: Globe, title: 'Public & Private Polls', desc: 'Host open polls or lock them down with tokens, invite lists, access codes, or account gates.' },
  { icon: Shield, title: 'Flexible Eligibility', desc: 'Rule-based access control. Define who can vote without hardcoding users. Fully configurable.' },
  { icon: BarChart2, title: 'Real-Time Analytics', desc: 'Live vote tracking, participation timelines, and exportable results at your fingertips.' },
  { icon: Lock, title: 'Controlled Visibility', desc: 'Show results immediately, on close, or only when you release them. You decide.' },
  { icon: Users, title: 'Multi-Tenant Platform', desc: 'Thousands of independent polls running simultaneously. Complete host isolation.' },
  { icon: Code2, title: 'API-First Design', desc: 'Built for extensibility. Integrate PollMaster into your own workflows and systems.' },
];

const categories = ['Governance', 'DAO Voting', 'Community', 'Events', 'Awards', 'Competitions'];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-pm-darker text-pm-text font-body">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-pm-border/50 bg-pm-darker/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-pm-red rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-2xl tracking-wide">POLLMASTER</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/explore')} className="text-pm-muted hover:text-pm-text text-sm font-medium transition-colors px-4 py-2">
              Explore
            </button>
            <button onClick={() => navigate('/login')} className="text-pm-muted hover:text-pm-text text-sm font-medium transition-colors px-4 py-2">
              Sign In
            </button>
            <button onClick={() => navigate('/register')} className="pm-btn-primary text-sm py-2 px-5">
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Grid BG */}
        <div className="absolute inset-0 bg-grid opacity-60" />

        {/* Glow orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pm-red/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[200px] h-[200px] bg-pm-purple/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pm-border bg-pm-card text-xs text-pm-muted mb-8 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-pm-red animate-pulse" />
            Global Multi-Tenant Voting Infrastructure
          </div>

          <h1 className="font-display text-[80px] md:text-[110px] leading-[0.9] tracking-tight mb-6">
            <span className="text-pm-text">VOTING</span>
            <br />
            <span className="text-gradient">INFRASTRUCTURE</span>
            <br />
            <span className="text-pm-text">FOR EVERYONE</span>
          </h1>

          <p className="text-lg text-pm-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Create, configure, and host any poll — from community surveys to DAO governance votes.
            PollMaster is the platform layer your decision-making runs on.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/register')}
              className="pm-btn-primary flex items-center gap-2 text-base px-8 py-3.5"
            >
              Create Your First Poll
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="pm-btn-secondary flex items-center gap-2 text-base px-8 py-3.5"
            >
              Browse Live Polls
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Live stats strip */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { label: 'Polls Hosted', value: '10K+' },
              { label: 'Votes Cast', value: '2.4M+' },
              { label: 'Access Models', value: '6' },
            ].map((stat) => (
              <div key={stat.label} className="pm-card p-4 text-center">
                <div className="font-display text-4xl text-pm-red">{stat.value}</div>
                <div className="text-pm-muted text-xs mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases ticker */}
      <div className="border-y border-pm-border bg-pm-card/50 overflow-hidden py-4">
        <div className="flex gap-12 animate-none whitespace-nowrap">
          {[...categories, ...categories].map((cat, i) => (
            <div key={i} className="inline-flex items-center gap-3 text-pm-muted text-sm font-medium px-2">
              <span className="text-pm-red">●</span>
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl text-pm-text mb-4">BUILT FOR SCALE</h2>
            <p className="text-pm-muted max-w-xl mx-auto">
              Not a form builder. Not a survey tool. PollMaster is voting infrastructure
              with configurable rules and identity-based validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat) => (
              <div key={feat.title} className="pm-card p-6 hover:border-pm-red/40 transition-colors group">
                <div className="w-10 h-10 bg-pm-red/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pm-red/20 transition-colors">
                  <feat.icon className="w-5 h-5 text-pm-red" />
                </div>
                <h3 className="font-semibold text-pm-text mb-2">{feat.title}</h3>
                <p className="text-pm-muted text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access models section */}
      <section className="py-24 px-6 bg-pm-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-5xl text-pm-text mb-4">6 ACCESS MODELS</h2>
              <p className="text-pm-muted mb-8 leading-relaxed">
                Every poll has its own access control layer. Choose how voters enter — 
                public, invite, token, code, link, or account-based.
              </p>
              <button onClick={() => navigate('/register')} className="pm-btn-primary flex items-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Public', desc: 'Anyone with the link can vote', color: 'bg-green-500' },
                { label: 'Token-Based', desc: 'Unique one-use token per voter', color: 'bg-pm-red' },
                { label: 'Invite-Only', desc: 'Email invites with personal tokens', color: 'bg-pm-blue' },
                { label: 'Access Code', desc: 'Single shared code for your group', color: 'bg-pm-purple' },
                { label: 'Link-Based', desc: 'Secure tokenized URL access', color: 'bg-yellow-500' },
                { label: 'Account-Gated', desc: 'Must have a PollMaster account', color: 'bg-orange-500' },
              ].map((model) => (
                <div key={model.label} className="flex items-center gap-4 pm-card px-4 py-3">
                  <div className={`w-2 h-2 rounded-full ${model.color}`} />
                  <div>
                    <span className="text-sm font-semibold text-pm-text">{model.label}</span>
                    <span className="text-pm-muted text-xs ml-2">— {model.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="pm-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pm-red/5 to-pm-purple/5" />
            <div className="relative">
              <h2 className="font-display text-6xl text-pm-text mb-4">READY TO POLL?</h2>
              <p className="text-pm-muted mb-8">
                Free to start. No credit card required. Your first poll is live in under 2 minutes.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="pm-btn-primary text-base px-10 py-4 flex items-center gap-2 mx-auto"
              >
                Create Free Account <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pm-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-pm-muted text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-pm-red" />
            <span className="font-display text-lg text-pm-text">POLLMASTER</span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <p>Global Voting Infrastructure</p>
        </div>
      </footer>
    </div>
  );
}
