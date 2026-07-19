import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { Alert } from '../components/ui/Alert';
import { Calendar, Plus, Trash2, MapPin, Stethoscope, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';

interface Appointment {
  id: number;
  doctor_name: string;
  hospital_name: string;
  appointment_date: string;
  reason?: string;
  status: string;
}

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
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

  return (
    <div className="space-y-8 p-1 font-sans">
      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Medical Appointments
          </h1>
          <p className="text-slate-400 mt-1">Keep track of your consultations and clinic checkups.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchAppointments}
            className="text-slate-400 hover:text-slate-650 transition-colors p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <Button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Consultation
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}

      {/* Appointment Grid list */}
      {appointments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appt) => (
            <Card 
              key={appt.id} 
              variant="glass" 
              className="flex flex-col justify-between border-slate-200/60 hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300"
            >
              <div className="p-6 space-y-4">
                {/* Doctor and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-650">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{appt.doctor_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Physician Specialist</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    appt.status === 'scheduled'
                      ? 'bg-indigo-50 text-indigo-650 border border-indigo-200/50'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                  }`}>
                    {appt.status.toUpperCase()}
                  </span>
                </div>

                {/* Location and Date */}
                <div className="space-y-2 pt-2 text-sm text-slate-500 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>{appt.hospital_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>{new Date(appt.appointment_date).toLocaleString()}</span>
                  </div>
                </div>

                {/* Reason description */}
                {appt.reason && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 mt-2">
                    <span className="font-semibold block text-slate-400 mb-1">Reason:</span>
                    {appt.reason}
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end px-6 pb-6 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleDelete(appt.id)}
                  className="text-slate-400 hover:text-rose-500 flex items-center gap-1.5 text-xs font-semibold hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel Schedule
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-400">
          No appointments scheduled. Add one using the top right button.
        </Card>
      )}

      {/* Modal Dialog Form */}
      <Dialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Schedule Appointment"
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
