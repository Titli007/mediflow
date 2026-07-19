import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { 
  RefreshCw,
  Sparkles,
  User,
  Pill,
  Activity,
  Heart
} from 'lucide-react';
import { apiClient } from '../api/client';

interface TimelineEvent {
  id: string;
  type: 'consultation' | 'medication' | 'test' | 'treatment';
  date: string;
  title: string;
  subtitle: string;
  status?: string;
  description?: string;
}

const parseBoldText = (text: string) => {
  const parts = text.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-slate-900">{part}</strong>;
    }
    
    const italicParts = part.split('*');
    if (italicParts.length > 1) {
      return (
        <React.Fragment key={i}>
          {italicParts.map((subPart, j) => {
            if (j % 2 === 1) {
              return <em key={j} className="italic text-slate-650">{subPart}</em>;
            }
            return subPart;
          })}
        </React.Fragment>
      );
    }
    
    return part;
  });
};

const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const cleanLine = line.trim();
        
        if (cleanLine === '***' || cleanLine === '---' || cleanLine === '___') {
          return <hr key={index} className="my-3 border-slate-200" />;
        }
        
        const bulletMatch = line.match(/^(\s*)([*\-+])\s+(.*)$/);
        if (bulletMatch) {
          const content = bulletMatch[3];
          return (
            <li key={index} className="ml-4 list-disc pl-0.5 my-0.5 text-slate-700">
              {parseBoldText(content)}
            </li>
          );
        }
        
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const content = headerMatch[2];
          const children = parseBoldText(content);
          
          if (level === 1) return <h1 key={index} className="text-lg font-bold mt-3 mb-1 text-slate-800">{children}</h1>;
          if (level === 2) return <h2 key={index} className="text-base font-bold mt-2 mb-1 text-slate-800">{children}</h2>;
          if (level === 3) return <h3 key={index} className="text-sm font-bold mt-2 mb-0.5 text-indigo-750">{children}</h3>;
          return <h4 key={index} className="text-xs font-bold mt-1.5 mb-0.5 text-slate-700">{children}</h4>;
        }
        
        if (cleanLine === '') {
          return <div key={index} className="h-1.5" />;
        }
        
        return (
          <p key={index} className="leading-relaxed my-0.5">
            {parseBoldText(line)}
          </p>
        );
      })}
    </div>
  );
};

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'consultation' | 'medication' | 'test' | 'treatment'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setIsLoading(true);
    setIsLoadingSummary(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/timeline/');
      setEvents(response.data);

      const summaryResponse = await apiClient.get('/api/ai/summary');
      setSummary(summaryResponse.data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline feed.');
    } finally {
      setIsLoading(false);
      setIsLoadingSummary(false);
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
            onClick={() => setFilterType('consultation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'consultation' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Consultations
          </button>
          <button 
            onClick={() => setFilterType('medication')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'medication' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Medications
          </button>
          <button 
            onClick={() => setFilterType('test')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'test' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Tests
          </button>
          <button 
            onClick={() => setFilterType('treatment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'treatment' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Treatments & Diagnoses
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* AI Clinical Summary & Advice Section */}
      {isLoadingSummary ? (
        <Card variant="glass" className="p-6 border-indigo-500/10 bg-slate-50/30 flex items-center justify-center py-10 shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 text-sm animate-pulse">
            <Sparkles className="h-5 w-5 text-indigo-500 animate-spin" />
            <span>Analyzing clinical history, generating summary & advice...</span>
          </div>
        </Card>
      ) : summary ? (
        <Card variant="glass" className="p-7 border-indigo-500/10 bg-gradient-to-br from-indigo-500/5 to-transparent shadow-md glow-violet relative overflow-hidden">
          <div className="flex items-center gap-2 text-indigo-650 font-bold text-base mb-4">
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
            AI Clinical Summary & Health Advice
          </div>
          <div className="text-slate-600 text-sm leading-relaxed">
            <MarkdownText text={summary} />
          </div>
        </Card>
      ) : null}

      {/* Stepper Timeline Feed */}
      {filteredEvents.length > 0 ? (
        <div className="relative border-l border-slate-200 ml-6 pl-8 space-y-8 py-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="relative">
              {/* Stepper Node Icon */}
              <div className="absolute -left-[50px] top-1.5 flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-sm z-10">
                {event.type === 'consultation' && <User className="h-4.5 w-4.5" />}
                {event.type === 'medication' && <Pill className="h-4.5 w-4.5" />}
                {event.type === 'test' && <Activity className="h-4.5 w-4.5" />}
                {event.type === 'treatment' && <Heart className="h-4.5 w-4.5" />}
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
