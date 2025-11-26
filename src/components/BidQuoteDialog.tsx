import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";

interface MenuItem {
  menuItemId: string;
  name: string;
  specialRequest?: string;
  vendorOrganizationId?: string;
  description?: string;
  images?: string[];
  category?: string;
  subCategory?: string;
  ingredients?: string[];
  spiceLevels?: string[];
  available?: boolean;
}

interface OrderDetail {
  id: string;
  customerId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  menuItems: MenuItem[];
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface Bid {
  id: string;
  orderId: string;
  vendorOrganizationId: string;
  proposedMessage: string;
  proposedTotalPrice: number;
  status: string;
  submittedAt: string;
  updatedAt: string;
}

interface BidQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBid: Bid | null;
  orderDetail: OrderDetail | null;
  quoteData: {
    proposedMessage: string;
    proposedTotalPrice: number;
  };
  onQuoteDataChange: (data: { proposedMessage: string; proposedTotalPrice: number }) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function BidQuoteDialog({
  open,
  onOpenChange,
  selectedBid,
  orderDetail,
  quoteData,
  onQuoteDataChange,
  onSubmit,
}: BidQuoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 rounded-lg overflow-hidden border">
        {/* Sticky Header */}
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">{orderDetail?.eventName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                  {selectedBid?.status || "confirmed"}
                </Badge>
                <span className="text-sm text-muted-foreground">Order ID: {selectedBid?.orderId}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4">
            {/* Show message when no order details */}
            {!orderDetail && (
              <Card className="bg-muted/30">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Order details not loaded</p>
                </CardContent>
              </Card>
            )}

            {orderDetail && (
              <>
                {/* Menu Items */}
                {orderDetail.menuItems && orderDetail.menuItems.length > 0 && (
                  <div className="space-y-3">
                    {orderDetail.menuItems.map((item: MenuItem, idx: number) => (
                    <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex gap-4 p-4">
                        {/* Image */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/96x96?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <Utensils className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base mb-1">{item.name}</h4>
                          
                          {/* Category & Subcategory Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {item.category && (
                              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                                {item.category}
                              </Badge>
                            )}
                            {item.subCategory && (
                              <Badge variant="outline" className="text-xs">{item.subCategory}</Badge>
                            )}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                          )}

                          {/* Ingredients */}
                          {item.ingredients && item.ingredients.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-muted-foreground mb-1">Ingredients:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.ingredients.map((ingredient, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {ingredient}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Spice Level */}
                          {item.spiceLevels && item.spiceLevels.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Spice Level:</span>
                              {item.spiceLevels.map((level, i) => (
                                <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                  {level}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Special Request */}
                          {item.specialRequest && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <p className="font-medium text-amber-900">Special Request:</p>
                              <p className="text-amber-800">{item.specialRequest}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              </>
            )}

            {/* Quote Form - Always show for requested status */}
            {selectedBid?.status === "requested" && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Quote</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Quote Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter your quote amount"
                        value={quoteData.proposedTotalPrice}
                        onChange={(e) =>
                          onQuoteDataChange({
                            ...quoteData,
                            proposedTotalPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proposal Message</Label>
                      <Textarea
                        placeholder="Describe your catering proposal..."
                        rows={4}
                        value={quoteData.proposedMessage}
                        onChange={(e) =>
                          onQuoteDataChange({
                            ...quoteData,
                            proposedMessage: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submitted Quote */}
              {selectedBid?.status !== "requested" && selectedBid?.proposedTotalPrice > 0 && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-900">Your Submitted Quote</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground">Quote Amount</Label>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedBid.proposedTotalPrice.toFixed(2)}
                      </p>
                    </div>
                    {selectedBid.proposedMessage && (
                      <div>
                        <Label className="text-muted-foreground">Proposal Message</Label>
                        <p className="mt-1 text-sm text-green-900 bg-white/50 p-3 rounded-md border border-green-200">
                          {selectedBid.proposedMessage}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t bg-background px-6 py-4">
          <div className="flex justify-end gap-3">
            {selectedBid?.status === "requested" ? (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={(e) => {
                  e.preventDefault();
                  onSubmit(e as any);
                }} className="bg-teal-600 hover:bg-teal-700">
                  Submit Quote
                </Button>
              </>
            ) : (
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
