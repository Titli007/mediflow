import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Pill, Trash2, Edit2, Plus, Clock, RefreshCw } from 'lucide-react';

interface Reminder {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  doses_taken_today: number;
  last_taken_date?: string;
  notes?: string;
}

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const getDoseCount = (frequency: string): number => {
    const freq = frequency.toLowerCase();
    if (freq.includes('three') || freq.includes('3 times') || freq.includes('tds')) return 3;
    if (freq.includes('twice') || freq.includes('2 times') || freq.includes('bd') || freq.includes('bid')) return 2;
    if (freq.includes('four') || freq.includes('4 times')) return 4;
    return 1; // Default to 1 dose
  };

  const handleToggleDose = async (reminder: Reminder, index: number, isTaken: boolean) => {
    // 1. Optimistic local update
    const doseCount = getDoseCount(reminder.frequency);
    const updatedDoses = isTaken 
      ? Math.max(0, reminder.doses_taken_today - 1) 
      : Math.min(doseCount, reminder.doses_taken_today + 1);
      
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, doses_taken_today: updatedDoses } : r));

    // 2. Background API call
    try {
      if (isTaken) {
        await apiClient.post(`/api/reminders/${reminder.id}/reset-dose`);
      } else {
        await apiClient.post(`/api/reminders/${reminder.id}/log-dose`);
      }
      fetchReminders(true); // silent fetch
    } catch (err: any) {
      fetchReminders(true); // rollback to actual DB state
      setError(err.message || 'Failed to toggle dose');
    }
  };

  const fetchReminders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/api/reminders/');
      const mapped = response.data.map((r: any) => {
        const hasDash = r.title && r.title.includes(' - ');
        return {
          id: r.id,
          medication_name: hasDash ? r.title.split(' - ')[0] : r.title || '',
          dosage: hasDash ? r.title.split(' - ')[1] : '',
          frequency: r.frequency || 'daily',
          start_date: r.start_date || r.created_at || new Date().toISOString(),
          end_date: r.end_date || undefined,
          is_active: r.is_active,
          doses_taken_today: r.doses_taken_today || 0,
          last_taken_date: r.last_taken_date || undefined,
          notes: r.notes || '',
        };
      });
      setReminders(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reminders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        reminder_type: 'medicine',
        title: formData.dosage ? `${formData.medication_name} - ${formData.dosage}` : formData.medication_name,
        reminder_time: '09:00', // daily time
        frequency: formData.frequency,
        is_active: true,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : new Date().toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        notes: formData.notes || '',
      };

      if (editingId) {
        await apiClient.put(`/api/reminders/${editingId}`, payload);
        fetchReminders();
      } else {
        await apiClient.post('/api/reminders/', payload);
        fetchReminders();
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder');
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setFormData({
      medication_name: reminder.medication_name,
      dosage: reminder.dosage,
      frequency: reminder.frequency,
      start_date: reminder.start_date ? reminder.start_date.split('T')[0] : '',
      end_date: reminder.end_date ? reminder.end_date.split('T')[0] : '',
      notes: reminder.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await apiClient.delete(`/api/reminders/${id}`);
      fetchReminders(); // reload from API
    } catch (err: any) {
      setError(err.message || 'Failed to delete reminder');
    }
  };

  const resetForm = () => {
    setFormData({
      medication_name: '',
      dosage: '',
      frequency: '',
      start_date: '',
      end_date: '',
      notes: '',
    });
    setEditingId(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8 p-1 font-sans">
      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Medication Reminders
          </h1>
          <p className="text-slate-400 mt-1">Set up daily alerts and compliance logging for your active prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchReminders(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <Button 
            onClick={openNewDialog}
            className="flex items-center gap-2"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Reminder
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 bg-slate-200 animate-pulse border border-slate-300/40 rounded-2xl"></div>
          <div className="h-40 bg-slate-200 animate-pulse border border-slate-300/40 rounded-2xl"></div>
        </div>
      ) : reminders.length === 0 ? (
        <Card className="text-center py-16 text-slate-400">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          No medication reminders configured. Add one to track your dosage alerts.
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Active Medications section */}
          {reminders.filter(r => r.is_active).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Active Medications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reminders.filter(r => r.is_active).map((reminder) => {
                  const doseCount = getDoseCount(reminder.frequency);
                  const isFullyTaken = reminder.doses_taken_today >= doseCount;
                  const isLate = new Date().getHours() >= 18;
                  const isMissed = !isFullyTaken && isLate;
                  
                  return (
                    <Card 
                      key={reminder.id} 
                      variant="glass" 
                      className={`flex flex-col justify-between border-slate-200/60 hover:scale-[1.01] transition-all duration-300 ${
                        isFullyTaken
                          ? 'border-emerald-500/10 shadow-emerald-500/[0.01]'
                          : isMissed
                          ? 'border-rose-500/20 shadow-rose-500/[0.02]'
                          : 'hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border text-white transition-all duration-300 ${
                              isFullyTaken 
                                ? 'bg-emerald-500 border-emerald-500/30' 
                                : isMissed 
                                ? 'bg-rose-500 border-rose-500/30 shadow-lg shadow-rose-500/10' 
                                : 'bg-indigo-600 border-indigo-200/50'
                            }`}>
                              <Pill className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-base leading-tight">{reminder.medication_name}</h3>
                              <p className="text-xs text-slate-400 mt-0.5 font-medium">{reminder.dosage}</p>
                              <div className="mt-1.5">
                                {isFullyTaken ? (
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    All Taken Today
                                  </span>
                                ) : isMissed ? (
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse">
                                    Dose Missed / Pending
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-550 text-indigo-600 border border-indigo-500/20">
                                    Pending Doses
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Compliance circle logging on top! */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100/80">
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: doseCount }).map((_, idx) => {
                                const isTaken = idx < reminder.doses_taken_today;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleToggleDose(reminder, idx, isTaken)}
                                    className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all cursor-pointer ${
                                      isTaken
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20 animate-pop'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500/30'
                                    }`}
                                    title={isTaken ? 'Mark as untaken' : 'Mark as taken'}
                                  >
                                    {idx + 1}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {reminder.doses_taken_today} / {doseCount} taken
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100 text-sm text-slate-500">
                          <div className="flex justify-between">
                            <span>Frequency:</span>
                            <span className="font-medium text-slate-800">{reminder.frequency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Start Date:</span>
                            <span className="font-medium text-slate-800">
                              {new Date(reminder.start_date).toLocaleDateString()}
                            </span>
                          </div>
                          {reminder.end_date && (
                            <div className="flex justify-between">
                              <span>End Date:</span>
                              <span className="font-medium text-slate-800">
                                {new Date(reminder.end_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {reminder.notes && (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 mt-4 leading-relaxed">
                            <span className="font-semibold block text-slate-400 mb-1">Notes:</span>
                            {reminder.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-slate-100">
                        <Button 
                          className="py-1.5 px-3 flex items-center gap-1 text-xs" 
                          variant="secondary"
                          onClick={() => handleEdit(reminder)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <button 
                          onClick={() => handleDelete(reminder.id)}
                          className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past / Discontinued Medications section */}
          {reminders.filter(r => !r.is_active).length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-150/40">
              <h2 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                Past / Discontinued Medications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
                {reminders.filter(r => !r.is_active).map((reminder) => (
                  <Card 
                    key={reminder.id} 
                    variant="glass" 
                    className="flex flex-col justify-between border-slate-200 bg-slate-50/20"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-400">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-500 line-through">{reminder.medication_name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{reminder.dosage}</p>
                          </div>
                        </div>
                        
                        <div>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                            Not Continued
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100 text-sm text-slate-400">
                        <div className="flex justify-between">
                          <span>Frequency:</span>
                          <span className="font-medium text-slate-600">{reminder.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Start Date:</span>
                          <span className="font-medium text-slate-600">
                            {new Date(reminder.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        {reminder.end_date && (
                          <div className="flex justify-between">
                            <span>End Date:</span>
                            <span className="font-medium text-slate-600">
                              {new Date(reminder.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {reminder.notes && (
                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/50 text-xs text-slate-400 mt-4 leading-relaxed">
                          <span className="font-semibold block text-slate-400 mb-1">Notes:</span>
                          {reminder.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-slate-100">
                      <Button 
                        className="py-1.5 px-3 flex items-center gap-1 text-xs" 
                        variant="secondary"
                        onClick={() => handleEdit(reminder)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <button 
                        onClick={() => handleDelete(reminder.id)}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog modal */}
      <Dialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          resetForm();
        }} 
        title={editingId ? 'Edit Reminder' : 'Add Medication Reminder'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Medication Name" 
            placeholder="e.g. Aspirin"
            required
            value={formData.medication_name}
            onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
          />

          <Input 
            label="Dosage" 
            placeholder="e.g. 500mg"
            required
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
          />

          <Input 
            label="Frequency" 
            placeholder="e.g. Twice daily"
            required
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          />

          <Input 
            label="Start Date" 
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />

          <Input 
            label="End Date (Optional)" 
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Notes (Optional)</label>
            <textarea 
              placeholder="E.g., Take with food, avoid dairy..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
            >
              {editingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
