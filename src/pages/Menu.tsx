import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Plus, GripVertical, Pencil, Trash2, ImagePlus } from "lucide-react";
import * as api from "@/lib/api";
import INGREDIENTS from "@/lib/ingredients";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  subCategory?: string;
  ingredients?: string[];
  spiceLevels?: string[];
  available?: boolean;
}

const categories = [
  "Appetizers",
  "Main Course",
  "Side Dishes",
  "Desserts",
  "Beverages",
];

export default function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const routeVendorId =
    params.vendorOrganizationId || params.vendorId || "";
  const storedVendorId =
    typeof window !== "undefined"
      ? localStorage.getItem("vendorOrganizationId")
      : null;
  const vendorOrganizationId = routeVendorId || storedVendorId || "";

  useEffect(() => {
    const fetchMenu = async () => {
      if (!vendorOrganizationId) {
        setError(
          "Missing vendor organization. Please open this page from your vendor dashboard."
        );
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getMenuItems(vendorOrganizationId);
        const normalized: MenuItem[] = (data || []).map((it: any) => ({
          id: it.id || it._id || String(Math.random()),
          name: it.name || "",
          description: it.description || "",
          images: Array.isArray(it.images)
            ? it.images
            : it.image
            ? [it.image]
            : [],
          category: it.category || "",
          subCategory: it.subCategory || it.sub_category || "",
          ingredients: Array.isArray(it.ingredients)
            ? it.ingredients
            : it.ingredients
            ? String(it.ingredients)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          spiceLevels: Array.isArray(it.spiceLevels)
            ? it.spiceLevels
            : it.spiceLevels
            ? String(it.spiceLevels)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          available:
            typeof it.available === "boolean"
              ? it.available
              : it.available
              ? true
              : false,
        }));
        setMenuItems(normalized);
      } catch (err: any) {
        setError(err?.message || "Something went wrong while loading menu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [vendorOrganizationId]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesChange = (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    setSelectedFiles(files);
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((urls) => setPreviewImages(urls))
      .catch(() => {});
  };

  // spice
  const [spiceList, setSpiceList] = useState<string[]>([]);
  const [spiceInput, setSpiceInput] = useState<string>("");

  // ingredients
  const [ingredientList, setIngredientList] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState<string>("");
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>(
    []
  );

  const formRef = useRef<HTMLFormElement | null>(null);
  const [availableState, setAvailableState] = useState<boolean>(true);

  const addIngredient = (value?: string) => {
    const v = (value ?? ingredientInput).trim();
    if (!v) return;
    if (ingredientList.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setIngredientInput("");
      return;
    }
    setIngredientList((prev) => [...prev, v]);
    setIngredientInput("");
  };

  useEffect(() => {
    const q = ingredientInput.trim().toLowerCase();
    if (!q) {
      setIngredientSuggestions([]);
      return;
    }
    const filtered = INGREDIENTS.filter(
      (i) => i.toLowerCase().includes(q) && !ingredientList.includes(i)
    ).slice(0, 8);
    setIngredientSuggestions(filtered);
  }, [ingredientInput, ingredientList]);

  const addSpice = (value?: string) => {
    const v = (value ?? spiceInput).trim();
    if (!v) return;
    setSpiceList((prev) => [...prev, v]);
    setSpiceInput("");
  };

  const spawnRandom = () => {
    const opts = [
      "Mild",
      "Low",
      "Medium",
      "Hot",
      "Spicy",
      "Extra Hot",
      "Fiery",
      "Smoky",
      "Tangy",
      "Peppery",
    ];
    setSpiceList((prev) => [
      ...prev,
      opts[Math.floor(Math.random() * opts.length)],
    ]);
  };

  const removeSpice = (idx: number) =>
    setSpiceList((prev) => prev.filter((_, i) => i !== idx));

  const spiceIntensity = (s: string) => {
    const v = s.toLowerCase();
    if (v.includes("extra") || v.includes("fiery")) return 5;
    if (v.includes("hot") || v.includes("spicy") || v.includes("pepper"))
      return 4;
    if (v.includes("medium") || v.includes("tangy") || v.includes("smok"))
      return 3;
    if (v.includes("low") || v.includes("mild") || v.includes("sweet")) return 1;
    return 2;
  };

  const spicePillClass = (s: string) => {
    const i = spiceIntensity(s);
    if (i >= 5)
      return "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm ring-1 ring-red-700/20";
    if (i === 4)
      return "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm ring-1 ring-red-600/15";
    if (i === 3)
      return "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm ring-1 ring-orange-400/15";
    if (i === 2)
      return "bg-gradient-to-r from-amber-200 to-amber-300 text-amber-900 shadow-sm ring-1 ring-amber-300/20";
    return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 shadow-sm ring-1 ring-amber-200/20";
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const imagesToUse: string[] =
      previewImages.length > 0
        ? previewImages
        : editingItem
        ? editingItem.images
        : [];

    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: (formData.get("name") as string) || "",
      description: (formData.get("description") as string) || "",
      images: imagesToUse,
      category: (formData.get("category") as string) || "",
      subCategory: (formData.get("subCategory") as string) || "",
      ingredients: ingredientList.slice(),
      spiceLevels: spiceList.slice(),
      available: availableState,
    };

    try {
      if (!vendorOrganizationId) throw new Error("Missing vendorOrganizationId");

      const payload: any = {
        vendorOrganizationId,
        name: newItem.name,
        description: newItem.description,
        images: newItem.images,
        category: newItem.category,
        subCategory: newItem.subCategory,
        ingredients: newItem.ingredients,
        spiceLevels: newItem.spiceLevels,
        available: newItem.available,
      };

      if (editingItem) {
        const updated = await api.updateMenuItem(
          vendorOrganizationId,
          editingItem.id,
          payload
        );
        const normalized: MenuItem = {
          id: updated.id || updated._id || editingItem.id,
          name: updated.name || payload.name,
          description: updated.description || payload.description,
          images: Array.isArray(updated.images)
            ? updated.images
            : updated.image
            ? [updated.image]
            : payload.images,
          category: updated.category || payload.category,
          subCategory:
            updated.subCategory || updated.sub_category || payload.subCategory,
          ingredients: Array.isArray(updated.ingredients)
            ? updated.ingredients
            : payload.ingredients || [],
          spiceLevels: Array.isArray(updated.spiceLevels)
            ? updated.spiceLevels
            : payload.spiceLevels || [],
          available:
            typeof updated.available === "boolean"
              ? updated.available
              : !!payload.available,
        };
        setMenuItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? normalized : i))
        );
        toast({
          title: "Item updated",
          description: "Menu item has been updated successfully.",
        });
      } else {
        const created = await api.createMenuItem(vendorOrganizationId, payload);
        const normalized: MenuItem = {
          id: created.id || created._id || newItem.id,
          name: created.name || newItem.name,
          description: created.description || newItem.description,
          images: Array.isArray(created.images)
            ? created.images
            : created.image
            ? [created.image]
            : newItem.images,
          category: created.category || newItem.category,
          subCategory:
            created.subCategory ||
            created.sub_category ||
            newItem.subCategory,
          ingredients: Array.isArray(created.ingredients)
            ? created.ingredients
            : newItem.ingredients || [],
          spiceLevels: Array.isArray(created.spiceLevels)
            ? created.spiceLevels
            : newItem.spiceLevels || [],
          available:
            typeof created.available === "boolean"
              ? created.available
              : !!newItem.available,
        };
        setMenuItems((prev) => [...prev, normalized]);
        toast({
          title: "Item added",
          description: "New menu item has been added successfully.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save menu item",
        variant: "destructive",
      });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    setSelectedFiles([]);
    setPreviewImages([]);
    setSpiceList([]);
    setSpiceInput("");
    setIngredientList([]);
    setIngredientInput("");
  };

  const handleDeleteItem = (id: string) => {
    (async () => {
      try {
        if (!vendorOrganizationId) throw new Error("Missing vendorOrganizationId");
        await api.deleteMenuItem(vendorOrganizationId, id);
        setMenuItems((prev) => prev.filter((item) => item.id !== id));
        toast({
          title: "Item deleted",
          description: "Menu item has been removed.",
        });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err?.message || "Failed to delete item",
          variant: "destructive",
        });
      }
    })();
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = menuItems.findIndex((item) => item.id === draggedItem);
    const targetIndex = menuItems.findIndex((item) => item.id === targetId);
    const newItems = [...menuItems];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);
    setMenuItems(newItems);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
    setPreviewImages(item.images || []);
    setSelectedFiles([]);
    setSpiceList(item.spiceLevels || []);
    setAvailableState(
      typeof item.available === "boolean" ? item.available : true
    );
    setIngredientList(item.ingredients || []);
    setIngredientInput("");
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
    setPreviewImages([]);
    setSelectedFiles([]);
    setSpiceList([]);
    setSpiceInput("");
    setIngredientList([]);
    setIngredientInput("");
    setAvailableState(true);
  };

  const allItemsEmpty = menuItems.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      {/* Page header */}
      <Card className="border-none bg-gradient-to-r from-orange-50 via-white to-amber-50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-500">
              Vendor menu
            </p>
            <CardTitle className="mt-1 text-2xl font-semibold">
              Menu Management
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Add items, upload photos, and control what is visible to your
              customers.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-full px-4 py-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                Add menu item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
              <div className="flex max-h-[80vh] flex-col">
                <DialogHeader className="sticky top-0 z-30 border-b bg-white/90 px-6 py-4 backdrop-blur">
                  <DialogTitle className="text-lg font-semibold">
                    {editingItem ? "Edit menu item" : "Add new menu item"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Fill in basic details, attach photos and customise spice /
                    ingredients.
                  </p>
                </DialogHeader>

                <form
                  ref={formRef}
                  onSubmit={handleAddItem}
                  className="flex-1 overflow-auto bg-slate-50/60 px-6 py-4"
                  id="menu-form"
                >
                  {/* Section: Basic info */}
                  <div className="mb-5 space-y-3 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Basic details
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Item name</Label>
                        <Input
                          name="name"
                          placeholder="Ex: Paneer Butter Masala"
                          defaultValue={editingItem?.name}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <select
                          name="category"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          defaultValue={editingItem?.category || categories[0]}
                          required
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          name="description"
                          placeholder="Tell customers what makes this item special..."
                          defaultValue={editingItem?.description}
                          rows={3}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sub category</Label>
                        <select
                          name="subCategory"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          defaultValue={editingItem?.subCategory || ""}
                        >
                          <option value="">Select...</option>
                          <option value="Vegetarian">Vegetarian</option>
                          <option value="Non-Vegetarian">Non-Vegetarian</option>
                          <option value="Vegan">Vegan</option>
                          <option value="Gluten-Free">Gluten-Free</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Images */}
                  <div className="mb-5 space-y-3 rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Photos
                    </p>
                    <div className="space-y-2">
                      <Label>Upload images</Label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          handleFilesChange(e.dataTransfer.files);
                        }}
                        className={
                          `flex items-center justify-between gap-4 rounded-lg border-2 p-4 transition-colors ` +
                          (isDragging
                            ? "border-dashed border-sky-400 bg-sky-50/50"
                            : "border-dashed border-slate-200 bg-white")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                            <ImagePlus className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Drag & drop images here</div>
                            <div className="text-xs text-muted-foreground">Or click to choose files (multiple allowed)</div>
                          </div>
                        </div>

                        <div>
                          <input
                            ref={fileInputRef}
                            name="images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFilesChange(e.target.files)}
                            className="sr-only"
                          />
                          <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Choose files
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can select multiple images. Leave empty to keep the
                        current images.
                      </p>
                    </div>
                    {previewImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-4">
                        {previewImages.map((src, i) => (
                          <div
                            key={i}
                            className="relative overflow-hidden rounded-lg border bg-muted shadow-sm"
                          >
                            <img
                              src={src}
                              alt={`preview-${i}`}
                              className="h-28 w-full object-cover"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="absolute right-2 top-2 h-7 w-7 rounded-full bg-white/90 text-xs"
                              onClick={() => {
                                const newPreviews = [...previewImages];
                                newPreviews.splice(i, 1);
                                setPreviewImages(newPreviews);
                                if (selectedFiles.length > 0) {
                                  const newFiles = [...selectedFiles];
                                  newFiles.splice(i, 1);
                                  setSelectedFiles(newFiles);
                                }
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Ingredients + Spices */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ingredients
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 rounded-md border bg-slate-50/70 p-2 max-h-32 overflow-auto">
                          {ingredientList.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              No ingredients yet. Type and press “Add”.
                            </span>
                          )}
                          {ingredientList.map((ing, idx) => (
                            <Badge
                              key={`${ing}-${idx}`}
                              variant="secondary"
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                            >
                              <span>🥬</span>
                              <span>{ing}</span>
                              <button
                                type="button"
                                className="text-[10px] opacity-70"
                                onClick={() =>
                                  setIngredientList((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                ✕
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="relative">
                          <div className="flex gap-2">
                            <Input
                              value={ingredientInput}
                              onChange={(e) =>
                                setIngredientInput(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addIngredient();
                                }
                              }}
                              placeholder="Start typing (e.g. garlic)..."
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addIngredient()}
                            >
                              Add
                            </Button>
                          </div>
                          {ingredientSuggestions.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full rounded-md border bg-white p-2 text-sm shadow-lg">
                              {ingredientSuggestions.map((sug) => (
                                <div
                                  key={sug}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    addIngredient(sug);
                                  }}
                                  className="cursor-pointer rounded px-2 py-1 hover:bg-slate-100"
                                >
                                  {sug}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Spice levels
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-auto rounded-md border bg-slate-50/70 p-2">
                          {spiceList.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              No spice levels yet. Add your own or spawn random.
                            </span>
                          )}
                          {spiceList.map((s, i) => {
                            const intensity = spiceIntensity(s);
                            const anim =
                              intensity >= 4
                                ? "animate-pulse"
                                : intensity === 3
                                ? "animate-bounce"
                                : "";
                            return (
                              <Badge
                                key={`${s}-${i}`}
                                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${spicePillClass(s)} ${anim} transform-gpu transition-all duration-150 hover:scale-105`}
                              >
                                <span className="font-semibold">{s}</span>
                                <button
                                  type="button"
                                  className="text-[10px] opacity-70"
                                  onClick={() => removeSpice(i)}
                                >
                                  ✕
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={spiceInput}
                            onChange={(e) => setSpiceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSpice();
                              }
                            }}
                            placeholder="Type a level (e.g. Fiery)..."
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addSpice()}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={spawnRandom}
                          >
                            Random
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Tip: use fun names like “Smoky”, “Fiery” – customers
                          love it!
                        </p>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="sticky bottom-0 z-40 w-full border-t bg-white/90 px-6 py-3 backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Switch
                        checked={availableState}
                        onCheckedChange={(v) => setAvailableState(!!v)}
                        className="h-6 w-11"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {availableState ? "Available" : "Hidden"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          const f = formRef.current;
                          if (f?.requestSubmit) f.requestSubmit();
                          else f?.submit();
                        }}
                      >
                        {editingItem ? "Update item" : "Add item"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* status messages */}
      {isLoading && (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Loading your menu… hang on a second.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && allItemsEmpty && (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
            <ImagePlus className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="font-medium">No menu items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by adding your first dish. You can upload photos and mark it
              as available.
            </p>
          </div>
          <Button className="gap-2 rounded-full" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add your first item
          </Button>
        </Card>
      )}

      {/* Category sections */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryItems = menuItems.filter(
            (item) => item.category === category
          );
          if (categoryItems.length === 0) return null;

          return (
            <Card key={category} className="border-none bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {category}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {categoryItems.length} item
                  {categoryItems.length > 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-background/80 p-1 backdrop-blur">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ImagePlus className="h-10 w-10" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {item.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {item.subCategory && (
                              <Badge
                                variant="outline"
                                className="rounded-full px-2 py-0.5 text-[10px]"
                              >
                                {item.subCategory}
                              </Badge>
                            )}
                            <span className="text-[11px] font-medium">
                              {item.available ? (
                                <span className="text-green-600">Available</span>
                              ) : (
                                <span className="text-red-500">Hidden</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* spice meter */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(item.spiceLevels || []).length > 0 ? (
                            (item.spiceLevels || []).map((s, idx) => {
                              const intensity = spiceIntensity(s || "");
                              const count = Math.max(
                                1,
                                Math.min(5, intensity)
                              );
                              return (
                                <div
                                  key={`${s}-${idx}`}
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${spicePillClass(s)} transform-gpu transition-all duration-150 hover:scale-105`}
                                >
                                  <div className="text-[11px] font-semibold">{s}</div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              No spice level set
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {item.ingredients?.length
                              ? `${item.ingredients.length} ingredient${
                                  item.ingredients.length > 1 ? "s" : ""
                                }`
                              : "No ingredients listed"}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-medium text-orange-600 hover:underline"
                            onClick={() => openEditDialog(item)}
                          >
                            Edit details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
