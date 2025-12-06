// frontend/src/components/ReviewsListModal.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Props {
  onClose: () => void;
}

export default function ReviewsListModal({ onClose }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/reviews")
      .then(({ data }) => setReviews(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">What others say</h3>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400 flex flex-col items-center">
              <span className="text-3xl mb-2">💬</span>
              <p>No written reviews yet.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{r.user_name}</span>
                  <div className="flex text-yellow-400 text-xs">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < r.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  "{r.comment}"
                </p>
                <span className="text-[10px] text-gray-400">
                  {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}