import { create } from 'zustand';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface Document {
  id: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  document_type?: string;
  document_date?: string;
  extraction_status: string;
  confidence_score?: number;
  uploaded_at: string;
  extracted_at?: string;
  diagnosis?: string;
  medical_findings?: string;
  medication_names?: string;
  dosage_instructions?: string;
  patient_name?: string;
  doctor_name?: string;
}

interface DocumentState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File, docType: string) => Promise<boolean>;
  deleteDocument: (id: number) => Promise<boolean>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const userId = user?.id || 1;
      const response = await apiClient.get(`/api/documents/user/${userId}/all`);
      set({ documents: response.data.documents || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load documents', isLoading: false });
    }
  },

  uploadDocument: async (file, docType) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const userId = user?.id || 1;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      
      const response = await apiClient.post(`/api/documents/upload?user_id=${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newDoc = response.data;
      set((state) => ({
        documents: [newDoc, ...state.documents],
        isLoading: false,
      }));

      get().fetchDocuments();
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload document';
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  deleteDocument: async (id) => {
    try {
      await apiClient.delete(`/api/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
      return true;
    } catch (err: any) {
      set({ error: 'Failed to delete document' });
      return false;
    }
  },
}));
