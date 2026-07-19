import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  FileText, 
  Stethoscope, 
  BookOpen, 
  Search 
} from 'lucide-react';
import { apiClient } from '../api/client';

interface Message {
  sender: 'user' | 'ai';
  text: string;
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
              return <em key={j} className="italic text-slate-600">{subPart}</em>;
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

export const AIConsultPage: React.FC = () => {
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Hello! I am your MediFlow AI Clinical Assistant. Ask me anything about your uploaded medical records, prescriptions, or clinical findings.' }
  ]);
  const [query, setQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Summary and Specialist States
  const [summary, setSummary] = useState('');
  const [specialists, setSpecialists] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'specialists' | 'explainer'>('summary');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Term Explainer States
  const [explainTerm, setExplainTerm] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    fetchProfileSummary();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProfileSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const sumRes = await apiClient.get('/api/ai/summary');
      setSummary(sumRes.data.summary);

      const specRes = await apiClient.get('/api/ai/recommend-specialist');
      setSpecialists(specRes.data.recommendations);
    } catch (error) {
      console.error('Error fetching AI profiles:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setQuery('');
    setIsChatLoading(true);

    try {
      const response = await apiClient.post('/api/ai/chat', { query: userText });
      setMessages((prev) => [...prev, { sender: 'ai', text: response.data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, I encountered an error answering your query. Please verify your connection.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExplainTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explainTerm.trim()) return;

    setIsExplaining(true);
    setExplanation(null);
    try {
      const response = await apiClient.post('/api/ai/explain', { term: explainTerm });
      setExplanation(response.data.explanation);
    } catch (err) {
      setExplanation('Could not look up the definition for this term.');
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-7rem)] p-1 font-sans">
      
      {/* Left Column: AI RAG Chat Bubble Interface */}
      <div className="lg:col-span-6 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
        {/* Panel Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200/50 rounded-xl">
            <Bot className="h-5 w-5 text-indigo-650" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Clinical Chatbot</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gemini 1.5 Flash RAG Engine</p>
          </div>
        </div>

        {/* Chat History Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m, index) => (
            <div 
              key={index}
              className={`flex items-start gap-3.5 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                m.sender === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-50 text-indigo-650 border border-slate-200/50'
              }`}>
                {m.sender === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
              </div>
              
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm whitespace-pre-wrap'
                  : 'bg-slate-50 text-slate-700 border border-slate-200/50 rounded-tl-none'
              }`}>
                {m.sender === 'user' ? m.text : <MarkdownText text={m.text} />}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Bot className="h-5 w-5 text-indigo-500 animate-bounce" />
              <span>Analyzing reports...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          <Input 
            placeholder="Ask: 'Explain my cholesterol report' or 'What dosage of medicine was I given?'"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-white"
          />
          <Button type="submit" disabled={isChatLoading} className="py-2.5 px-5">
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
      </div>

      {/* Right Column: AI Health Profile and Referrals */}
      <div className="lg:col-span-6 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50 shrink-0">
          <button 
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'summary' 
                ? 'border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Health Summary
          </button>
          <button 
            onClick={() => setActiveTab('specialists')}
            className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'specialists' 
                ? 'border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Specialists
          </button>
          <button 
            onClick={() => setActiveTab('explainer')}
            className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'explainer' 
                ? 'border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Medical Dictionary
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700 text-sm leading-relaxed">
          {isLoadingSummary ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <Sparkles className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="text-slate-400">Generating health intelligence profiles...</span>
            </div>
          ) : (
            <>
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-650 font-bold text-base mb-4">
                    <FileText className="h-5 w-5" />
                    AI-Aggregated Patient Summary
                  </div>
                  <div className="text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium leading-relaxed shadow-sm">
                    <MarkdownText text={summary} />
                  </div>
                </div>
              )}

              {activeTab === 'specialists' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-650 font-bold text-base mb-4">
                    <Stethoscope className="h-5 w-5" />
                    Recommended Medical Consultations
                  </div>
                  <div className="text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium leading-relaxed shadow-sm">
                    <MarkdownText text={specialists} />
                  </div>
                </div>
              )}

              {activeTab === 'explainer' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-indigo-650 font-bold text-base">
                    <BookOpen className="h-5 w-5" />
                    Clinical Term Explainer
                  </div>
                  
                  <form onSubmit={handleExplainTerm} className="flex gap-3">
                    <Input 
                      placeholder="Enter term: e.g. HbA1c, LDL, Creatinine..."
                      required
                      value={explainTerm}
                      onChange={(e) => setExplainTerm(e.target.value)}
                    />
                    <Button type="submit" isLoading={isExplaining} className="px-5">
                      <Search className="h-4.5 w-4.5" />
                    </Button>
                  </form>

                  {explanation && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                      <div className="font-bold text-slate-800 capitalize text-base">{explainTerm}</div>
                      <div className="text-slate-600 text-sm leading-relaxed">
                        <MarkdownText text={explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
