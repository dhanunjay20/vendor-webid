import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Search, ChevronLeft, Package, AlertCircle, X,
  DollarSign, Clock, Users, Settings2, ToggleRight,
} from "lucide-react";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useModernToast } from "@/components/ModernToastProvider";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CustomizationOption {
  optionName: string;
  choices: string; // comma-separated in UI, split to array on submit
  additionalCost: string;
  isRequired: boolean;
}

interface MasterItem {
  itemId: string;
  itemName: string;
  description?: string;
  category?: string;
  image?: string;
  basePrice?: number;
  preparationTime?: string;
  servingSize?: string;
  status?: string;
}

interface VendorItem {
  vendorItemId: string;
  masterItemId: string;
  masterItemName?: string;
  masterItemCategory?: string;
  masterItemImage?: string;
  customName?: string;
  customDescription?: string;
  pricing?: {
    currency?: string;
    pricePerPlate?: number;
    minimumOrderQuantity?: number;
    discountPercentage?: number;
    discountedPrice?: number;
  };
  availability?: {
    isAvailable?: boolean;
    unavailableReason?: string;
    advanceNoticeHours?: number;
    maxDailyCapacity?: number;
  };
  preparationTimeMinutes?: number;
  customizationOptions?: Array<{
    optionName: string;
    choices: string[];
    additionalCost?: number;
    isRequired?: boolean;
  }>;
  status?: string;
}

interface PricingFormState {
  customName: string;
  customDescription: string;
  pricePerPlate: string;
  minimumOrderQuantity: string;
  discountPercentage: string;
  preparationTimeMinutes: string;
  advanceNoticeHours: string;
  maxDailyCapacity: string;
  isAvailable: boolean;
  unavailableReason: string;
  customizationOptions: CustomizationOption[];
}

type DialogMode = "closed" | "browse" | "pricing" | "edit";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(n?: number) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayName(item: VendorItem) {
  return item.customName || item.masterItemName || "Unnamed Item";
}

function normalizeVendorItem(it: any): VendorItem {
  const statusUpper = (it.status || "ACTIVE").toUpperCase();
  const isAvailableDefault = statusUpper !== "INACTIVE";
  const avail = it.availability;
  return {
    vendorItemId: it.vendorItemId || it.id || "",
    masterItemId: it.masterItemId || "",
    masterItemName: it.masterItemName || "",
    masterItemCategory: it.masterItemCategory || it.categoryName || "",
    masterItemImage:
      it.masterItemImage ||
      (Array.isArray(it.images) ? it.images[0] : undefined) ||
      it.image || "",
    customName: it.customName || "",
    customDescription: it.customDescription || "",
    pricing: it.pricing || {},
    availability: avail
      ? { ...avail, isAvailable: avail.isAvailable ?? isAvailableDefault }
      : { isAvailable: it.isAvailable ?? it.available ?? isAvailableDefault },
    preparationTimeMinutes: it.preparationTimeMinutes,
    customizationOptions: it.customizationOptions || [],
    status: statusUpper,
  };
}

// â”€â”€ Pricing sub-form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PricingForm({
  form,
  setForm,
}: {
  form: PricingFormState;
  setForm: React.Dispatch<React.SetStateAction<PricingFormState>>;
}) {
  const set = <K extends keyof PricingFormState>(k: K, v: PricingFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const base = parseFloat(form.pricePerPlate);
  const disc = parseFloat(form.discountPercentage);
  const discountedPrice =
    !isNaN(base) && base > 0 && !isNaN(disc) && disc > 0 && disc < 100
      ? (base * (1 - disc / 100)).toFixed(2)
      : null;

  return (
    <div className="p-4 space-y-3">

      {/* Display Info */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 shrink-0">
            <Pencil className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Display Info</p>
            <p className="text-xs text-gray-500">Override the name and description on your menu</p>
          </div>
          <span className="text-xs text-gray-400 bg-white/80 rounded-full px-2 py-0.5 border border-gray-200">optional</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Custom name</Label>
            <Input
              value={form.customName}
              onChange={(e) => set("customName", e.target.value)}
              placeholder="Override item name for your menu"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Custom description</Label>
            <Textarea
              value={form.customDescription}
              onChange={(e) => set("customDescription", e.target.value)}
              placeholder="Describe your preparation style…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Pricing</p>
            <p className="text-xs text-gray-500">Set your price and optional discount</p>
          </div>
          <span className="text-xs text-red-500 font-medium bg-red-50 rounded-full px-2 py-0.5 border border-red-100">required</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Price per plate <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={form.pricePerPlate}
                  onChange={(e) => set("pricePerPlate", e.target.value)}
                  placeholder="350"
                  className="h-9 pl-7 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Discount (%)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                <Input
                  type="number" min="0" max="100" step="0.1"
                  value={form.discountPercentage}
                  onChange={(e) => set("discountPercentage", e.target.value)}
                  placeholder="0"
                  className="h-9 pl-7 text-sm"
                />
              </div>
            </div>
          </div>

          {discountedPrice && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700">
                Customer pays <strong>₹{discountedPrice}</strong> per plate after discount
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Min. order qty</Label>
              <Input
                type="number" min="1"
                value={form.minimumOrderQuantity}
                onChange={(e) => set("minimumOrderQuantity", e.target.value)}
                placeholder="1"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Prep time (mins)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="number" min="1"
                  value={form.preparationTimeMinutes}
                  onChange={(e) => set("preparationTimeMinutes", e.target.value)}
                  placeholder="60"
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity & Notice */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 shrink-0">
            <Users className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Capacity & Notice</p>
            <p className="text-xs text-gray-500">Planning limits and lead time needed</p>
          </div>
          <span className="text-xs text-gray-400 bg-white/80 rounded-full px-2 py-0.5 border border-gray-200">optional</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Advance notice (hrs)</Label>
              <Input
                type="number" min="0"
                value={form.advanceNoticeHours}
                onChange={(e) => set("advanceNoticeHours", e.target.value)}
                placeholder="24"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Max daily capacity</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="number" min="1"
                  value={form.maxDailyCapacity}
                  onChange={(e) => set("maxDailyCapacity", e.target.value)}
                  placeholder="200"
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 shrink-0">
            <ToggleRight className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Availability</p>
        </div>
        <div className="p-4 space-y-3">
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-colors ${
            form.isAvailable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
          }`}>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {form.isAvailable ? "✓ Available for orders" : "✕ Not available"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {form.isAvailable
                  ? "Customers can find and order this item"
                  : "Item is hidden from customers until re-enabled"}
              </p>
            </div>
            <Switch checked={form.isAvailable} onCheckedChange={(v) => set("isAvailable", v)} />
          </div>
          {!form.isAvailable && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Reason (shown to customers)</Label>
              <Input
                value={form.unavailableReason}
                onChange={(e) => set("unavailableReason", e.target.value)}
                placeholder="e.g. Out of stock till Monday"
                className="h-9 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Customization options */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 shrink-0">
            <Settings2 className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Add-on Options</p>
            <p className="text-xs text-gray-500">Spice level, meat type, extras…</p>
          </div>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() =>
              set("customizationOptions", [
                ...form.customizationOptions,
                { optionName: "", choices: "", additionalCost: "", isRequired: false },
              ])
            }
            className="h-7 text-xs bg-white border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="p-4 space-y-3">
          {form.customizationOptions.length === 0 && (
            <button
              type="button"
              onClick={() =>
                set("customizationOptions", [
                  { optionName: "", choices: "", additionalCost: "", isRequired: false },
                ])
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add customization option (e.g. Spice Level, Meat Type)
            </button>
          )}
          {form.customizationOptions.map((opt, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Option {idx + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    set("customizationOptions", form.customizationOptions.filter((_, i) => i !== idx))
                  }
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Option name <span className="text-red-500">*</span></Label>
                <Input
                  value={opt.optionName}
                  onChange={(e) =>
                    set("customizationOptions",
                      form.customizationOptions.map((o, i) => i === idx ? { ...o, optionName: e.target.value } : o))
                  }
                  placeholder="e.g. Meat Type"
                  className="h-8 text-sm bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">
                  Choices <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal"> — comma-separated</span>
                </Label>
                <Input
                  value={opt.choices}
                  onChange={(e) =>
                    set("customizationOptions",
                      form.customizationOptions.map((o, i) => i === idx ? { ...o, choices: e.target.value } : o))
                  }
                  placeholder="e.g. Chicken, Mutton, Veg"
                  className="h-8 text-sm bg-white"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-gray-500">Extra cost (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={opt.additionalCost}
                      onChange={(e) =>
                        set("customizationOptions",
                          form.customizationOptions.map((o, i) => i === idx ? { ...o, additionalCost: e.target.value } : o))
                      }
                      placeholder="0"
                      className="h-8 pl-6 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Switch
                    checked={opt.isRequired}
                    onCheckedChange={(v) =>
                      set("customizationOptions",
                        form.customizationOptions.map((o, i) => i === idx ? { ...o, isRequired: v } : o))
                    }
                  />
                  <Label className="text-xs text-gray-600">Required</Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BLANK_FORM: PricingFormState = {
  customName: "",
  customDescription: "",
  pricePerPlate: "",
  minimumOrderQuantity: "1",
  discountPercentage: "",
  preparationTimeMinutes: "",
  advanceNoticeHours: "",
  maxDailyCapacity: "",
  isAvailable: true,
  unavailableReason: "",
  customizationOptions: [],
};

export default function Menu() {
  // Vendor's current menu
  const [items, setItems] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Master items catalogue (for browse step)
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [masterPage, setMasterPage] = useState(0);
  const [masterHasMore, setMasterHasMore] = useState(false);

  // Dialog state
  const [mode, setMode] = useState<DialogMode>("closed");
  const [selectedMaster, setSelectedMaster] = useState<MasterItem | null>(null);
  const [editingItem, setEditingItem] = useState<VendorItem | null>(null);
  const [form, setForm] = useState<PricingFormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<VendorItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast manager
  const { showToast } = useModernToast();

  // â”€â”€ Load vendor menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getMenuItems(undefined);
      const raw: any[] = Array.isArray(data) ? data : [];
      setItems(raw.map(normalizeVendorItem));
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // â”€â”€ Load master items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadMasterItems = useCallback(
    async (search: string, page: number, reset = false) => {
      setMasterLoading(true);
      try {
        const res = await api.getMasterMenuItems(page, 12, search || undefined);
        const raw: any[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        const list: MasterItem[] = raw.map((it: any) => ({
          itemId: it.masterItemId || it.itemId || it.id || "",
          itemName: it.itemName || it.name || "",
          description: it.description,
          category: it.category || it.categoryName,
          image: it.image || (Array.isArray(it.imageUrls) ? it.imageUrls[0] : undefined) || (Array.isArray(it.images) ? it.images[0] : undefined),
          basePrice: it.basePrice,
          preparationTime: it.preparationTime,
          servingSize: it.servingSize,
          status: it.status,
        }));
        const hasMore = res?.pageInfo?.hasMore ?? false;
        setMasterItems(reset ? list : (prev) => [...prev, ...list]);
        setMasterHasMore(hasMore);
      } catch {
        setMasterItems([]);
        setMasterHasMore(false);
      } finally {
        setMasterLoading(false);
      }
    },
    []
  );

  // Reload master items whenever search changes while browse step is open
  useEffect(() => {
    if (mode === "browse") {
      setMasterPage(0);
      loadMasterItems(masterSearch, 0, true);
    }
  }, [mode, masterSearch, loadMasterItems]);

  // â”€â”€ Dialog helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openAdd = () => {
    setForm(BLANK_FORM);
    setSelectedMaster(null);
    setEditingItem(null);
    setMasterSearch("");
    setMode("browse");
  };

  const openEdit = (item: VendorItem) => {
    setEditingItem(item);
    setSelectedMaster(null);
    setForm({
      customName: item.customName || "",
      customDescription: item.customDescription || "",
      pricePerPlate: String(item.pricing?.pricePerPlate ?? ""),
      minimumOrderQuantity: String(item.pricing?.minimumOrderQuantity ?? "1"),
      discountPercentage: String(item.pricing?.discountPercentage ?? ""),
      preparationTimeMinutes: String(item.preparationTimeMinutes ?? ""),
      advanceNoticeHours: String(item.availability?.advanceNoticeHours ?? ""),
      maxDailyCapacity: String(item.availability?.maxDailyCapacity ?? ""),
      isAvailable: item.availability?.isAvailable ?? true,
      unavailableReason: item.availability?.unavailableReason || "",
      customizationOptions: (item.customizationOptions ?? []).map((o) => ({
        optionName: o.optionName,
        choices: Array.isArray(o.choices) ? o.choices.join(", ") : "",
        additionalCost: o.additionalCost != null ? String(o.additionalCost) : "",
        isRequired: o.isRequired ?? false,
      })),
    });
    setMode("edit");
  };

  const selectMaster = (master: MasterItem) => {
    setSelectedMaster(master);
    setForm({
      ...BLANK_FORM,
      customName: master.itemName,
      customDescription: master.description || "",
      pricePerPlate: master.basePrice ? String(master.basePrice) : "",
    });
    setMode("pricing");
  };

  const closeDialog = () => {
    setMode("closed");
    setSelectedMaster(null);
    setEditingItem(null);
    setSaving(false);
  };

  // â”€â”€ API actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleAdd = async () => {
    if (!selectedMaster) return;
    const price = parseFloat(form.pricePerPlate);
    if (!form.pricePerPlate || isNaN(price) || price <= 0) {
      showToast({
        title: "Price required",
        description: "Please enter a valid price per plate greater than 0",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        masterItemId: selectedMaster.itemId,
        pricePerPlate: price,
        isAvailable: form.isAvailable,
      };
      if (form.customName && form.customName !== selectedMaster.itemName)
        payload.customName = form.customName;
      if (form.customDescription)
        payload.customDescription = form.customDescription;
      if (form.minimumOrderQuantity)
        payload.minimumOrderQuantity = parseInt(form.minimumOrderQuantity);
      if (form.discountPercentage)
        payload.discountPercentage = parseFloat(form.discountPercentage);
      if (form.preparationTimeMinutes)
        payload.preparationTimeMinutes = parseInt(form.preparationTimeMinutes);
      if (form.advanceNoticeHours)
        payload.advanceNoticeHours = parseInt(form.advanceNoticeHours);
      if (form.maxDailyCapacity)
        payload.maxDailyCapacity = parseInt(form.maxDailyCapacity);
      if (!form.isAvailable && form.unavailableReason)
        payload.unavailableReason = form.unavailableReason;
      if (form.customizationOptions.length > 0) {
        const mapped = form.customizationOptions
          .filter((o) => o.optionName.trim() && o.choices.trim())
          .map((o) => ({
            optionName: o.optionName.trim(),
            choices: o.choices.split(",").map((c) => c.trim()).filter(Boolean),
            ...(o.additionalCost ? { additionalCost: parseFloat(o.additionalCost) } : {}),
            isRequired: o.isRequired,
          }));
        if (mapped.length > 0) payload.customizationOptions = mapped;
      }

      const created = await api.createMenuItem("", payload);
      if (created) {
        setItems((prev) => [normalizeVendorItem(created), ...prev]);
      } else {
        await loadMenu();
      }
      showToast({
        title: "Item added",
        description: `${form.customName || selectedMaster.itemName} added to your menu.`,
        variant: "success",
      });
      closeDialog();
    } catch (err: any) {
      showToast({
        title: "Error",
        description: err?.message || "Failed to add item",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    const price = parseFloat(form.pricePerPlate);
    if (form.pricePerPlate && (isNaN(price) || price <= 0)) {
      showToast({
        title: "Invalid price",
        description: "Price per plate must be greater than 0",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {};
      // Backend requires masterItemId even for updates
      if (editingItem.masterItemId) payload.masterItemId = editingItem.masterItemId;
      if (form.customName !== undefined) payload.customName = form.customName;
      if (form.customDescription !== undefined) payload.customDescription = form.customDescription;
      if (form.pricePerPlate) payload.pricePerPlate = price;
      if (form.minimumOrderQuantity)
        payload.minimumOrderQuantity = parseInt(form.minimumOrderQuantity);
      if (form.discountPercentage !== "")
        payload.discountPercentage = parseFloat(form.discountPercentage) || 0;
      if (form.preparationTimeMinutes)
        payload.preparationTimeMinutes = parseInt(form.preparationTimeMinutes);
      if (form.advanceNoticeHours)
        payload.advanceNoticeHours = parseInt(form.advanceNoticeHours);
      if (form.maxDailyCapacity)
        payload.maxDailyCapacity = parseInt(form.maxDailyCapacity);
      payload.isAvailable = form.isAvailable;
      if (!form.isAvailable && form.unavailableReason)
        payload.unavailableReason = form.unavailableReason;
      if (form.customizationOptions.length > 0) {
        const mapped = form.customizationOptions
          .filter((o) => o.optionName.trim() && o.choices.trim())
          .map((o) => ({
            optionName: o.optionName.trim(),
            choices: o.choices.split(",").map((c) => c.trim()).filter(Boolean),
            ...(o.additionalCost ? { additionalCost: parseFloat(o.additionalCost) } : {}),
            isRequired: o.isRequired,
          }));
        if (mapped.length > 0) payload.customizationOptions = mapped;
      }

      const updated = await api.updateMenuItem("", editingItem.vendorItemId, payload);
      if (updated) {
        setItems((prev) =>
          prev.map((i) =>
            i.vendorItemId === editingItem.vendorItemId ? normalizeVendorItem(updated) : i
          )
        );
      } else {
        await loadMenu();
      }
      showToast({ title: "Item updated", variant: "success" });
      closeDialog();
    } catch (err: any) {
      showToast({
        title: "Error",
        description: err?.message || "Failed to update item",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: VendorItem) => {
    const newVal = !(item.availability?.isAvailable ?? true);
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.vendorItemId === item.vendorItemId
          ? { ...i, status: newVal ? "ACTIVE" : "INACTIVE", availability: { ...i.availability, isAvailable: newVal } }
          : i
      )
    );
    try {
      await api.toggleMenuItemAvailability(item.vendorItemId, newVal);
      showToast({
        title: "Success",
        description: `${displayName(item)} is now ${newVal ? "available" : "unavailable"}`,
        variant: "success",
      });
    } catch (err: any) {
      // Rollback
      setItems((prev) =>
        prev.map((i) =>
          i.vendorItemId === item.vendorItemId
            ? { ...i, status: !newVal ? "ACTIVE" : "INACTIVE", availability: { ...i.availability, isAvailable: !newVal } }
            : i
        )
      );
      showToast({
        title: "Error",
        description: err?.message || "Failed to update availability",
        variant: "error",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const response = await api.deleteMenuItem("", deleteConfirm.vendorItemId);
      // Remove from UI state only after successful API response
      setItems((prev) => prev.filter((i) => i.vendorItemId !== deleteConfirm.vendorItemId));
      showToast({
        title: "Item deleted",
        description: `${displayName(deleteConfirm)} has been permanently removed from your menu.`,
        variant: "success",
      });
      setDeleteConfirm(null);
    } catch (err: any) {
      showToast({
        title: "Error",
        description: err?.message || "Failed to delete item",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isOpen = mode !== "closed";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">

        {/* Page header */}
        <div className="bg-white border border-orange-100 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">
                Vendor menu
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">
                Menu Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Browse the platform catalogue, set your pricing and manage availability.
              </p>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2 bg-orange-600 hover:bg-orange-700 min-h-[44px]"
            >
              <Plus className="h-5 w-5" />
              Add menu item
            </Button>
          </div>

          {/* Stats bar */}
          {items.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-orange-50">
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{items.length}</span>
                <span className="text-gray-500 ml-1">total items</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-green-700">
                  {items.filter((i) => i.availability?.isAvailable !== false).length}
                </span>
                <span className="text-gray-500 ml-1">available</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-500">
                  {items.filter((i) => i.availability?.isAvailable === false).length}
                </span>
                <span className="text-gray-500 ml-1">unavailable</span>
              </div>
            </div>
          )}
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Loading your menu…
          </div>
        )}
        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-orange-200 bg-white py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <Package className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">No menu items yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Browse the platform catalogue and add items with your custom pricing.
              </p>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2 bg-orange-600 hover:bg-orange-700 min-h-[44px] rounded-full px-6"
            >
              <Plus className="h-5 w-5" />
              Add your first item
            </Button>
          </div>
        )}

        {/* Item grid */}
        {items.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.vendorItemId}
                className={`group relative bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                  item.status === "INACTIVE" || item.availability?.isAvailable === false
                    ? "border-gray-200 opacity-70"
                    : "border-orange-100"
                }`}
              >
                {/* Image */}
                <div className="aspect-video bg-orange-50 overflow-hidden">
                  {item.masterItemImage ? (
                    <img
                      src={item.masterItemImage}
                      alt={displayName(item)}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-orange-200">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div
                  className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm border ${
                    item.status === "OUT_OF_STOCK"
                      ? "bg-amber-100/90 text-amber-700 border-amber-200"
                      : item.status === "INACTIVE" || item.availability?.isAvailable === false
                      ? "bg-red-100/90 text-red-600 border-red-200"
                      : "bg-green-100/90 text-green-700 border-green-200"
                  }`}
                >
                  {item.status === "OUT_OF_STOCK"
                    ? "Out of stock"
                    : item.status === "INACTIVE" || item.availability?.isAvailable === false
                    ? "Inactive"
                    : "Active"}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {displayName(item)}
                      </h3>
                      {item.masterItemCategory && (
                        <p className="text-xs text-orange-600 mt-0.5">{item.masterItemCategory}</p>
                      )}
                      {item.customDescription && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.customDescription}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={item.status !== "INACTIVE" && item.availability?.isAvailable !== false}
                      onCheckedChange={() => handleToggle(item)}
                      className="shrink-0 mt-0.5"
                    />
                  </div>

                  {/* Pricing */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-orange-600">
                      {fmt(item.pricing?.discountedPrice ?? item.pricing?.pricePerPlate)}
                    </span>
                    {(item.pricing?.discountPercentage ?? 0) > 0 && (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          {fmt(item.pricing?.pricePerPlate)}
                        </span>
                        <Badge className="bg-green-100 text-green-700 text-xs border-0 px-1.5">
                          {item.pricing!.discountPercentage}% off
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-gray-500">/ plate</span>
                  </div>

                  {item.pricing?.minimumOrderQuantity && (
                    <p className="text-xs text-gray-500 mt-1">
                      Min order: {item.pricing.minimumOrderQuantity} plates
                    </p>
                  )}

                  {item.preparationTimeMinutes && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prep: {item.preparationTimeMinutes} mins
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                      className="flex-1 border-orange-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 min-h-[36px] text-xs sm:text-sm"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(item)}
                      className="flex-1 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[36px] text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl border-0 shadow-2xl">
          {/* Header */}
          <DialogHeader className={`px-5 py-4 border-b shrink-0 ${
            mode === "browse"
              ? "bg-gradient-to-r from-slate-700 to-gray-800"
              : mode === "pricing"
              ? "bg-gradient-to-r from-orange-500 to-amber-500"
              : "bg-gradient-to-r from-orange-600 to-rose-500"
          }`}>
            <div className="flex items-center gap-3">
              {mode === "pricing" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setMode("browse"); setSelectedMaster(null); }}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-semibold text-white">
                  {mode === "browse" && "Browse menu catalogue"}
                  {mode === "pricing" && `Configure: ${selectedMaster?.itemName}`}
                  {mode === "edit" && `Edit: ${editingItem ? displayName(editingItem) : ""}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/70 mt-0.5">
                  {mode === "browse" && "Pick an item to add to your menu with custom pricing"}
                  {mode === "pricing" && "Set your price, discount, and availability"}
                  {mode === "edit" && "Update pricing and availability for this item"}
                </DialogDescription>
              </div>
              {mode === "browse" && (
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <span className="bg-white/20 rounded-full px-2 py-0.5">Step 1</span>
                </div>
              )}
              {mode === "pricing" && (
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <span className="bg-white/20 rounded-full px-2 py-0.5">Step 2</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Browse step */}
          {mode === "browse" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-3 border-b bg-gray-50 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    placeholder="Search items…"
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {masterLoading && masterItems.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-12">
                    Loading catalogue…
                  </p>
                )}
                {!masterLoading && masterItems.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {masterSearch ? "No items match your search" : "No items available"}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {masterItems.map((m, idx) => (
                    <button
                      key={m.itemId || `master-${idx}`}
                      onClick={() => selectMaster(m)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-left transition-all group"
                    >
                      <div className="h-14 w-14 rounded-lg bg-orange-100 overflow-hidden shrink-0">
                        {m.image ? (
                          <img
                            src={m.image}
                            alt={m.itemName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-orange-400">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 group-hover:text-orange-700 truncate">
                          {m.itemName}
                        </p>
                        {m.category && (
                          <p className="text-xs text-orange-600 mt-0.5">{m.category}</p>
                        )}
                        {m.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {m.description}
                          </p>
                        )}
                        {m.basePrice != null && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            Base: ₹{m.basePrice}
                          </p>
                        )}
                      </div>
                      <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-orange-500 rotate-180 shrink-0" />
                    </button>
                  ))}
                </div>

                {masterHasMore && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = masterPage + 1;
                      setMasterPage(next);
                      loadMasterItems(masterSearch, next);
                    }}
                    className="w-full mt-4 text-orange-600 border-orange-200 hover:bg-orange-50"
                    disabled={masterLoading}
                  >
                    {masterLoading ? "Loading…" : "Load more"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pricing step (add) */}
          {mode === "pricing" && (
            <div className="flex-1 overflow-y-auto">
              {selectedMaster && (
                <div className="px-6 pt-4 pb-0 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-orange-100 overflow-hidden shrink-0">
                    {selectedMaster.image ? (
                      <img
                        src={selectedMaster.image}
                        alt={selectedMaster.itemName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-orange-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedMaster.itemName}
                    </p>
                    {selectedMaster.category && (
                      <p className="text-xs text-orange-600">{selectedMaster.category}</p>
                    )}
                  </div>
                </div>
              )}
              <PricingForm form={form} setForm={setForm} />
            </div>
          )}

          {/* Edit step */}
          {mode === "edit" && (
            <div className="flex-1 overflow-y-auto">
              <PricingForm form={form} setForm={setForm} />
            </div>
          )}

          {/* Footer buttons */}
          {(mode === "pricing" || mode === "edit") && (
            <div className="px-6 py-4 border-t bg-white shrink-0 flex gap-3">
              <Button
                variant="outline"
                onClick={closeDialog}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={mode === "pricing" ? handleAdd : handleEdit}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : mode === "pricing"
                  ? "Add to menu"
                  : "Save changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Delete menu item permanently?</DialogTitle>
            <DialogDescription className="text-base mt-2">
              {deleteConfirm && (
                <>
                  <strong>{displayName(deleteConfirm)}</strong> will be permanently removed from your vendor menu. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="flex-1"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

