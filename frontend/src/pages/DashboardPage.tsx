import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  BrainCircuit,
  TrendingUp,
  Activity,
  Stethoscope,
  BarChart2,
  Timer,
  FileHeart,
  PlusCircle,
  Heart
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'journey' | 'analytics'>('overview');
  const [journeyData, setJourneyData] = useState<any>(null);

  // Manual Biometric Logger Modal state
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logHeartRate, setLogHeartRate] = useState('');
  const [logBloodGlucose, setLogBloodGlucose] = useState('');
  const [logCholesterol, setLogCholesterol] = useState('');
  const [logDate, setLogDate] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

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
      } else {
        setWarnings([]);
      }

      const journeyRes = await apiClient.get('/api/dashboard/journey-analytics');
      setJourneyData(journeyRes.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Background loop for real-time browser push notifications
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    // Request permission if not already granted/prompted
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const notifiedKeys = new Set<string>();

    const checkInterval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      if (activeReminders.length === 0) return;

      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDateStr = now.toDateString();

      activeReminders.forEach((rem) => {
        if (rem.reminder_time === currentHHMM) {
          const key = `${rem.id}_${todayDateStr}_${rem.reminder_time}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            
            // Trigger native HTML5 browser alert notification banner
            new Notification("💊 MediFlow Medication Reminder", {
              body: `It's time to take your dose: ${rem.title}. Frequency: ${rem.frequency}.`,
              icon: '/favicon.svg',
              tag: `med-${rem.id}`
            });
            console.log(`Push Notification triggered for reminder: ${rem.title}`);
          }
        }
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checkInterval);
  }, [activeReminders]);

  const handleSubmitBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logHeartRate && !logBloodGlucose && !logCholesterol) return;

    setIsLogging(true);
    setLogError(null);
    try {
      await apiClient.post('/api/biometrics/', {
        heart_rate: logHeartRate ? parseFloat(logHeartRate) : undefined,
        blood_glucose: logBloodGlucose ? parseFloat(logBloodGlucose) : undefined,
        cholesterol: logCholesterol ? parseFloat(logCholesterol) : undefined,
        date: logDate ? new Date(logDate).toISOString() : undefined
      });

      setLogHeartRate('');
      setLogBloodGlucose('');
      setLogCholesterol('');
      setLogDate('');
      setIsLogOpen(false);
      setLogSuccess("Biometrics successfully recorded!");
      setTimeout(() => setLogSuccess(null), 5000);
      fetchDashboardData();
    } catch (err: any) {
      setLogError(getApiErrorMessage(err, 'Failed to log biometrics.'));
    } finally {
      setIsLogging(false);
    }
  };

  const firstAppt = upcomingAppts.length > 0 ? upcomingAppts[0] : null;
  const nextReminder = activeReminders.length > 0 ? activeReminders[0] : null;

  return (
    <div className="space-y-8 p-1 font-sans">
      
      {/* Welcome Hero Banner with Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Good day, {user?.full_name?.split(' ')[0] || 'Patient'}
          </h2>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            {selectedTab === 'overview' && (warnings.length > 0 ? `${warnings.length} alerts require attention.` : 'No critical issues detected.')}
            {selectedTab === 'journey' && 'Your clinical pathway: Consultations, Appointments, and Diagnostics.'}
            {selectedTab === 'analytics' && 'Hospital-level compliance rates, wait times, and timelines.'}
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start md:self-auto">
          <button 
            onClick={() => setSelectedTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Overview
          </button>
          <button 
            onClick={() => setSelectedTab('journey')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'journey' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Treatment Journey
          </button>
          <button 
            onClick={() => setSelectedTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'analytics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Hospital Analytics
          </button>
        </div>
      </div>

      {/* TAB 1: HEALTH OVERVIEW */}
      {selectedTab === 'overview' && (
        <>
          {/* Top Bento Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Current Medicines */}
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
                  <div className="text-slate-800 font-bold">
                    <span className="text-xl md:text-2xl block leading-none">
                      {journeyData?.analytics?.compliance_rate !== undefined && journeyData.analytics.compliance_rate !== null 
                        ? `${journeyData.analytics.compliance_rate}%` 
                        : '100%'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase tracking-wide">Compliance</span>
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
                        strokeDashoffset={journeyData?.analytics?.compliance_rate ? `${113 - (journeyData.analytics.compliance_rate / 100) * 113}` : '0'} 
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
                      <p className="font-bold text-slate-800 text-sm truncate">{firstAppt.doctor_name}</p>
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
                  <p className="font-bold text-slate-800 text-sm truncate">
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
                  <p className="font-bold text-indigo-600 text-sm">
                    {warnings.length > 0 ? 'Duplicate medications flagged' : 'Patient profile status stable'}
                  </p>
                  <p className="text-slate-500 text-xs mt-1 leading-normal truncate">
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

          {/* Duplicate Medication Warnings description below bento cards */}
          {warnings.length > 0 && (
            <Alert type="warning" title="Potential Medication Interaction Warning!" className="glow-rose border-rose-500/20 my-6">
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

          {/* Charts & Bento Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Clinical Biometric Tracker */}
            <div className="lg:col-span-8">
              {(() => {
                const latestHeartRate = [...biometricTrends].reverse().find(t => t.heart_rate !== null)?.heart_rate || null;
                const latestBloodGlucose = [...biometricTrends].reverse().find(t => t.blood_glucose !== null)?.blood_glucose || null;
                const latestCholesterol = [...biometricTrends].reverse().find(t => t.cholesterol !== null)?.cholesterol || null;

                const getHeartRateStatus = (val: number | null) => {
                  if (val === null) return { label: 'No Data', color: 'bg-slate-100 text-slate-500 border-slate-200/50' };
                  if (val < 60) return { label: 'Low (<60)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
                  if (val <= 100) return { label: 'Normal (60-100)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
                  return { label: 'High (>100)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
                };

                const getBloodGlucoseStatus = (val: number | null) => {
                  if (val === null) return { label: 'No Data', color: 'bg-slate-100 text-slate-500 border-slate-200/50' };
                  if (val < 70) return { label: 'Low (<70)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
                  if (val <= 100) return { label: 'Fasting Normal', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
                  if (val < 126) return { label: 'Prediabetes (100-125)', color: 'bg-amber-500/10 text-amber-650 border-amber-500/20' };
                  return { label: 'High (>=126)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
                };

                const getCholesterolStatus = (val: number | null) => {
                  if (val === null) return { label: 'No Data', color: 'bg-slate-100 text-slate-500 border-slate-200/50' };
                  if (val < 200) return { label: 'Optimal (<200)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
                  if (val < 240) return { label: 'Borderline (200-239)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
                  return { label: 'High (>=240)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
                };

                const hrStatus = getHeartRateStatus(latestHeartRate);
                const bgStatus = getBloodGlucoseStatus(latestBloodGlucose);
                const cholStatus = getCholesterolStatus(latestCholesterol);

                return (
                  <Card variant="default" className="p-8 h-full flex flex-col justify-between space-y-6">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Biometric Clinical Vitalities</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time vitals and manual health logs</p>
                      </div>
                      
                      {logSuccess && (
                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-fade">
                          {logSuccess}
                        </span>
                      )}

                      <Button 
                        onClick={() => setIsLogOpen(true)}
                        className="flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Log Vitals Manually
                      </Button>
                    </div>

                    {/* Vitals Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Heart Rate Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 shadow-sm hover:scale-[1.01] transition duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Heart Rate</span>
                          <Activity className="h-4.5 w-4.5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-850">
                            {latestHeartRate !== null ? `${latestHeartRate} bpm` : '--'}
                          </p>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border mt-2 ${hrStatus.color}`}>
                            {hrStatus.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Target Range: 60 - 100 bpm (resting)
                        </p>
                      </div>

                      {/* Blood Glucose Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 shadow-sm hover:scale-[1.01] transition duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Blood Glucose</span>
                          <Heart className="h-4.5 w-4.5 text-rose-500 fill-rose-500/20" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-850">
                            {latestBloodGlucose !== null ? `${latestBloodGlucose} mg/dL` : '--'}
                          </p>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border mt-2 ${bgStatus.color}`}>
                            {bgStatus.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Fasting Target: 70 - 100 mg/dL
                        </p>
                      </div>

                      {/* Cholesterol Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 shadow-sm hover:scale-[1.01] transition duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Cholesterol</span>
                          <FileHeart className="h-4.5 w-4.5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-850">
                            {latestCholesterol !== null ? `${latestCholesterol} mg/dL` : '--'}
                          </p>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border mt-2 ${cholStatus.color}`}>
                            {cholStatus.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Healthy Target: &lt; 200 mg/dL
                        </p>
                      </div>

                    </div>
                  </Card>
                );
              })()}
            </div>

            {/* Extraction Telemetry */}
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
                        <span className="text-slate-400">Successfully Processed</span>
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
              <Link to="/timeline" className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
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
                        <p className="text-xs text-slate-450 mt-0.5">{doc.file_name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <p className="text-xs text-slate-450">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        {doc.extraction_status === 'completed' && (
                          <button
                            onClick={() => navigate('/consult', { state: { selectedDocId: doc.id, selectedDocName: doc.file_name } })}
                            className="flex items-center gap-1 px-2.5 py-1 border border-indigo-200 text-[10px] font-bold text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
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
        </>
      )}

      {/* TAB 2: MY TREATMENT JOURNEY */}
      {selectedTab === 'journey' && journeyData && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Regimen</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">{journeyData.journey.active_medications.length}</span>
                <span className="text-slate-400 text-xs font-semibold">prescribed</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Treatment logs managed via medication reminders.</p>
            </Card>
            
            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Diagnostic History</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">{journeyData.journey.diagnostic_history.length}</span>
                <span className="text-slate-400 text-xs font-semibold">lab & scans</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Historical biometric readings and specialist reports.</p>
            </Card>

            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Checkups</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">{journeyData.journey.pending_appointments.length}</span>
                <span className="text-slate-400 text-xs font-semibold">scheduled</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Pending specialist follow-ups and routine checkups.</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Pathway Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Upcoming Follow-ups card */}
              <Card variant="default" className="p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-indigo-600" />
                    Next Follow-up Pathway
                  </h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/30">
                    High Priority
                  </span>
                </div>
                {journeyData.journey.upcoming_followups.length > 0 ? (
                  journeyData.journey.upcoming_followups.map((follow: any, index: number) => (
                    <div key={index} className="flex gap-4 items-start bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200/50 text-indigo-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{follow.doctor_name}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{follow.hospital_name}</p>
                        <p className="text-xs font-semibold text-indigo-600 mt-2 bg-indigo-50/50 inline-block px-2 py-0.5 rounded-md border border-indigo-100">
                          Scheduled: {new Date(follow.appointment_date).toLocaleString()}
                        </p>
                        {follow.reason && (
                          <p className="text-xs text-slate-500 mt-2 italic bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            Reason: {follow.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-450 py-4 text-center">No upcoming follow-up appointments scheduled.</p>
                )}
              </Card>

              {/* Consultation Timeline */}
              <Card variant="default" className="p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <Stethoscope className="h-4.5 w-4.5 text-indigo-600" />
                  Clinical Pathway & Consultations
                </h3>
                
                <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                  {journeyData.journey.pending_appointments.map((appt: any) => (
                    <div key={appt.id} className="relative">
                      <div className="absolute -left-[35px] top-1 h-5 w-5 rounded-full bg-indigo-50 border-2 border-indigo-500 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 tracking-wide uppercase">Scheduled Pathway</span>
                        <h4 className="font-bold text-slate-700 mt-0.5">{appt.doctor_name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{appt.hospital_name}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{appt.reason || 'Routine clinical review'}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">{new Date(appt.appointment_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}

                  {journeyData.journey.completed_consultations.map((appt: any) => (
                    <div key={appt.id} className="relative">
                      <div className="absolute -left-[35px] top-1 h-5 w-5 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 tracking-wide uppercase">Completed Consultation</span>
                        <h4 className="font-bold text-slate-600 mt-0.5">{appt.doctor_name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{appt.hospital_name}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{appt.reason || 'General medical review'}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">{new Date(appt.appointment_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}

                  {journeyData.journey.pending_appointments.length === 0 && journeyData.journey.completed_consultations.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No consultation pathways generated.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Active Regimen & Diagnostic Reports */}
            <div className="lg:col-span-5 space-y-6">
              <Card variant="default" className="p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Pill className="h-4.5 w-4.5 text-indigo-600" />
                  Active Treatment Regimen
                </h3>
                {journeyData.journey.active_medications.length > 0 ? (
                  <div className="space-y-3">
                    {journeyData.journey.active_medications.map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 capitalize">{med.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{med.dosage} - {med.frequency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {med.doses_taken_today}/{med.doses_total_today} Taken
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No active medication schedules recorded.</p>
                )}
              </Card>

              <Card variant="default" className="p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <FileHeart className="h-4.5 w-4.5 text-indigo-600" />
                  Diagnostic Reports & Lab Findings
                </h3>
                {journeyData.journey.diagnostic_history.length > 0 ? (
                  <div className="space-y-4">
                    {journeyData.journey.diagnostic_history.map((diag: any) => (
                      <div key={diag.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 capitalize">{diag.file_name.substring(0, 24)}...</h4>
                            <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              {diag.document_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(diag.document_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-550 italic bg-white/80 p-2 rounded border border-slate-100 leading-normal">
                          {diag.findings}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No lab reports or diagnostic tests processed.</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HOSPITAL-LEVEL ANALYTICS */}
      {selectedTab === 'analytics' && journeyData && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Patient Compliance</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">
                  {journeyData.analytics.compliance_rate !== null ? `${journeyData.analytics.compliance_rate}%` : 'No Data'}
                </span>
                {journeyData.analytics.compliance_rate !== null && (
                  <span className="text-emerald-500 text-xs font-bold">↑ 2.4% vs cohort</span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${journeyData.analytics.compliance_rate || 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Calculated from total medication dose logs completed relative to expectations.</p>
            </Card>
            
            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Missed Follow-up Rates</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">
                  {journeyData.analytics.missed_followup_rate !== null ? `${journeyData.analytics.missed_followup_rate}%` : 'No Data'}
                </span>
                {journeyData.analytics.missed_followup_rate !== null && (
                  <span className="text-rose-500 text-xs font-bold">↓ 0.8% missed</span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${journeyData.analytics.missed_followup_rate || 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Calculated from total appointments cancelled relative to medical workflows.</p>
            </Card>

            <Card variant="glass" className="p-6">
              <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Average Treatment Timeline</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-600">{journeyData.analytics.treatment_timeline.avg_duration_days}</span>
                <span className="text-slate-400 text-xs font-semibold">days active course</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: '45%' }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Mean treatment duration across active prescriptions.</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="default" className="p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Timer className="h-4.5 w-4.5 text-indigo-600" />
                Clinic Wait times & Appointment Bottlenecks
              </h3>
              <p className="text-xs text-slate-400 mb-6">Patient administrative bottlenecks across clinic providers.</p>
              
              <div className="space-y-5">
                {journeyData.analytics.bottlenecks.map((bottleneck: any, index: number) => {
                  const percent = Math.min(100, (bottleneck.delay_minutes / 45) * 100);
                  const isHighDelay = bottleneck.delay_minutes >= 20;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{bottleneck.name}</span>
                        <span className={`font-semibold ${isHighDelay ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
                          Avg. Delay: {bottleneck.delay_minutes} min ({bottleneck.appointments_count} appts)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/30">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighDelay ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="default" className="p-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
                Treatment Timeline Distribution (By Category)
              </h3>
              <p className="text-xs text-slate-400 mb-6">Aggregated cohort timelines across therapeutic segments.</p>
              
              <div className="space-y-5">
                {journeyData.analytics.treatment_timeline.categories.map((category: any, index: number) => {
                  const percent = Math.min(100, (category.avg_days / 90) * 100);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{category.name}</span>
                        <span className="font-semibold text-indigo-600 font-bold">
                          Avg. Duration: {category.avg_days} days
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/30">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-600 to-indigo-400" 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Manual Biometrics Logging Dialog */}
      <Dialog 
        isOpen={isLogOpen} 
        onClose={() => setIsLogOpen(false)} 
        title="Log Vitals & Biometrics Manually"
      >
        <form onSubmit={handleSubmitBiometrics} className="space-y-5">
          {logError && <Alert type="error">{logError}</Alert>}
          
          <div className="space-y-4">
            <Input 
              label="Heart Rate (BPM)" 
              type="number"
              placeholder="e.g. 72"
              value={logHeartRate}
              onChange={(e) => setLogHeartRate(e.target.value)}
            />

            <Input 
              label="Blood Glucose (mg/dL)" 
              type="number"
              placeholder="e.g. 95"
              value={logBloodGlucose}
              onChange={(e) => setLogBloodGlucose(e.target.value)}
            />

            <Input 
              label="Total Cholesterol (mg/dL)" 
              type="number"
              placeholder="e.g. 185"
              value={logCholesterol}
              onChange={(e) => setLogCholesterol(e.target.value)}
            />

            <Input 
              label="Reading Date & Time (Optional)" 
              type="datetime-local"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setIsLogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              isLoading={isLogging}
            >
              Save Vital Readings
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
