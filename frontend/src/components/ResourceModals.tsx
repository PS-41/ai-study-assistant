// frontend/src/components/ResourceModals.tsx
import { useState } from "react";
import { api } from "../lib/api";

type CreateCourseModalProps = {
  onClose: () => void;
  onSuccess: (newCourse: { id: number; name: string }) => void;
};

export function CreateCourseModal({ onClose, onSuccess }: CreateCourseModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/api/courses", { name, description: desc });
      onSuccess(data);
      onClose();
    } catch (e) {
      alert("Failed to create course");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Course</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border rounded p-2 text-sm" placeholder="Course Name" value={name} onChange={e=>setName(e.target.value)} autoFocus />
          <textarea className="w-full border rounded p-2 text-sm" placeholder="Description" rows={3} value={desc} onChange={e=>setDesc(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CreateTopicModalProps = {
  courseId: number;
  onClose: () => void;
  onSuccess: (newTopic: { id: number; name: string; course_id: number }) => void;
};

export function CreateTopicModal({ courseId, onClose, onSuccess }: CreateTopicModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/api/topics", { course_id: courseId, name, description: desc });
      onSuccess(data);
      onClose();
    } catch (e) {
      alert("Failed to create topic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Topic</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border rounded p-2 text-sm" placeholder="Topic Name" value={name} onChange={e=>setName(e.target.value)} autoFocus />
          <textarea className="w-full border rounded p-2 text-sm" placeholder="Description" rows={3} value={desc} onChange={e=>setDesc(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}