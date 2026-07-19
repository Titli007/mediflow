import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { 
  FileText, 
  Calendar, 
  Clock, 
  RefreshCw 
} from 'lucide-react';
import { apiClient } from '../api/client';

interface TimelineEvent {
  id: string;
  type: 'document' | 'appointment' | 'reminder';
  date: string;
  title: string;
  subtitle: string;
  status?: string;
  description?: string;
}

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'document' | 'appointment' | 'reminder'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/timeline/');
      setEvents(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline feed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const filteredEvents = events.filter(e => filterType === 'all' || e.type === filterType);

  return (
    <div className="space-y-8 p-1 font-sans">
      {/* Header and Filter control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Patient Timeline
          </h1>
          <p className="text-slate-400 mt-1">A unified chronological feed of your entire health history.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 self-start md:self-auto">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            All History
          </button>
          <button 
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'document' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Reports
          </button>
          <button 
            onClick={() => setFilterType('appointment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'appointment' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Visits
          </button>
          <button 
            onClick={() => setFilterType('reminder')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'reminder' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Schedules
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Stepper Timeline Feed */}
      {filteredEvents.length > 0 ? (
        <div className="relative border-l border-slate-200 ml-6 pl-8 space-y-8 py-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="relative">
              {/* Stepper Node Icon */}
              <div className="absolute -left-[50px] top-1.5 flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-sm z-10">
                {event.type === 'document' && <FileText className="h-4.5 w-4.5" />}
                {event.type === 'appointment' && <Calendar className="h-4.5 w-4.5" />}
                {event.type === 'reminder' && <Clock className="h-4.5 w-4.5" />}
              </div>

              {/* Event card details */}
              <Card variant="glass" className="hover:border-indigo-500/20 hover:scale-[1.005] transition-all duration-300">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{event.type}</span>
                      <h3 className="font-bold text-slate-800 mt-0.5">{event.title}</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(event.date).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{event.subtitle}</p>

                  {event.description && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 mt-4 leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16 text-slate-400">
          No records matched the selected timeline filter.
        </Card>
      )}
    </div>
  );
};
