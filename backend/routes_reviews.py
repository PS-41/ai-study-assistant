from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from backend.db import get_db
from backend.models import Review
from backend.utils_auth import auth_required

bp = Blueprint("reviews", __name__)

@bp.post("")
@auth_required
def submit_review():
    """
    POST /api/reviews
    JSON: { "rating": 1-5, "comment": "optional text" }
    """
    data = request.get_json()
    rating = data.get("rating")
    comment = data.get("comment", "").strip()

    if not rating or not isinstance(rating, int) or not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    db = get_db()
    
    # Optional: Check if user already reviewed? 
    # For now, we allow multiple or just add a new one. 
    # Let's just add a new entry.
    
    review = Review(
        user_id=g.user_id,
        rating=rating,
        comment=comment if comment else None
    )
    db.add(review)
    db.commit()

    return jsonify({"ok": True, "id": review.id})

@bp.get("/stats")
def get_stats():
    """
    GET /api/reviews/stats
    Public endpoint to get average rating.
    """
    db = get_db()
    # Calculate average rating and count
    stats = db.query(
        func.avg(Review.rating).label("average"),
        func.count(Review.id).label("count")
    ).first()

    avg = round(stats.average, 1) if stats.average else 0
    count = stats.count if stats.count else 0

    return jsonify({
        "average": avg,
        "count": count
    })