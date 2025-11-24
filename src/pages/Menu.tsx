import { useState } from "react";
import { Plus, GripVertical, Pencil, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Grilled Chicken Breast",
    description: "Tender chicken breast with herbs and spices",
    price: 8.50,
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400",
    category: "Main Course",
  },
  {
    id: "2",
    name: "Caesar Salad",
    description: "Fresh romaine lettuce with parmesan and croutons",
    price: 5.00,
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
    category: "Appetizers",
  },
  {
    id: "3",
    name: "Chocolate Cake",
    description: "Rich chocolate cake with ganache",
    price: 6.00,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
    category: "Desserts",
  },
];

const categories = ["Appetizers", "Main Course", "Side Dishes", "Desserts", "Beverages"];

export default function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      image: formData.get("image") as string || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
      category: formData.get("category") as string,
    };

    if (editingItem) {
      setMenuItems(menuItems.map(item => item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item));
      toast({
        title: "Item Updated",
        description: "Menu item has been updated successfully.",
      });
    } else {
      setMenuItems([...menuItems, newItem]);
      toast({
        title: "Item Added",
        description: "New menu item has been added successfully.",
      });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "Menu item has been removed.",
    });
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = menuItems.findIndex(item => item.id === draggedItem);
    const targetIndex = menuItems.findIndex(item => item.id === targetId);

    const newItems = [...menuItems];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setMenuItems(newItems);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Organize your catering menu items and pricing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  name="name" 
                  placeholder="Enter item name" 
                  defaultValue={editingItem?.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  name="description" 
                  placeholder="Describe your menu item..." 
                  defaultValue={editingItem?.description}
                  rows={3}
                  required 
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price per Person ($)</Label>
                  <Input 
                    name="price" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    defaultValue={editingItem?.price}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    name="category" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    defaultValue={editingItem?.category}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input 
                  name="image" 
                  type="url" 
                  placeholder="https://example.com/image.jpg" 
                  defaultValue={editingItem?.image}
                />
                <p className="text-xs text-muted-foreground">Leave empty for default image</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingItem ? "Update Item" : "Add Item"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryItems = menuItems.filter(item => item.category === category);
          
          if (categoryItems.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-smooth hover:shadow-card-hover cursor-move"
                    >
                      <div className="absolute left-2 top-2 z-10 rounded bg-background/80 p-1 backdrop-blur">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImagePlus className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        <p className="mt-2 text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
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
