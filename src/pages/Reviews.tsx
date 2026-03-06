import { useEffect, useState, useMemo } from "react";
import { Star, ThumbsUp, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useModernToast } from "@/components/ModernToastProvider";
import * as api from "@/lib/api";

interface ReviewItem {
  // New API fields per documented ReviewResponse DTO
  reviewId: string;
  orderId?: string;
  vendorId?: string;
  userId?: string;
  userName?: string;
  rating: number;
  foodQualityRating?: number;
  serviceQualityRating?: number;
  hygieneRating?: number;
  valueForMoneyRating?: number;
  punctualityRating?: number;
  reviewText?: string;
  images?: string[];
  vendorResponse?: {
    responseText: string;
    respondedAt: string;
  } | null;
  helpfulCount?: number;
  status?: string;
  createdAt?: string;
  // Legacy fields for backward compatibility
  id?: string;
  vendorOrganizationId?: string;
  customerName?: string;
  reviewDate?: string;
  description?: string;
  stars?: number;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const { showToast } = useModernToast();
  
  const [starFilter, setStarFilter] = useState<number | null>(null); // null = all
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const vendorId = localStorage.getItem("vendorId") || localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    const load = async () => {
      if (!vendorId) {
        showToast({ title: "Error", description: "Vendor ID not found. Please log in again.", variant: "error" });
        return;
      }
      try {
        setLoading(true);
        const data = await api.getVendorReviews(vendorId);
        // Normalize to support both old and new DTO shapes
        const normalized = (Array.isArray(data) ? data : []).map((r: any) => ({
          ...r,
          reviewId: r.reviewId || r.id || String(Math.random()),
          id: r.reviewId || r.id,
          userName: r.userName || r.customerName || "Customer",
          customerName: r.customerName || r.userName || "Customer",
          rating: r.rating ?? r.stars ?? 0,
          stars: r.stars ?? r.rating ?? 0,
          reviewText: r.reviewText || r.description || "",
          description: r.description || r.reviewText || "",
          createdAt: r.createdAt || r.reviewDate || "",
          reviewDate: r.reviewDate || r.createdAt || "",
        }));
        setReviews(normalized);
      } catch (err: any) {
        showToast({ title: "Failed to load reviews", description: err?.message || "Please try again later", variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId]);

  const stats = useMemo(() => {
    if (!reviews || !reviews.length) return { avg: "0.0", total: 0, fiveStarPct: "0%" };
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + (r.rating || r.stars || 0), 0);
    const avg = (sum / total) || 0;
    const fiveStar = reviews.filter(r => (r.rating || r.stars || 0) >= 5).length;
    const fiveStarPct = Math.round((fiveStar / total) * 100);
    return { avg: avg.toFixed(1), total, fiveStarPct: `${fiveStarPct}%` };
  }, [reviews]);

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await api.deleteVendorReview(reviewId);
      setReviews(prev => prev.filter(r => (r.reviewId || r.id) !== reviewId));
      showToast({ title: "Success", description: "Review deleted successfully." });
    } catch (err: any) {
      showToast({ 
        title: "Failed to delete review", 
        description: err?.message || "Please try again later", 
        variant: "error" 
      });
    }
  };

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      setSubmittingReply(true);
      await api.respondToReview(reviewId, replyText.trim());
      setReviews(prev => prev.map(r => 
        (r.reviewId || r.id) === reviewId 
          ? { ...r, vendorResponse: { responseText: replyText.trim(), respondedAt: new Date().toISOString() } } 
          : r
      ));
      setReplyingTo(null);
      setReplyText("");
      showToast({ title: "Reply posted", description: "Your response has been published." });
    } catch (err: any) {
      showToast({ title: "Failed to post reply", description: err?.message || "Please try again", variant: "error" });
    } finally {
      setSubmittingReply(false);
    }
  };

  

  function starBgClass(stars: number | undefined) {
    const s = stars ?? 0;
    if (s >= 5) return "bg-yellow-50";
    if (s === 4) return "bg-emerald-50";
    if (s === 3) return "bg-sky-50";
    if (s === 2) return "bg-orange-50";
    return "bg-rose-50";
  }

  const filtered = useMemo(() => {
    const qq = (query || "").trim().toLowerCase();
    return reviews.filter((r) => {
      const name = (r.userName || r.customerName || "").toLowerCase();
      const text = (r.reviewText || r.description || "").toLowerCase();
      const matchesQuery = !qq || name.includes(qq) || text.includes(qq);
      const rating = r.rating || r.stars || 0;
      const matchesStar = starFilter === null || rating === starFilter;
      return matchesQuery && matchesStar;
    });
  }, [reviews, query, starFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const p = Math.max(1, Math.min(page, totalPages));
    const start = (p - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, totalPages]);

  // reset page when filters change
  useEffect(() => setPage(1), [query, starFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reviews & Ratings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your customer feedback and ratings</p>
      </div>

      {/* Stats */}
      <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="border border-orange-100 bg-white shadow-sm rounded-lg p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="rounded-lg bg-orange-100 p-2.5 flex items-center justify-center flex-shrink-0">
            <Star className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Average Rating</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.avg}</p>
            <div className="text-xs text-gray-400">Based on {stats.total} reviews</div>
          </div>
        </div>
        <div className="border border-orange-100 bg-white shadow-sm rounded-lg p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="rounded-lg bg-orange-100 p-2.5 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Total Reviews</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.total}</p>
          </div>
        </div>
        <div className="border border-orange-100 bg-white shadow-sm rounded-lg p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="rounded-lg bg-orange-100 p-2.5 flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">5-Star Reviews</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.fiveStarPct}</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <Input
              placeholder="Search reviews or customer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 sm:h-11 flex-1"
              aria-label="Search reviews"
            />
            <Button variant="ghost" onClick={() => setQuery("")} className="sm:w-auto">Clear</Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">Filter by rating:</span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition ${starFilter === null ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}
                onClick={() => setStarFilter(null)}
              >All</button>
              {[5,4,3,2,1].map((s) => (
                <button
                  key={s}
                  onClick={() => setStarFilter(s)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm flex items-center gap-1 transition ${starFilter === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}
                >
                  <Star className="h-3 w-3 text-yellow-400" /> {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading reviews...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No reviews match your search.</div>
        ) : (
          <div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {paginated.map((review) => {
                const rId = review.reviewId || review.id || "";
                const rName = review.userName || review.customerName || "Customer";
                const rRating = review.rating || review.stars || 0;
                const rText = review.reviewText || review.description || "";
                const rDate = review.createdAt || review.reviewDate || "";
                return (
                <article key={rId} className="border border-orange-100 bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 sm:p-6">
                <header className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarFallback>{rName[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-semibold truncate">{rName}</h3>
                      <div className="text-xs text-muted-foreground">{rDate ? new Date(rDate).toLocaleDateString() : "N/A"}</div>
                      <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rRating ? "fill-current text-yellow-400" : "text-muted-foreground"}`}
                            style={{ opacity: i < rRating ? 1 : 0.35 }}
                          />
                        ))}
                        <span className="ml-1 text-xs sm:text-sm font-medium text-muted-foreground">{rRating} / 5</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{rRating}.0</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(rId)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </header>

                {/* Sub-ratings if available */}
                {(review.foodQualityRating || review.serviceQualityRating || review.hygieneRating || review.valueForMoneyRating || review.punctualityRating) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {review.foodQualityRating != null && <Badge variant="secondary" className="text-[10px]">Food: {review.foodQualityRating}/5</Badge>}
                    {review.serviceQualityRating != null && <Badge variant="secondary" className="text-[10px]">Service: {review.serviceQualityRating}/5</Badge>}
                    {review.hygieneRating != null && <Badge variant="secondary" className="text-[10px]">Hygiene: {review.hygieneRating}/5</Badge>}
                    {review.valueForMoneyRating != null && <Badge variant="secondary" className="text-[10px]">Value: {review.valueForMoneyRating}/5</Badge>}
                    {review.punctualityRating != null && <Badge variant="secondary" className="text-[10px]">Punctuality: {review.punctualityRating}/5</Badge>}
                  </div>
                )}

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-foreground break-words">{rText}</div>

                {/* Vendor Response */}
                {review.vendorResponse && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-md border-l-2 border-orange-400">
                    <p className="text-xs font-medium text-orange-600 mb-1">Your Response:</p>
                    <p className="text-xs sm:text-sm text-foreground">{review.vendorResponse.responseText}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {review.vendorResponse.respondedAt ? new Date(review.vendorResponse.respondedAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === rId && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Textarea 
                      placeholder="Write your response..." 
                      value={replyText} 
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-xs sm:text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                      <Button size="sm" onClick={() => handleReplySubmit(rId)} disabled={submittingReply || !replyText.trim()}>
                        {submittingReply ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Post Reply
                      </Button>
                    </div>
                  </div>
                )}

                <footer className="mt-3 sm:mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <button className="flex items-center gap-1.5 sm:gap-2 hover:text-foreground px-2 sm:px-3 py-1 rounded-md bg-white/30 transition">
                      <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">{review.helpfulCount ? `${review.helpfulCount} Helpful` : "Helpful"}</span>
                    </button>
                    {!review.vendorResponse && replyingTo !== rId && (
                      <button 
                        className="flex items-center gap-1.5 sm:gap-2 hover:text-foreground px-2 sm:px-3 py-1 rounded-md bg-white/30 transition"
                        onClick={() => { setReplyingTo(rId); setReplyText(""); }}
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-xs sm:text-sm">Reply</span>
                      </button>
                    )}
                  </div>
                </footer>
              </article>
              );
            })}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Showing {Math.min(filtered.length, page * pageSize)} of {filtered.length} reviews</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                  <div className="px-2 sm:px-3 py-1 rounded-md bg-gray-100 text-xs sm:text-sm text-gray-700">Page {page} of {totalPages}</div>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Reviews;
