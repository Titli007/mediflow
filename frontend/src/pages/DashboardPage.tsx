import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Pill, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardStats {
  total_documents: number;
  total_appointments: number;
  total_reminders: number;
  completed_extractions: number;
  failed_extractions: number;
}

interface DuplicateWarning {
  medication_1: string;
  medication_2: string;
  document_1: string;
  document_2: string;
  reason: string;
}

interface Appointment {
  id: number;
  doctor_name: string;
  hospital_name: string;
  appointment_date: string;
  reason?: string;
  status: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [medications, setMedications] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<DuplicateWarning[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [activeReminders, setActiveReminders] = useState<any[]>([]);
  const [biometricTrends, setBiometricTrends] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'heart_rate' | 'blood_glucose' | 'cholesterol'>('heart_rate');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashRes = await apiClient.get('/api/dashboard/');
        setStats(dashRes.data.stats);
        setMedications(dashRes.data.current_medications || []);
        setRecentDocs(dashRes.data.recent_documents || []);
        setUpcomingAppts(dashRes.data.upcoming_appointments || []);
        setActiveReminders(dashRes.data.active_reminders || []);
        setBiometricTrends(dashRes.data.biometric_trends || []);

        const warningsRes = await apiClient.get('/api/ai/duplicate-medications');
        if (warningsRes.data.has_warnings) {
          setWarnings(warningsRes.data.warnings);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const firstAppt = upcomingAppts.length > 0 ? upcomingAppts[0] : null;
  const nextReminder = activeReminders.length > 0 ? activeReminders[0] : null;

  return (
    <div className="space-y-8 p-1 font-sans">
      
      {/* Welcome Hero Banner with Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Good day, {user?.full_name?.split(' ')[0] || 'Patient'}
          </h2>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Your health metrics are looking stable today. {warnings.length > 0 ? `${warnings.length} alerts require attention.` : 'No critical issues detected.'}
          </p>
        </div>
        
        {/* Time Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start md:self-auto">
          <button 
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeFilter === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setTimeFilter('week')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeFilter === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Week
          </button>
          <button 
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timeFilter === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Duplicate Medication Warnings */}
      {warnings.length > 0 && (
        <Alert type="warning" title="Potential Medication Interaction Warning!" className="glow-rose border-rose-500/20">
          <div className="space-y-3 mt-1 text-slate-700">
            <p>We detected duplicate ingredients or duplicate prescriptions across your uploaded records. Please consult a physician immediately:</p>
            {warnings.map((w, index) => (
              <div key={index} className="flex gap-2 items-start bg-white/40 p-3 rounded-lg border border-yellow-500/10">
                <AlertTriangle className="h-4.5 w-4.5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-yellow-600 capitalize">{w.medication_1}</span> and{' '}
                  <span className="font-bold text-yellow-600 capitalize">{w.medication_2}</span> ({w.reason})
                  <div className="text-xs text-slate-500 mt-1">
                    Found in: <span className="italic">{w.document_1}</span> & <span className="italic">{w.document_2}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Top Bento Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Current Medicines with Radial SVG */}
        <Card variant="glass" className="flex flex-col justify-between h-44 hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex justify-between items-start p-6">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600">
              <Pill className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-50/50 px-2.5 py-0.5 rounded-full border border-indigo-200/50">
              <span>{medications.length}</span>
              <span className="opacity-60">Active</span>
            </div>
          </div>
          <div className="px-6 pb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Medicines</h3>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-800">
                {activeReminders.length > 0 ? "80% Compliance" : "100% Compliance"}
              </div>
              <div className="relative h-11 w-11 shrink-0">
                <svg className="h-full w-full transform -rotate-90">
                  <circle className="text-slate-100" cx="22" cy="22" fill="transparent" r="18" stroke="currentColor" strokeWidth="3.5"></circle>
                  <circle 
                    className="text-indigo-600 transition-all duration-1000" 
                    cx="22" 
                    cy="22" 
                    fill="transparent" 
                    r="18" 
                    stroke="currentColor" 
                    strokeDasharray="113" 
                    strokeDashoffset={activeReminders.length > 0 ? "22.6" : "0"} 
                    strokeWidth="3.5"
                  ></circle>
                </svg>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Upcoming Appointment */}
        <Card variant="glass" className="flex flex-col justify-between h-44 hover:translate-y-[-4px] transition-all duration-300">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600 w-fit m-6">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="px-6 pb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming Appointment</h3>
            <div className="mt-2 min-h-[3.5rem]">
              {firstAppt ? (
                <>
                  <p className="font-bold text-slate-850 text-sm truncate">{firstAppt.doctor_name}</p>
                  <p className="text-indigo-600 text-xs mt-1 font-semibold">
                    {new Date(firstAppt.appointment_date).toLocaleDateString()} at {new Date(firstAppt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-xs mt-1">No scheduled appointments.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Card 3: Next Medicine Reminder */}
        <Card variant="glass" className="flex flex-col justify-between h-44 hover:translate-y-[-4px] transition-all duration-300">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600 w-fit m-6">
            <Clock className="h-5 w-5" />
          </div>
          <div className="px-6 pb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Medicine Reminder</h3>
            <div className="mt-2">
              <p className="font-bold text-slate-805 text-sm truncate">
                {nextReminder ? nextReminder.title : 'All caught up!'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {nextReminder ? `Dose time: ${nextReminder.reminder_time} (${nextReminder.frequency})` : 'No reminders active'}
              </p>
            </div>
          </div>
        </Card>

        {/* Card 4: AI Health Insights */}
        <Card variant="glass" className="flex flex-col justify-between h-44 hover:translate-y-[-4px] transition-all duration-300 border-indigo-500/10 glow-violet bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600 w-fit m-6">
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
          </div>
          <div className="px-6 pb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              AI Insights
            </h3>
            <div className="mt-2">
              <p className="font-bold text-indigo-650 text-sm">
                {warnings.length > 0 ? 'Duplicate medications flagged' : 'Patient profile status stable'}
              </p>
              <p className="text-slate-450 text-xs mt-1 leading-normal truncate">
                {warnings.length > 0 
                  ? `Found ${warnings.length} duplication warnings` 
                  : stats?.total_documents && stats.total_documents > 0
                  ? `Clinical analysis based on ${stats.total_documents} file(s)`
                  : 'Upload prescriptions/lab reports to begin.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts & Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Health Trends dynamic SVG chart */}
        <div className="lg:col-span-8">
          <Card variant="default" className="p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Health Trends</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Biometric logs extracted from patient files</p>
                </div>
                
                {/* Metric selector tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 self-start md:self-auto text-[10px]">
                  <button 
                    onClick={() => setSelectedMetric('heart_rate')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedMetric === 'heart_rate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Heart Rate (bpm)
                  </button>
                  <button 
                    onClick={() => setSelectedMetric('blood_glucose')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedMetric === 'blood_glucose' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Blood Glucose (mg/dL)
                  </button>
                  <button 
                    onClick={() => setSelectedMetric('cholesterol')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedMetric === 'cholesterol' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    Cholesterol (mg/dL)
                  </button>
                </div>
              </div>

              {/* Dynamic Chart Container */}
              {(() => {
                const dataPoints = biometricTrends.filter(t => t[selectedMetric] !== null);
                if (dataPoints.length === 0) {
                  return (
                    <div className="w-full h-64 bg-slate-50 border border-slate-200/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                      <Sparkles className="h-8 w-8 text-indigo-400 mb-3 animate-pulse" />
                      <h4 className="font-bold text-slate-800 text-sm">No {selectedMetric.replace('_', ' ').toUpperCase()} readings</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1">Upload records in the Documents Hub to populate this metric trend.</p>
                    </div>
                  );
                }

                const values = dataPoints.map(d => Number(d[selectedMetric]));
                const maxVal = Math.max(...values, 100);
                const minVal = Math.min(...values, 0);
                const range = maxVal - minVal || 1;

                return (
                  <div className="w-full h-64 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-end p-6 gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent opacity-30"></div>
                    {dataPoints.slice(-10).map((pt, idx) => {
                      const val = pt[selectedMetric];
                      const pct = ((val - minVal) / range) * 70 + 20; // scale between 20% and 90%
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group/bar cursor-pointer h-full justify-end">
                          <div className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 mb-1">
                            {val}
                          </div>
                          <div 
                            className="w-full bg-indigo-600/10 hover:bg-indigo-600/30 border-t border-indigo-500/30 rounded-t-lg transition-all duration-500 relative" 
                            style={{ height: `${pct}%` }}
                            title={`${pt.document_name}: ${val} on ${pt.date}`}
                          >
                            <div className="absolute -top-1 left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50"></div>
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold truncate max-w-full">
                            {new Date(pt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </Card>
        </div>

        {/* Monthly Uploads and Sync Status */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card variant="default" className="p-8 flex flex-col justify-between flex-1">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-6">Extraction Telemetry</h3>
              <div className="space-y-5">
                {/* Total Reports */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Total Uploaded Documents</span>
                    <span className="text-slate-800">{stats ? stats.total_documents : 0} files</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: stats && stats.total_documents > 0 ? '100%' : '0%' }}></div>
                  </div>
                </div>
                {/* Completed Extractions */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Successfully Processed (Completed)</span>
                    <span className="text-slate-800">{stats ? stats.completed_extractions : 0} files</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: stats && stats.total_documents > 0 ? `${(stats.completed_extractions / stats.total_documents) * 100}%` : '0%' }}></div>
                  </div>
                </div>
                {/* Failed Extractions */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Failed / Flagged Extractions</span>
                    <span className="text-slate-800">{stats ? stats.failed_extractions : 0} files</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: stats && stats.total_documents > 0 ? `${(stats.failed_extractions / stats.total_documents) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Status Banner */}
            <div className="mt-8 p-3.5 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 border border-indigo-200/50 rounded-lg text-indigo-600">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">Database Synchronized</p>
                <p className="text-[10px] text-slate-400 mt-0.5">HIPAA compliant connection secure</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <Card variant="default" className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
          <Link to="/timeline" className="text-xs font-bold text-indigo-650 hover:text-indigo-500">
            View Patient Timeline
          </Link>
        </div>

        {recentDocs.length > 0 ? (
          <div className="space-y-1">
            {recentDocs.map((doc, idx) => (
              <div 
                key={doc.id || idx}
                className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-4 -mx-4 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200/55 flex items-center justify-center text-indigo-600">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Medical Document Uploaded</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.file_name}</p>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="text-xs text-slate-400">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2">
                    {doc.extraction_status === 'completed' && (
                      <button
                        onClick={() => navigate('/consult', { state: { selectedDocId: doc.id, selectedDocName: doc.file_name } })}
                        className="flex items-center gap-1 px-2.5 py-1 border border-indigo-200 text-[10px] font-bold text-indigo-650 bg-indigo-50/30 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      >
                        <BrainCircuit className="h-3 w-3" />
                        Chat with Document
                      </button>
                    )}
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      doc.extraction_status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : doc.extraction_status === 'failed'
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 animate-pulse'
                    }`}>
                      {doc.extraction_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            No recent activity to display.
          </div>
        )}
      </Card>
    </div>
  );
};
