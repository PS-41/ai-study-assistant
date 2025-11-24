// frontend/src/pages/UploadPage.tsx
import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import ProgressOverlay from "../components/ProgressOverlay";
import GenerateModal from "../components/GenerateModal";
import { CreateCourseModal, CreateTopicModal } from "../components/ResourceModals";

// Icons
const Icons = {
  CloudUpload: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21.2 15c.7 0 1.3-1.1 1.3-2.5 0-1.4-.6-2.5-1.3-2.5h-.3c-.4-3.6-3.2-6.5-6.9-6.5-3.2 0-5.9 2.2-6.7 5.2h-.2C3.6 8.7 1 11.3 1 14.5 1 17.5 3.4 20 6.3 20h14.2c.4 0 .7 0 .7 0"></path><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line></svg>,
  File: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
  Quiz: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Flashcard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Summary: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
};

type Course = { id: number; name: string };
type Topic = { id: number; name: string; course_id: number };

export default function UploadPage() {
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Assignment State
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | "">("");

  // Modals
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [activeGenType, setActiveGenType] = useState<"quiz"|"flashcards"|"summary"|null>(null);

  // Progress
  const [uploading, setUploading] = useState(false);
  const [uploadResp, setUploadResp] = useState<any>(null);

  useEffect(() => {
    api.get("/api/courses/mine").then(({ data }) => setCourses(data.items || []));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setTopics([]);
      return;
    }
    api.get(`/api/topics/by_course/${selectedCourseId}`).then(({ data }) => setTopics(data.items || []));
  }, [selectedCourseId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (selectedCourseId) fd.append("course_id", String(selectedCourseId));
      if (selectedTopicId) fd.append("topic_id", String(selectedTopicId));

      const { data } = await api.post("/api/files/upload", fd);
      setUploadResp(data);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 pb-24">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Material</h1>
      <p className="text-gray-500 mb-8">Upload lecture notes, slides, or textbooks to start generating study aids.</p>

      {!uploadResp ? (
        <div className="space-y-8">
          <div className="space-y-6 bg-white p-8 rounded-2xl border shadow-sm">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer
                ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileSelect} 
                accept=".pdf,.ppt,.pptx,application/pdf"
              />
              
              {!file ? (
                <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full">
                  <div className="mb-4 p-4 bg-blue-50 rounded-full">
                    <Icons.CloudUpload />
                  </div>
                  <span className="text-lg font-medium text-gray-700">Click to upload or drag and drop</span>
                  <span className="text-sm text-gray-400 mt-2">PDF, PPTX (Max 50MB)</span>
                </label>
              ) : (
                <div className="flex flex-col items-center w-full animate-in fade-in">
                  <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-full">
                    <Icons.File />
                  </div>
                  <span className="text-lg font-medium text-gray-800">{file.name}</span>
                  <span className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button 
                    onClick={(e) => { e.preventDefault(); setFile(null); }}
                    className="mt-4 text-sm text-red-500 hover:text-red-700 font-medium underline"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>

            {/* Assignment Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Course (Optional)</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  value={selectedCourseId}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "new") {
                      setShowCreateCourse(true);
                    } else {
                      setSelectedCourseId(Number(val) || ""); 
                      setSelectedTopicId("");
                    }
                  }}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="new" className="text-blue-600 font-medium">+ Create New Course...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Topic (Optional)</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  value={selectedTopicId}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "new") {
                      setShowCreateTopic(true);
                    } else {
                      setSelectedTopicId(Number(val) || "");
                    }
                  }}
                  disabled={!selectedCourseId}
                >
                  <option value="">-- Select Topic --</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {selectedCourseId && <option value="new" className="text-blue-600 font-medium">+ Create New Topic...</option>}
                </select>
              </div>
            </div>

            {/* Upload Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </div>
          </div>

          {/* Instructions / Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <Icons.Quiz />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Generate Quizzes</h3>
              <p className="text-sm text-gray-500">Create multiple-choice quizzes to test your knowledge. You can choose the number of questions.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="bg-emerald-50 w-10 h-10 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
                <Icons.Flashcard />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Flashcards</h3>
              <p className="text-sm text-gray-500">Automatically generate flashcards for active recall. Perfect for memorizing definitions.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                <Icons.Summary />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Summaries</h3>
              <p className="text-sm text-gray-500">Get a concise or detailed summary of your document to review key concepts quickly.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Success View */
        <div className="bg-white rounded-2xl border border-green-100 p-10 text-center shadow-sm animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Complete!</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Your file <strong>{uploadResp.original_name}</strong> has been processed.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <button 
              onClick={() => setActiveGenType("quiz")}
              className="flex flex-col items-center p-4 rounded-xl border-2 border-blue-50 hover:border-blue-200 hover:bg-blue-50 transition group"
            >
              <div className="mb-2 text-blue-500 group-hover:scale-110 transition-transform"><Icons.Quiz /></div>
              <span className="font-semibold text-blue-700">Create Quiz</span>
            </button>
            
            <button 
              onClick={() => setActiveGenType("flashcards")}
              className="flex flex-col items-center p-4 rounded-xl border-2 border-emerald-50 hover:border-emerald-200 hover:bg-emerald-50 transition group"
            >
              <div className="mb-2 text-emerald-500 group-hover:scale-110 transition-transform"><Icons.Flashcard /></div>
              <span className="font-semibold text-emerald-700">Create Flashcards</span>
            </button>

            <button 
              onClick={() => setActiveGenType("summary")}
              className="flex flex-col items-center p-4 rounded-xl border-2 border-purple-50 hover:border-purple-200 hover:bg-purple-50 transition group"
            >
              <div className="mb-2 text-purple-500 group-hover:scale-110 transition-transform"><Icons.Summary /></div>
              <span className="font-semibold text-purple-700">Create Summary</span>
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t">
            <button 
              onClick={() => nav("/docs")}
              className="text-gray-500 hover:text-gray-800 font-medium text-sm"
            >
              Skip to My Documents &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateCourse && (
        <CreateCourseModal 
          onClose={() => setShowCreateCourse(false)} 
          onSuccess={(newC) => {
            setCourses(prev => [...prev, newC]);
            setSelectedCourseId(newC.id);
            setSelectedTopicId("");
          }} 
        />
      )}
      {showCreateTopic && selectedCourseId && (
        <CreateTopicModal 
          courseId={Number(selectedCourseId)}
          onClose={() => setShowCreateTopic(false)}
          onSuccess={(newT) => {
            setTopics(prev => [...prev, newT]);
            setSelectedTopicId(newT.id);
          }} 
        />
      )}

      {activeGenType && uploadResp && (
        <GenerateModal 
          type={activeGenType} 
          docIds={[uploadResp.document_id]} 
          onClose={() => setActiveGenType(null)} 
          onSuccess={() => { 
            // After generation, maybe go to library? Or stay here?
            // Let's clear the generation state but keep the success view
             setActiveGenType(null);
          }} 
        />
      )}
    </div>
  );
}