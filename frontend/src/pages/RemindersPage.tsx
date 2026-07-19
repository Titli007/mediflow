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

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/api/reminders/');
      const mapped = response.data.map((r: any) => {
        const hasDash = r.title && r.title.includes(' - ');
        return {
          id: r.id,
          medication_name: hasDash ? r.title.split(' - ')[0] : r.title || '',
          dosage: hasDash ? r.title.split(' - ')[1] : '',
          frequency: r.frequency || 'daily',
          start_date: r.reminder_time || r.created_at || new Date().toISOString(),
          end_date: undefined,
          notes: '',
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
        reminder_time: new Date(formData.start_date).toISOString(),
        frequency: formData.frequency,
        is_active: true,
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
      start_date: reminder.start_date.split('T')[0],
      end_date: '',
      notes: '',
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
            onClick={fetchReminders}
            className="text-slate-400 hover:text-slate-650 transition-colors p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reminders.map((reminder) => (
            <Card 
              key={reminder.id} 
              variant="glass" 
              className="flex flex-col justify-between border-slate-200/60 hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-650">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{reminder.medication_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{reminder.dosage}</p>
                    </div>
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
          ))}
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
