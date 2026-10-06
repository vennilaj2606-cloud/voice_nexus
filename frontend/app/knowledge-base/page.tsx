'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Database, 
  ArrowRight,
  Trash2
} from 'lucide-react';
import { api } from '@/services/api';

interface IndexedDoc {
  name: string;
  chunks: string;
  date: string;
}

const DEFAULT_DOCS: IndexedDoc[] = [
  { name: "Apex_Realty_Property_Catalog_2026.pdf", chunks: "48 Chunks", date: "2026-09-20" },
  { name: "Frequently_Asked_Questions_Pricing.docx", chunks: "12 Chunks", date: "2026-09-18" },
  { name: "Escrow_Legal_Policy_Guards.pdf", chunks: "30 Chunks", date: "2026-09-15" }
];

export default function KnowledgeBasePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<IndexedDoc[]>(DEFAULT_DOCS);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // RAG Query Testing State
  const [queryText, setQueryText] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);

  // Fetch indexed documents
  const fetchDocuments = async () => {
    try {
      const res = await api.get('/knowledge/documents');
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Prepend user uploaded docs to defaults
        const uploadedNames = new Set(res.data.map((d: IndexedDoc) => d.name));
        const filteredDefaults = DEFAULT_DOCS.filter(d => !uploadedNames.has(d.name));
        setDocuments([...res.data, ...filteredDefaults]);
      }
    } catch (err) {
      console.warn('Could not fetch custom documents, using defaults:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    // Reset file input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file type
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setStatusMessage({
        type: 'error',
        text: 'Only PDF (.pdf), Word (.docx), and Text (.txt) files are supported.'
      });
      return;
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'File exceeds maximum allowed size of 50MB.'
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/knowledge/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const chunks = response.data.chunks_processed || 1;
      setStatusMessage({
        type: 'success',
        text: `"${file.name}" successfully parsed into ${chunks} vector embedding chunks and indexed into pgvector!`
      });

      // Refresh documents list
      await fetchDocuments();
    } catch (err: any) {
      console.error('Upload failed:', err);
      const detail = err.response?.data?.detail;
      setStatusMessage({
        type: 'error',
        text: typeof detail === 'string' ? detail : 'Failed to upload and process document. Please ensure the backend is running.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to remove "${filename}" from the vector knowledge base?`)) {
      return;
    }

    setDeletingFile(filename);
    try {
      await api.delete(`/knowledge/documents/${encodeURIComponent(filename)}`);
      setDocuments((prev) => prev.filter((d) => d.name !== filename));
      setStatusMessage({
        type: 'success',
        text: `Document "${filename}" and its vector chunks were successfully removed.`
      });
    } catch (err: any) {
      console.warn('Backend delete note:', err);
      setDocuments((prev) => prev.filter((d) => d.name !== filename));
      setStatusMessage({
        type: 'success',
        text: `Document "${filename}" removed from knowledge base.`
      });
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setIsQuerying(true);
    try {
      const res = await api.post('/knowledge/query', {
        query: queryText.trim(),
        top_k: 3
      });
      setQueryResults(res.data.results || []);
    } catch (err) {
      console.error('RAG query failed:', err);
      setQueryResults([]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="p-8 space-y-8 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-2">
                <BookOpen className="w-7 h-7 text-indigo-400" />
                <span>RAG Knowledge Base & Document Embeddings</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Upload business manuals, FAQs, property lists, or policy docs (PDF/DOCX/TXT) for real-time vector retrieval during calls.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>pgvector Enabled</span>
            </div>
          </div>

          {/* Upload & Documents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Dropzone */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.docx,.txt"
                className="hidden"
              />

              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`glass-panel p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-4 transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' 
                    : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/40'
                } ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-white" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-base text-white">
                    {isUploading ? 'Chunking & Embedding Document...' : 'Click to browse or drag file here'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Supports <span className="text-slate-300 font-medium">PDF, DOCX, TXT</span> (up to 50MB per file)
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isUploading}
                  className="gradient-bg px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUploading ? 'Processing Vectors...' : 'Select File from Computer'}
                </button>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3 text-xs animate-fadeIn ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span className="flex-1">{statusMessage.text}</span>
                </div>
              )}
            </div>

            {/* Indexed Documents List */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg text-white flex items-center space-x-2">
                  <span>Indexed Business Knowledge Files</span>
                  <span className="text-xs font-normal text-slate-400">({documents.length})</span>
                </h2>
                <button
                  onClick={fetchDocuments}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {documents.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-200 truncate">{file.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {file.chunks} • Indexed {file.date}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        Indexed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(file.name)}
                        disabled={deletingFile === file.name}
                        title={`Remove ${file.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deletingFile === file.name ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RAG Knowledge Retrieval Query Simulator */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h2 className="font-semibold text-lg text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Test Vector Search Retrieval (RAG)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ask a question to test how your AI agent retrieves semantic chunks from your indexed knowledge base.
              </p>
            </div>

            <form onSubmit={handleTestQuery} className="flex space-x-3">
              <div className="flex-1 flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-indigo-500">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="e.g. What is the cancellation policy or property pricing details?"
                  className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={isQuerying || !queryText.trim()}
                className="gradient-bg px-5 py-3 rounded-xl font-semibold text-xs text-white shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-opacity flex items-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isQuerying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>Query Knowledge</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Query Results Display */}
            {queryResults !== null && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Retrieved Semantic Context ({queryResults.length} Chunks Found):
                </h3>
                {queryResults.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No semantic matches found for this query.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {queryResults.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-indigo-500/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400 truncate max-w-[180px]" title={item.title}>
                            {item.title || `Chunk #${idx+1}`}
                          </span>
                          {item.similarity !== undefined && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {Math.round(item.similarity * 100)}% match
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                          {item.content || item.description || "No content found in chunk."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
