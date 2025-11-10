import { Star, ThumbsUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const reviews = [
  {
    id: 1,
    client: "Sarah Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    rating: 5,
    date: "2024-03-10",
    event: "Corporate Gala",
    orderId: "ORD-1001",
    comment: "Absolutely fantastic service! The food was delicious and the presentation was impeccable. Our guests couldn't stop raving about it. Will definitely book again!",
    images: [],
    helpful: 12,
  },
  {
    id: 2,
    client: "Mike Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    rating: 5,
    date: "2024-03-08",
    event: "Wedding Reception",
    orderId: "ORD-1002",
    comment: "Made our special day even more memorable. Professional staff, amazing food quality, and perfect timing. Highly recommended!",
    images: [],
    helpful: 8,
  },
  {
    id: 3,
    client: "Emma Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    rating: 4,
    date: "2024-03-05",
    event: "Birthday Party",
    orderId: "ORD-1003",
    comment: "Great experience overall. Food was excellent and service was prompt. Only minor issue was the setup time, but they more than made up for it with quality.",
    images: [],
    helpful: 5,
  },
];

const stats = [
  { label: "Average Rating", value: "4.8", icon: Star },
  { label: "Total Reviews", value: "127", icon: MessageCircle },
  { label: "5-Star Reviews", value: "89%", icon: ThumbsUp },
];

export default function Reviews() {
  const handleReply = (reviewId: number) => {
    toast({
      title: "Reply Posted",
      description: "Your response has been published.",
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Manage your customer feedback and ratings</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback>{review.client[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{review.client}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{review.event}</span>
                      <span>•</span>
                      <span>{review.orderId}</span>
                      <span>•</span>
                      <span>{review.date}</span>
                    </div>
                    <div className="mt-1 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{review.rating}.0</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">{review.comment}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button className="flex items-center gap-1 hover:text-foreground">
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({review.helpful})
                </button>
              </div>
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Reply to review</p>
                <Textarea placeholder="Thank the customer and address their feedback..." rows={3} />
                <Button onClick={() => handleReply(review.id)}>Post Reply</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
