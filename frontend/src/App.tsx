import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { RemindersPage } from './pages/RemindersPage';
import { TimelinePage } from './pages/TimelinePage';
import { AIConsultPage } from './pages/AIConsultPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { 
  Activity, 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Clock, 
  Sparkles, 
  LogOut, 
  ChevronRight,
  MapPin
} from 'lucide-react';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppLayout: React.FC = () => {
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents Hub', icon: FileText },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/reminders', label: 'Reminders', icon: Clock },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/ai-consult', label: 'AI Consult', icon: Sparkles },
    { to: '/locator', label: 'Facilities Locator', icon: MapPin },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <Activity className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              MediFlow
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/20 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile and logout */}
        <div className="p-4 border-t border-slate-105 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-550 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              {user?.full_name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.full_name || 'Patient'}</p>
              <p className="text-xs text-slate-450 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-500 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center flex-1 max-w-md relative">
            <span className="absolute left-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search medical history, labs, or AI insights..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/documents" className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98]">
              <span>Upload</span>
            </Link>
            
            <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-bold text-indigo-600 uppercase">
              {user?.full_name?.substring(0, 2) || 'PT'}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/ai-consult" element={<AIConsultPage />} />
            <Route path="/locator" element={<FacilitiesPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/*" 
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
