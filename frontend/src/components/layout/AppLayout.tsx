import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Plus, LogOut, Zap, ChevronRight, Globe, Hash } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/create', label: 'Create Poll', icon: Plus, end: false },
  { to: '/dashboard/explore', label: 'Explore', icon: Globe, end: false },
  { to: '/dashboard/join', label: 'Join a Poll', icon: Hash, end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-pm-darker">
      <aside className="w-64 bg-pm-card border-r border-pm-border flex flex-col shrink-0">
        <div className="p-6 border-b border-pm-border">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pm-red rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-2xl text-pm-text tracking-wide">POLLMASTER</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-pm-red/15 text-pm-red border border-pm-red/20'
                    : 'text-pm-muted hover:text-pm-text hover:bg-pm-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-pm-red' : ''}`} />
                  {item.label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-pm-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pm-red to-pm-purple rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
              {user?.displayName?.[0] || user?.username?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-pm-text truncate">{user?.displayName || user?.username}</p>
              <p className="text-xs text-pm-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-pm-muted hover:text-pm-text hover:bg-pm-surface rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}