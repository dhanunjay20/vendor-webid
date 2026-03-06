import { useState, useEffect } from "react";
import { Plus, LifeBuoy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  ticketId?: string;
  id?: string;
  category: string;
  subcategory?: string;
  priority: string;
  subject: string;
  description: string;
  status?: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
  responses?: TicketResponse[];
}

interface TicketResponse {
  responseId?: string;
  message?: string;
  respondedBy?: string;
  createdAt?: string;
}

interface CreateForm {
  category: string;
  priority: string;
  subject: string;
  description: string;
  orderId: string;
}

const CATEGORIES = ["PAYMENT", "ACCOUNT", "ORDER", "TECHNICAL", "BID", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const StatusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
  RESOLVED: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
};

const PriorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 border-gray-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
};

function fmt(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateForm>({
    category: "",
    priority: "MEDIUM",
    subject: "",
    description: "",
    orderId: "",
  });

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await api.getMySupportTickets(0, 50);
      const list: Ticket[] = res?.content ?? res?.data ?? res ?? [];
      setTickets(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast({ title: "Failed to load tickets", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function resetForm() {
    setForm({ category: "", priority: "MEDIUM", subject: "", description: "", orderId: "" });
  }

  async function handleCreate() {
    if (!form.category) {
      toast({ title: "Category required", description: "Please select a category.", variant: "destructive" });
      return;
    }
    if (!form.subject.trim()) {
      toast({ title: "Subject required", description: "Please enter a subject.", variant: "destructive" });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: "Description required", description: "Please describe your issue.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof api.createSupportTicket>[0] = {
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
      };
      if (form.orderId.trim()) payload.orderId = form.orderId.trim();

      await api.createSupportTicket(payload);
      toast({ title: "Ticket created", description: "Our team will get back to you soon." });
      setDialogOpen(false);
      resetForm();
      loadTickets();
    } catch (err: any) {
      toast({ title: "Failed to create ticket", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function ticketKey(t: Ticket) {
    return t.ticketId ?? t.id ?? "";
  }

  function toggleExpand(key: string) {
    setExpandedId((prev) => (prev === key ? null : key));
  }

  const open = tickets.filter((t) => (t.status ?? "OPEN") !== "CLOSED" && (t.status ?? "OPEN") !== "RESOLVED").length;
  const resolved = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <LifeBuoy className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500">Get help from our support team</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Open / In Progress</p>
            <p className="text-2xl font-bold text-orange-600">{open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Resolved / Closed</p>
            <p className="text-2xl font-bold text-green-600">{resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Your Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {loading && (
            <div className="flex justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
            </div>
          )}
          {!loading && tickets.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <LifeBuoy className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No tickets yet</p>
              <p className="text-sm">Click "New Ticket" to get help from our team.</p>
            </div>
          )}
          {!loading && tickets.map((ticket) => {
            const key = ticketKey(ticket);
            const isExpanded = expandedId === key;
            const status = ticket.status ?? "OPEN";
            const priority = ticket.priority ?? "MEDIUM";

            return (
              <div
                key={key}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Row */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">{ticket.subject}</span>
                      <Badge variant="outline" className={`text-xs ${StatusColors[status] ?? "bg-gray-100 text-gray-600"}`}>
                        {status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${PriorityColors[priority] ?? "bg-gray-100 text-gray-600"}`}>
                        {priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        {ticket.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmt(ticket.createdAt)}</p>
                  </div>
                  <span className="flex-shrink-0 text-gray-400 mt-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    {ticket.orderId && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Related Order</p>
                        <p className="text-sm text-gray-700">{ticket.orderId}</p>
                      </div>
                    )}
                    {ticket.responses && ticket.responses.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Responses</p>
                        <div className="space-y-2">
                          {ticket.responses.map((r, i) => (
                            <div key={r.responseId ?? i} className="bg-white border border-gray-200 rounded p-3">
                              <p className="text-sm text-gray-800">{r.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {r.respondedBy ?? "Support"} · {fmt(r.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category <span className="text-red-500">*</span></Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Brief summary of your issue"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Optional Order ID */}
            <div className="space-y-1">
              <Label>Order ID <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="Related order ID if applicable"
                value={form.orderId}
                onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); resetForm(); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
