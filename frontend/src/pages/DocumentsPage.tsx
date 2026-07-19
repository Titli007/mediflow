import React, { useEffect, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { FileText, Upload, Trash2, X, RefreshCw, Search, BrainCircuit } from 'lucide-react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, fetchDocuments, uploadDocument, deleteDocument, isLoading, error } = useDocumentStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('prescription');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Semantic search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const user = useAuthStore.getState().user;
      const userId = user?.id || 1;
      const response = await apiClient.post(`/api/search/search/semantic?user_id=${userId}`, {
        query: searchQuery,
        limit: 10
      });
      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    const success = await uploadDocument(selectedFile, docType);
    setIsUploading(false);

    if (success) {
      setSelectedFile(null);
      fetchDocuments();
    }
  };

  const handleSelectDoc = async (doc: any) => {
    try {
      const response = await apiClient.get(`/api/documents/${doc.id}`);
      setSelectedDoc(response.data);
    } catch (err) {
      console.error('Error fetching document details:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative p-1 font-sans">
      {/* Left Column: Upload and Document List */}
      <div className={`space-y-8 transition-all duration-300 ${selectedDoc ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
        
        {/* Upload Form Card */}
        <Card variant="glass" className="glow-violet">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-500" />
              Upload Medical Documents
            </h2>
            
            <form onSubmit={handleUpload} className="space-y-6">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-8 text-center bg-slate-50 transition-all duration-300 relative cursor-pointer">
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200/50 rounded-2xl">
                    <Upload className="h-6 w-6 text-indigo-500" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-semibold text-slate-700">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-600">Drag and drop or click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG (Max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Type selector and Upload button */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">Document Category</label>
                  <select 
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 bg-white border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="prescription">Prescription</option>
                    <option value="lab_report">Lab Report</option>
                    <option value="mri">MRI Scan</option>
                    <option value="ct_scan">CT Scan</option>
                    <option value="x_ray">X-Ray</option>
                    <option value="ultrasound">Ultrasound</option>
                    <option value="other">Other/Unspecified</option>
                  </select>
                </div>
                <Button 
                  type="submit" 
                  disabled={!selectedFile}
                  isLoading={isUploading}
                  className="w-full sm:w-auto px-8 py-3 shrink-0"
                >
                  Start Extraction
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Uploaded Documents List */}
        <Card variant="default">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Your Records</h2>
              <button 
                onClick={fetchDocuments}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>

            {error && <Alert type="error" className="mb-6">{error}</Alert>}

            {/* Semantic Search bar */}
            <form onSubmit={handleSearch} className="flex gap-3 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50">
              <div className="relative flex-1">
                <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="text"
                  placeholder="Semantically search reports (e.g. 'blood sugar', 'pain medication')..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) setSearchResults(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-855 bg-white border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <Button type="submit" isLoading={isSearching} className="px-6 shrink-0">
                Search
              </Button>
            </form>

            {searchResults !== null ? (
              searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((result) => (
                    <div 
                      key={result.id}
                      onClick={() => handleSelectDoc(result)}
                      className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                        selectedDoc?.id === result.id 
                          ? 'bg-slate-50 border-indigo-500/50 shadow-sm' 
                          : 'bg-white border-slate-200/60 hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <FileText className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-705 text-sm truncate">{result.file_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 capitalize">{result.document_type}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-650 border border-indigo-200/50">
                          {Math.round(result.similarity_score * 100)}% Match
                        </span>
                      </div>

                      {result.diagnosis && (
                        <p className="text-xs text-slate-500 mt-3 italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {result.diagnosis}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          {result.uploaded_at ? new Date(result.uploaded_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  No records found matching your semantic search query.
                </div>
              )
            ) : (
              documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                        selectedDoc?.id === doc.id 
                          ? 'bg-slate-50 border-indigo-500/50 shadow-sm' 
                          : 'bg-white border-slate-200/60 hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <FileText className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 capitalize">{doc.document_type}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                            if (selectedDoc?.id === doc.id) setSelectedDoc(null);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  No files uploaded. Use the uploader above to add prescriptions.
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {/* Right Column: Metadata details drawer slider */}
      {selectedDoc && (
        <div className="lg:col-span-5 relative z-20">
          <Card variant="glass" className="sticky top-6 border-indigo-500/20 shadow-xl h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-150 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Extracted Information</h3>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {selectedDoc.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDoc.extraction_status === 'completed' && (
                    <button
                      onClick={() => navigate('/consult', { state: { selectedDocId: selectedDoc.id, selectedDocName: selectedDoc.file_name } })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 border border-transparent text-xs font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <BrainCircuit className="h-3.5 w-3.5" />
                      Chat
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedDoc(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Basic metadata */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                  <div>
                    <span className="block text-slate-400 text-xs font-semibold">Patient</span>
                    <span className="font-bold text-slate-700">{selectedDoc.patient_name || 'Not extracted'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-xs font-semibold">Doctor</span>
                    <span className="font-bold text-slate-700">{selectedDoc.doctor_name || 'Not extracted'}</span>
                  </div>
                </div>

                {/* Diagnosis and Findings */}
                <div>
                  <span className="block text-slate-500 text-xs font-bold mb-2">Diagnosis</span>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm leading-relaxed text-slate-650">
                    {selectedDoc.diagnosis || 'No diagnoses extracted.'}
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 text-xs font-bold mb-2">Findings & Details</span>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm leading-relaxed text-slate-650">
                    {selectedDoc.medical_findings || 'No key findings extracted.'}
                  </div>
                </div>

                {/* Medication lists */}
                <div>
                  <span className="block text-slate-500 text-xs font-bold mb-2">Extracted Medications</span>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    {selectedDoc.medication_names ? (
                      <ul className="list-disc pl-5 space-y-1.5 text-slate-700 capitalize">
                        {JSON.parse(selectedDoc.medication_names).map((med: any, index: number) => {
                          if (typeof med === 'string') {
                            return <li key={index}>{med}</li>;
                          }
                          const parts = [];
                          if (med.dosage) parts.push(med.dosage);
                          if (med.frequency) parts.push(med.frequency);
                          const details = parts.join(' - ');
                          return (
                            <li key={index}>
                              <span className="font-semibold text-slate-800">{med.name}</span>
                              {details && <span className="text-slate-500 text-xs ml-1.5">({details})</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="text-slate-450">No medications identified.</span>
                    )}
                  </div>
                </div>

                {/* Collapsible raw text */}
                <div>
                  <span className="block text-slate-500 text-xs font-bold mb-2">Full Extracted Text</span>
                  <details className="group cursor-pointer">
                    <summary className="text-xs text-indigo-600 group-hover:text-indigo-500 outline-none select-none">
                      Show raw text preview
                    </summary>
                    <pre className="mt-3 bg-slate-900 text-slate-300 text-xs p-4 rounded-xl overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap font-mono border border-slate-800 cursor-text">
                      {selectedDoc.extracted_text || 'No text extracted.'}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
