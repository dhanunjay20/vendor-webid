import { useEffect, useState, useMemo } from "react";
import { Star, ThumbsUp, MessageCircle } from "lucide-react";
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
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Manage your customer feedback and ratings</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-2xl font-bold">{stats.avg}</p>
              <div className="text-xs text-muted-foreground">Based on {stats.total} reviews</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
              <ThumbsUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">5-Star Reviews</p>
              <p className="text-2xl font-bold">{stats.fiveStarPct}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div>
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <Input
              placeholder="Search reviews or customer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11"
              aria-label="Search reviews"
            />
            <Button variant="ghost" onClick={() => setQuery("")}>Clear</Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <button
                className={`px-3 py-1 rounded-md text-sm ${starFilter === null ? 'bg-slate-100' : 'bg-white'}`}
                onClick={() => setStarFilter(null)}
              >All</button>
              {[5,4,3,2,1].map((s) => (
                <button
                  key={s}
                  onClick={() => setStarFilter(s)}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-2 ${starFilter === s ? 'bg-slate-100' : 'bg-white'}`}
                >
                  <Star className="h-4 w-4 text-yellow-400" /> {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">No reviews match your search.</div>
        ) : (
          <div>
            <div className="grid gap-6 md:grid-cols-2">
              {paginated.map((review) => (
                <article key={review.id} className={`rounded-lg shadow-sm hover:shadow-md transition p-6 ${starBgClass(review.stars)}`}>
                <header className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{review.customerName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-base font-semibold">{review.customerName}</h3>
                      <div className="text-xs text-muted-foreground">{new Date(review.reviewDate).toLocaleDateString()}</div>
                      <div className="mt-2 flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < (review.stars || 0) ? "fill-current text-yellow-400" : "text-muted-foreground"}`}
                            style={{ opacity: i < (review.stars || 0) ? 1 : 0.35 }}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-muted-foreground">{(review.stars || 0)} / 5</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="self-start">{(review.stars || 0)}.0</Badge>
                </header>

                <div className="mt-4 text-sm text-foreground">{review.description}</div>

                <footer className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button className="flex items-center gap-2 hover:text-foreground px-3 py-1 rounded-md bg-white/30 transition">
                      <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Helpful</span>
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground"></div>
                </footer>
              </article>
            ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Showing {Math.min(filtered.length, page * pageSize)} of {filtered.length} reviews</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                  <div className="px-3 py-1 rounded-md bg-white text-sm">Page {page} of {totalPages}</div>
                  <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
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
