import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

const submitRating = createServerFn({ method: "POST" })
  .validator((data: { booking_id: string; rater_type: string; rater_id: string; subject_type: string; subject_id: string; score: number; review: string }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const id = crypto.randomUUID();
    execSync(`sqlite3 /home/team/.data/agent-team-cc229006.db "INSERT INTO ratings (id, booking_id, rater_type, rater_id, subject_type, subject_id, score, review) VALUES ('${id}', '${data.booking_id}', '${data.rater_type}', '${data.rater_id}', '${data.subject_type}', '${data.subject_id}', ${data.score}, '${data.review.replace(/'/g, "''")}')"`);
    return { success: true };
  });

export const Route = createFileRoute("/rate")({
  component: RatingPage,
});

function RatingPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [bookingId, setBookingId] = useState("");
  const [score, setScore] = useState(5);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-in";
  }, [isLoaded, isSignedIn]);

  const handleSubmit = async () => {
    if (!bookingId || !userId) return;
    setSaving(true);
    try {
      await submitRating({
        data: {
          booking_id: bookingId,
          rater_type: "business",
          rater_id: userId,
          subject_type: "worker",
          subject_id: "worker-id-placeholder",
          score,
          review,
        },
      });
      setSubmitted(true);
    } catch (e) { alert("Failed to submit rating"); }
    setSaving(false);
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Rating submitted!</h1>
          <p className="text-[#0F172A] mb-6">Thanks for helping keep Roster reliable.</p>
          <a href="/dashboard" className="inline-block bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Rate a Shift</h1>
        <p className="text-[#0F172A] mb-6">How did it go? Rate the worker after their shift.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Booking ID</label>
            <input type="text" value={bookingId} onChange={e => setBookingId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A]" placeholder="Enter booking ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setScore(star)}
                  className={`text-3xl transition ${star <= score ? "text-yellow-400" : "text-[#0F172A]"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Review (optional)</label>
            <textarea value={review} onChange={e => setReview(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A]"
              placeholder="Punctual, skilled, great attitude..." />
          </div>
          <button onClick={handleSubmit} disabled={saving || !bookingId}
            className="w-full bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50">
            {saving ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}