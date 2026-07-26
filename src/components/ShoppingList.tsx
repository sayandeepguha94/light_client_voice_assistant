import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Plus, 
  Check, 
  Trash2, 
  Edit2, 
  CheckSquare, 
  Square, 
  Sparkles, 
  X, 
  ListFilter,
  CheckCircle2,
  ListTodo
} from "lucide-react";

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

const STORAGE_KEY = "jerry_shopping_list_v1";

const DEFAULT_ITEMS: ShoppingItem[] = [
  { id: "1", text: "Organic Milk (1 Gallon)", completed: false, createdAt: Date.now() - 3600000 * 5 },
  { id: "2", text: "Whole Grain Sourdough Bread", completed: true, createdAt: Date.now() - 3600000 * 4 },
  { id: "3", text: "Free Range Eggs (12 pk)", completed: false, createdAt: Date.now() - 3600000 * 3 },
  { id: "4", text: "Fresh Avocados & Bananas", completed: false, createdAt: Date.now() - 3600000 * 2 },
  { id: "5", text: "Dark Roast Coffee Beans", completed: true, createdAt: Date.now() - 3600000 * 1 },
];

interface ShoppingListProps {
  onAddLog?: (type: "info" | "voice" | "error" | "warn" | "device", message: string) => void;
  externalItems?: ShoppingItem[];
  onItemsChange?: (items: ShoppingItem[]) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ 
  onAddLog,
  externalItems,
  onItemsChange
}) => {
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    if (externalItems) return externalItems;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load shopping list from localStorage", e);
    }
    return DEFAULT_ITEMS;
  });

  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Sync external items if supplied
  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
    }
  }, [externalItems]);

  // Fetch from central backend server & poll every 2 seconds for real-time phone <-> desktop sync
  useEffect(() => {
    let isMounted = true;

    const fetchServerItems = async () => {
      try {
        const res = await fetch("/api/shopping-list");
        if (res.ok) {
          const serverData: ShoppingItem[] = await res.json();
          if (Array.isArray(serverData) && isMounted) {
            setItems(prevItems => {
              if (JSON.stringify(serverData) !== JSON.stringify(prevItems)) {
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
                } catch (e) {}
                if (onItemsChange) onItemsChange(serverData);
                return serverData;
              }
              return prevItems;
            });
          }
        }
      } catch (e) {
        // Fallback to localStorage if server is unreachable
      }
    };

    fetchServerItems();
    const interval = setInterval(fetchServerItems, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync with cross-tab / window custom event updates
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to reload shopping list", e);
      }
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("shopping_list_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("shopping_list_updated", handleSync);
    };
  }, []);

  // Save to localStorage AND sync to backend server on change
  const saveItems = (updated: ShoppingItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save shopping list to localStorage", e);
    }

    // Push update to central server so phone and all clients instantly update
    fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: updated })
    }).catch(e => console.error("Failed to sync shopping list to server", e));

    if (onItemsChange) {
      onItemsChange(updated);
    }
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      text: trimmed,
      completed: false,
      createdAt: Date.now()
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    setNewItemText("");
    if (onAddLog) {
      onAddLog("info", `Added "${trimmed}" to shopping list.`);
    }
  };

  const handleToggleComplete = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextState = !item.completed;
        if (onAddLog) {
          onAddLog("info", `Marked "${item.text}" as ${nextState ? "completed" : "pending"}.`);
        }
        return { ...item, completed: nextState };
      }
      return item;
    });
    saveItems(updated);
  };

  const handleDeleteItem = (id: string) => {
    const target = items.find(i => i.id === id);
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
    if (onAddLog && target) {
      onAddLog("info", `Removed "${target.text}" from shopping list.`);
    }
  };

  const handleStartEdit = (item: ShoppingItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      handleDeleteItem(id);
      setEditingId(null);
      return;
    }

    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, text: trimmed };
      }
      return item;
    });
    saveItems(updated);
    setEditingId(null);
    setEditingText("");
    if (onAddLog) {
      onAddLog("info", `Updated shopping item to "${trimmed}".`);
    }
  };

  const handleClearCompleted = () => {
    const completedCount = items.filter(i => i.completed).length;
    if (completedCount === 0) return;
    const updated = items.filter(i => !i.completed);
    saveItems(updated);
    if (onAddLog) {
      onAddLog("info", `Cleared ${completedCount} completed item(s) from shopping list.`);
    }
  };

  const handleMarkAllComplete = () => {
    const allDone = items.every(i => i.completed);
    const updated = items.map(i => ({ ...i, completed: !allDone }));
    saveItems(updated);
    if (onAddLog) {
      onAddLog("info", allDone ? "Marked all items as pending." : "Marked all items as completed.");
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === "active") return !item.completed;
    if (filter === "completed") return item.completed;
    return true;
  });

  const totalCount = items.length;
  const completedCount = items.filter(i => i.completed).length;
  const activeCount = totalCount - completedCount;
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#11131f]/60 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Smart Shopping List
              </h2>
              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                Phone Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Read, edit, and mark items completed anytime from your phone or desktop.
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 px-3.5 py-2 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Completion Rate
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {completedCount} / {totalCount} ({percentDone}%)
            </span>
          </div>
          <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500" 
              style={{ width: `${percentDone}%` }}
            />
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add new item (e.g. Milk, Apples, Bread...)"
            className="w-full bg-slate-900/90 border border-white/15 focus:border-amber-400/70 text-sm text-white placeholder-slate-500 px-4 py-3 rounded-xl focus:outline-none transition-all shadow-inner"
          />
          {newItemText && (
            <button
              type="button"
              onClick={() => setNewItemText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!newItemText.trim()}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Item</span>
        </button>
      </form>

      {/* Filter and Quick Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "active"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filter === "completed"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Done ({completedCount})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 justify-end">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllComplete}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Toggle All</span>
            </button>
          )}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Done
            </button>
          )}
        </div>
      </div>

      {/* Item Rows List */}
      <div className="flex flex-col gap-2 min-h-[220px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-900/30 border border-dashed border-white/10 rounded-xl">
            <ListTodo className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">
              {filter === "completed" 
                ? "No completed items yet." 
                : filter === "active" 
                ? "No pending shopping items!" 
                : "Your shopping list is empty."}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Type an item above to add it to your shopping list.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className={`group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                  item.completed
                    ? "bg-slate-950/40 border-white/5 opacity-70"
                    : "bg-slate-900/70 border-white/10 hover:border-amber-500/30 hover:bg-slate-900/90 shadow-sm"
                }`}
              >
                {/* Checkbox and Text */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(item.id)}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                    title={item.completed ? "Mark as pending" : "Mark as completed"}
                  >
                    {item.completed ? (
                      <CheckSquare className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 group-hover:text-amber-400/70" />
                    )}
                  </button>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-slate-950 border border-amber-500/50 text-sm text-white px-3 py-1.5 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="p-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-md border border-amber-500/30 cursor-pointer"
                        title="Save changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md cursor-pointer"
                        title="Cancel edit"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleToggleComplete(item.id)}
                      className={`text-sm select-none cursor-pointer truncate transition-all ${
                        item.completed
                          ? "line-through text-slate-500 font-normal"
                          : "text-slate-200 font-medium group-hover:text-white"
                      }`}
                    >
                      {item.text}
                    </span>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Edit item text"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Voice Integration Notice */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-300/80">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Voice Quick Command:</strong> Say <em>"Hey Jerry, add [item name] to shopping list"</em> to instantly add items hands-free!
        </span>
      </div>

    </div>
  );
};
