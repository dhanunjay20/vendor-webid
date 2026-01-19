import { useEffect, useState, useMemo } from "react";
import { Star, ThumbsUp, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface ReviewItem {
  id: string;
  vendorOrganizationId: string;
  userId?: string;
  customerName: string;
  reviewDate: string;
  description: string;
  stars: number;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  const [starFilter, setStarFilter] = useState<number | null>(null); // null = all
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    const load = async () => {
      if (!vendorOrgId) {
        toast({ title: "Error", description: "Vendor organization ID not found. Please log in again.", variant: "destructive" });
        return;
      }
      try {
        setLoading(true);
        const data = await api.getVendorReviews(vendorOrgId);
        setReviews(Array.isArray(data) ? data : []);
      } catch (err: any) {
        toast({ title: "Failed to load reviews", description: err?.message || "Please try again later", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorOrgId]);

  const stats = useMemo(() => {
    if (!reviews || !reviews.length) return { avg: "0.0", total: 0, fiveStarPct: "0%" };
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + (r.stars || 0), 0);
    const avg = (sum / total) || 0;
    const fiveStar = reviews.filter(r => r.stars >= 5).length;
    const fiveStarPct = Math.round((fiveStar / total) * 100);
    return { avg: avg.toFixed(1), total, fiveStarPct: `${fiveStarPct}%` };
  }, [reviews]);

  const handleReply = (reviewId: string) => {
    toast({ title: "Reply Posted", description: "Your response has been published." });
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await api.deleteVendorReview(vendorOrgId, reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast({ title: "Success", description: "Review deleted successfully." });
    } catch (err: any) {
      toast({ 
        title: "Failed to delete review", 
        description: err?.message || "Please try again later", 
        variant: "destructive" 
      });
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
      const matchesQuery = !qq || (r.customerName || "").toLowerCase().includes(qq) || (r.description || "").toLowerCase().includes(qq);
      const matchesStar = starFilter === null || (r.stars || 0) === starFilter;
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
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reviews & Ratings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your customer feedback and ratings</p>
      </div>

      {/* Stats */}
      <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="rounded-full bg-primary/10 p-2 sm:p-3 flex items-center justify-center flex-shrink-0">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
              <p className="text-xl sm:text-2xl font-bold truncate">{stats.avg}</p>
              <div className="text-xs text-muted-foreground">Based on {stats.total} reviews</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="rounded-full bg-primary/10 p-2 sm:p-3 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-xl sm:text-2xl font-bold truncate">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="rounded-full bg-primary/10 p-2 sm:p-3 flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">5-Star Reviews</p>
              <p className="text-xl sm:text-2xl font-bold truncate">{stats.fiveStarPct}</p>
            </div>
          </CardContent>
        </Card>
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
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">Filter by rating:</span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition ${starFilter === null ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
                onClick={() => setStarFilter(null)}
              >All</button>
              {[5,4,3,2,1].map((s) => (
                <button
                  key={s}
                  onClick={() => setStarFilter(s)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm flex items-center gap-1 transition ${starFilter === s ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
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
              {paginated.map((review) => (
                <article key={review.id} className={`rounded-lg shadow-sm hover:shadow-md transition p-4 sm:p-6 ${starBgClass(review.stars)}`}>
                <header className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarFallback>{review.customerName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-semibold truncate">{review.customerName}</h3>
                      <div className="text-xs text-muted-foreground">{new Date(review.reviewDate).toLocaleDateString()}</div>
                      <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${i < (review.stars || 0) ? "fill-current text-yellow-400" : "text-muted-foreground"}`}
                            style={{ opacity: i < (review.stars || 0) ? 1 : 0.35 }}
                          />
                        ))}
                        <span className="ml-1 text-xs sm:text-sm font-medium text-muted-foreground">{(review.stars || 0)} / 5</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{(review.stars || 0)}.0</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(review.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </header>

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-foreground break-words">{review.description}</div>

                <footer className="mt-3 sm:mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <button className="flex items-center gap-1.5 sm:gap-2 hover:text-foreground px-2 sm:px-3 py-1 rounded-md bg-white/30 transition">
                      <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">Helpful</span>
                    </button>
                  </div>
                </footer>
              </article>
            ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Showing {Math.min(filtered.length, page * pageSize)} of {filtered.length} reviews</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                  <div className="px-2 sm:px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm">Page {page} of {totalPages}</div>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
