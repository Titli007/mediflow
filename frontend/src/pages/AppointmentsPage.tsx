import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { Alert } from '../components/ui/Alert';
import { 
  Calendar, Plus, Trash2, MapPin, Stethoscope, RefreshCw, 
  Sparkles, BrainCircuit, AlertTriangle, ShieldAlert, Clock, ArrowRight 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';

interface Appointment {
  id: number;
  doctor_name: string;
  hospital_name: string;
  appointment_date: string;
  reason?: string;
  status: string;
}

interface Doctor {
  id: number;
  name: string;
  hospital: string;
  slots: string[];
}

interface Recommendation {
  specialty: string;
  urgency: 'Emergency' | 'Urgent' | 'Routine';
  rationale: string;
}

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Recommender State
  const [symptoms, setSymptoms] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Manual Form Fields
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/appointments/');
      setAppointments(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsTriageLoading(true);
    setError(null);
    setRecommendation(null);
    setDoctorsList([]);
    setSelectedDoctorId(null);
    setSelectedSlot('');
    setBookingSuccess(null);

    try {
      const response = await apiClient.get('/api/specialists/recommend', {
        params: { symptoms }
      });
      setRecommendation(response.data.recommendation);
      setDoctorsList(response.data.doctors);
      if (response.data.doctors.length > 0) {
        setSelectedDoctorId(response.data.doctors[0].id);
        if (response.data.doctors[0].slots.length > 0) {
          setSelectedSlot(response.data.doctors[0].slots[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to retrieve AI triage recommendation.');
    } finally {
      setIsTriageLoading(false);
    }
  };

  const handleBookAISlot = async () => {
    if (!selectedDoctorId || !selectedSlot || !recommendation) return;
    
    const doc = doctorsList.find(d => d.id === selectedDoctorId);
    if (!doc) return;

    setIsTriageLoading(true);
    try {
      // Calculate a tomorrow date with the selected slot time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [hour, minute] = selectedSlot.split(':');
      tomorrow.setHours(parseInt(hour), parseInt(minute), 0, 0);

      await apiClient.post('/api/appointments/', {
        doctor_name: doc.name,
        hospital_name: doc.hospital,
        appointment_date: tomorrow.toISOString(),
        reason: `AI Referred: Symptoms: "${symptoms.substring(0, 40)}...". Triaged Department: ${recommendation.specialty} (${recommendation.urgency})`,
      });

      setBookingSuccess(`Successfully scheduled appointment with ${doc.name} for tomorrow at ${selectedSlot}!`);
      setSymptoms('');
      setRecommendation(null);
      setDoctorsList([]);
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to book slot.');
    } finally {
      setIsTriageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !hospitalName || !date) return;

    setIsLoading(true);
    try {
      await apiClient.post('/api/appointments/', {
        doctor_name: doctorName,
        hospital_name: hospitalName,
        appointment_date: new Date(date).toISOString(),
        reason: reason || undefined,
      });

      setDoctorName('');
      setHospitalName('');
      setDate('');
      setReason('');
      setIsOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create appointment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/appointments/${id}`);
      setAppointments(appointments.filter((a) => a.id !== id));
    } catch (err) {
      setError('Failed to delete appointment.');
    }
  };

  const activeDoc = doctorsList.find(d => d.id === selectedDoctorId);

  return (
    <div className="space-y-8 p-1 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Medical Appointments & AI Booking
          </h1>
          <p className="text-slate-400 mt-1">Symptom-based specialist matching, live booking slots, and manual schedulers.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchAppointments}
            className="text-slate-405 hover:text-slate-600 transition-colors p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <Button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4.5 w-4.5" />
            Manual Booking
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}
      {bookingSuccess && <Alert type="success" className="mb-6">{bookingSuccess}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: AI specialist recommendation widget */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="glass" className="p-6 border-indigo-500/10 glow-violet bg-gradient-to-br from-indigo-500/5 to-transparent">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
              <BrainCircuit className="h-5 w-5 text-indigo-600" />
              AI Specialist Referral Assistant
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Describe your active symptoms. Our system will analyze them against your medical history using Gemini to refer the correct clinic specialist.
            </p>

            <form onSubmit={handleTriageSubmit} className="space-y-4">
              <div>
                <textarea 
                  placeholder="Describe how you are feeling (e.g. Chest tightness, shortness of breath after meals, dry cough for 3 days...)"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-slate-850 bg-white border border-slate-200 outline-none text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500/20"
                  rows={4}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full justify-center flex items-center gap-2"
                isLoading={isTriageLoading}
              >
                <Sparkles className="h-4 w-4" />
                Analyze Symptoms & Retrieve Slots
              </Button>
            </form>

            {/* AI Recommendation Outcome Cards */}
            {recommendation && (
              <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-4 animate-pop">
                
                {/* Urgent/Emergency Warning Info Banner */}
                {recommendation.urgency === 'Emergency' && (
                  <div className="p-4 bg-rose-50 border border-rose-200/50 rounded-xl flex gap-3 text-rose-700">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Critical Medical Warning</p>
                      <p className="text-xs mt-1 leading-relaxed font-semibold">
                        Your symptoms match urgent/life-threatening classifications. Proceed to the nearest emergency center immediately.
                      </p>
                      <Link 
                        to="/locator" 
                        className="text-xs text-rose-600 font-extrabold hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        Locate Emergency ER Center
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-indigo-50/50 border border-indigo-200/30 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Referred Department</span>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                        <Stethoscope className="h-4 w-4 text-indigo-600" />
                        {recommendation.specialty}
                      </h4>
                    </div>

                    <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded ${
                      recommendation.urgency === 'Emergency' 
                        ? 'bg-rose-500 text-white' 
                        : recommendation.urgency === 'Urgent'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {recommendation.urgency}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100">
                    "{recommendation.rationale}"
                  </p>
                </div>

                {/* Doctor Slot Selection Widget */}
                {doctorsList.length > 0 && recommendation.urgency !== 'Emergency' && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      Available Specialist Booking Slots
                    </h4>

                    {/* Doctor Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Physician</label>
                      <select 
                        value={selectedDoctorId || ''} 
                        onChange={(e) => {
                          const docId = parseInt(e.target.value);
                          setSelectedDoctorId(docId);
                          const d = doctorsList.find(x => x.id === docId);
                          if (d && d.slots.length > 0) setSelectedSlot(d.slots[0]);
                        }}
                        className="w-full text-xs bg-white border border-slate-250 p-2.5 rounded-lg text-slate-800 focus:outline-none"
                      >
                        {doctorsList.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name} ({doc.hospital})</option>
                        ))}
                      </select>
                    </div>

                    {/* Slot Selector */}
                    {activeDoc && activeDoc.slots.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Select Time Slot (Tomorrow)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {activeDoc.slots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-lg text-center font-bold text-xs border transition cursor-pointer ${
                                selectedSlot === slot 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                  : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleBookAISlot}
                      className="w-full justify-center"
                      isLoading={isTriageLoading}
                    >
                      Confirm Booking
                    </Button>
                  </div>
                )}

              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Active Appointments List */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="default" className="p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Scheduled Consultations
            </h3>

            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div 
                    key={appt.id}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition duration-300"
                  >
                    <div className="flex gap-3">
                      <div className="p-2 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600 shrink-0 self-start mt-0.5">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-850 text-sm leading-snug">{appt.doctor_name}</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {appt.hospital_name}
                        </p>
                        
                        <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-md px-2 py-0.5 mt-2 inline-block">
                          Scheduled: {new Date(appt.appointment_date).toLocaleString()}
                        </p>

                        {appt.reason && (
                          <p className="text-xs text-slate-500 mt-2 bg-white/70 p-2.5 rounded-lg border border-slate-100 leading-normal">
                            {appt.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 self-end md:self-auto flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${
                        appt.status === 'scheduled'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200/50'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-250'
                      }`}>
                        {appt.status.toUpperCase()}
                      </span>
                      
                      <button 
                        onClick={() => handleDelete(appt.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Cancel Schedule"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                No active clinical appointments scheduled. Describe symptoms on the left to triage.
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Modal Dialog Form (Manual scheduling override) */}
      <Dialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Schedule Appointment manually"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label="Doctor Name" 
            placeholder="Dr. John Doe"
            required
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />

          <Input 
            label="Hospital/Clinic Location" 
            placeholder="City General Hospital"
            required
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
          />

          <Input 
            label="Date & Time" 
            type="datetime-local"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Reason for Visit</label>
            <textarea 
              placeholder="E.g., Routine followup, blood glucose check..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              isLoading={isLoading}
            >
              Schedule
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

