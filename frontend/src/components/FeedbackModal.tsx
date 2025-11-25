import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [stats, setStats] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    api.get("/api/reviews/stats")
      .then(({ data }) => setStats(data))
      .catch(() => {}); // ignore errors for stats
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    
    setSubmitting(true);
    try {
      await api.post("/api/reviews", { rating, comment });
      setSubmitted(true);
      // Refresh stats locally just for display
      setStats(prev => prev ? { ...prev, count: prev.count + 1 } : null);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        alert("Please log in to submit feedback.");
      } else {
        alert("Failed to submit feedback.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Rate Your Experience</h2>
          {stats && (
            <p className="text-sm text-gray-500 mt-1">
              Current Rating: <span className="font-semibold text-yellow-500">{stats.average}</span> ★ ({stats.count} reviews)
            </p>
          )}
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-semibold text-gray-800">Thank you!</h3>
            <p className="text-gray-500 text-sm">Your feedback helps us improve.</p>
            <button 
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 24 24" 
                    fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={(hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300"}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Additional Comments (Optional)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                placeholder="Tell us what you like or what we can improve..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}