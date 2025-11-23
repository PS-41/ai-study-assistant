// frontend/src/components/AssignModal.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { CreateCourseModal, CreateTopicModal } from "./ResourceModals";

interface Props {
  docIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignModal({ docIds, onClose, onSuccess }: Props) {
  const [courses, setCourses] = useState<{id:number, name:string}[]>([]);
  const [topics, setTopics] = useState<{id:number, name:string}[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);

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

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(docIds.map(id => 
        api.post(`/api/files/${id}/assign`, {
          course_id: selectedCourseId || null,
          topic_id: selectedTopicId || null
        })
      ));
      onSuccess();
    } catch (e: any) {
      alert("Failed to assign some documents.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Assign {docIds.length} Document{docIds.length > 1 ? "s" : ""}
        </h3>
        
        <div className="space-y-4">
          {/* Course Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select 
              className="w-full border rounded-lg p-2 text-sm"
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
              <option value="">(No Course)</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="new" className="text-blue-600 font-medium">+ Create New Course...</option>
            </select>
          </div>

          {/* Topic Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <select 
              className="w-full border rounded-lg p-2 text-sm"
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
              <option value="">(No Topic)</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              {selectedCourseId && <option value="new" className="text-blue-600 font-medium">+ Create New Topic...</option>}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Assignment"}
          </button>
        </div>
      </div>

      {/* Nest the creation modals */}
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
    </div>
  );
}