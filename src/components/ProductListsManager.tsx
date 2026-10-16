import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  CheckCircle2, 
  Package, 
  FolderPlus,
  Tag,
  Sparkles,
  ArrowRight,
  Search,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Product, ProductList } from '../types';
import { formatPrice } from '../utils/formatters';

interface ProductListsManagerProps {
  lists: ProductList[];
  products: Product[];
  allCategories?: string[];
  onAddList: (list: ProductList) => void;
  onUpdateList: (list: ProductList) => void;
  onDeleteList: (listId: string) => void;
  onAddCategories?: (cats: string[]) => void;
  onDeleteCategory?: (cat: string) => void;
}

// Helper to parse multiple categories separated by comma, arabic comma, newline, or pipe
const parseCategoriesInput = (raw: string): string[] => {
  return raw
    .split(/[,،\n|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

export const ProductListsManager: React.FC<ProductListsManagerProps> = ({
  lists,
  products,
  allCategories: externalCategories = [],
  onAddList,
  onUpdateList,
  onDeleteList,
  onAddCategories,
  onDeleteCategory
}) => {
  // Master Category Pool state (for local addition if not passed)
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [bulkCategoryInput, setBulkCategoryInput] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // New list form state
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState('');

  // Editing list details & categories
  const [editingList, setEditingList] = useState<ProductList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editNewCatInput, setEditNewCatInput] = useState('');

  // Quick add category inline to an existing list
  const [quickCatListId, setQuickCatListId] = useState<string | null>(null);
  const [quickCatInput, setQuickCatInput] = useState('');

  // Quick link dropdown modal/popover state
  const [linkingCatName, setLinkingCatName] = useState<string | null>(null);

  // Delete confirmation modal state
  const [listToDelete, setListToDelete] = useState<ProductList | null>(null);

  // Success toast/feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Combine all categories across all sources with zero duplicates
  const allCombinedCategories = useMemo(() => {
    const set = new Set<string>();
    externalCategories.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
    localCategories.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
    products.forEach((p) => {
      if (p.categoryLabel && p.categoryLabel.trim()) set.add(p.categoryLabel.trim());
    });
    lists.forEach((l) => {
      (l.categories || []).forEach((c) => {
        if (c && c.trim()) set.add(c.trim());
      });
    });
    return Array.from(set);
  }, [externalCategories, localCategories, products, lists]);

  // Filtered categories for searching in the master pool
  const filteredMasterCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return allCombinedCategories;
    const q = categorySearchQuery.toLowerCase().trim();
    return allCombinedCategories.filter((c) => c.toLowerCase().includes(q));
  }, [allCombinedCategories, categorySearchQuery]);

  // Helper to count products in a given category
  const getCategoryProductCount = (catName: string) => {
    const normalized = catName.trim().toLowerCase();
    return products.filter((p) => {
      const pLabel = (p.categoryLabel || '').trim().toLowerCase();
      const pCat = (p.category || '').trim().toLowerCase();
      return pLabel === normalized || pCat === normalized;
    }).length;
  };

  // Helper to get lists that contain a category
  const getListsWithCategory = (catName: string) => {
    const normalized = catName.trim().toLowerCase();
    return lists.filter((l) =>
      (l.categories || []).some((c) => c.trim().toLowerCase() === normalized)
    );
  };

  // Helper to get all products in a list (via its categories + direct productIds)
  const getProductsInList = (list: ProductList) => {
    const listCats = (list.categories || []).map((c) => c.trim().toLowerCase());
    return products.filter((p) => {
      const pLabel = (p.categoryLabel || '').trim().toLowerCase();
      const pCat = (p.category || '').trim().toLowerCase();
      const matchesCategory = listCats.includes(pLabel) || listCats.includes(pCat);
      const matchesDirectId = list.productIds?.includes(p.id);
      return matchesCategory || matchesDirectId;
    });
  };

  // Add multiple categories at once into Master Pool (Unlimited)
  const handleAddBulkCategories = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = parseCategoriesInput(bulkCategoryInput);
    if (parsed.length === 0) return;

    if (onAddCategories) {
      onAddCategories(parsed);
    } else {
      setLocalCategories((prev) => Array.from(new Set([...prev, ...parsed])));
    }

    showSuccess(`تمت إضافة (${parsed.length}) أقسام جديدة بنجاح وبدون أي قيود!`);
    setBulkCategoryInput('');
  };

  // Delete a category from Master Pool
  const handleDeleteCategory = (cat: string) => {
    if (onDeleteCategory) {
      onDeleteCategory(cat);
    } else {
      setLocalCategories((prev) => prev.filter((c) => c !== cat));
      // Remove from lists
      lists.forEach((l) => {
        if (l.categories?.includes(cat)) {
          onUpdateList({
            ...l,
            categories: l.categories.filter((c) => c !== cat)
          });
        }
      });
    }
    showSuccess(`تم حذف قسم "${cat}"`);
  };

  // Toggle linking a category to a specific list
  const handleToggleCategoryInList = (list: ProductList, catName: string) => {
    const currentCats = list.categories || [];
    const isIncluded = currentCats.includes(catName);
    const updatedCats = isIncluded
      ? currentCats.filter((c) => c !== catName)
      : [...currentCats, catName];

    onUpdateList({
      ...list,
      categories: updatedCats
    });
    showSuccess(
      isIncluded
        ? `تم فصل قسم "${catName}" عن قائمة "${list.name}"`
        : `تم ربط قسم "${catName}" بقائمة "${list.name}" بنجاح!`
    );
  };

  // Handle creating a new list with categories
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    // Also include any categories typed in the inline field
    const extraCats = parseCategoriesInput(newCatInput);
    const finalCategories = Array.from(new Set([...selectedCategories, ...extraCats]));

    const newList: ProductList = {
      id: `list-${Date.now()}`,
      name: newListName.trim(),
      description: newListDesc.trim() || undefined,
      categories: finalCategories,
      productIds: [],
      createdAt: new Date().toISOString()
    };

    onAddList(newList);
    if (extraCats.length > 0 && onAddCategories) {
      onAddCategories(extraCats);
    }

    showSuccess(`تم إنشاء قائمة "${newList.name}" بنجاح وتضم (${finalCategories.length}) أقسام!`);
    setNewListName('');
    setNewListDesc('');
    setSelectedCategories([]);
    setNewCatInput('');
    setIsCreating(false);
  };

  // Handle adding bulk categories into the list creation form
  const handleAddBulkToCreation = () => {
    const parsed = parseCategoriesInput(newCatInput);
    if (parsed.length === 0) return;
    setSelectedCategories((prev) => Array.from(new Set([...prev, ...parsed])));
    if (onAddCategories) {
      onAddCategories(parsed);
    }
    setNewCatInput('');
  };

  const toggleCategoryInCreation = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Start editing a list
  const handleStartEdit = (list: ProductList) => {
    setEditingList(list);
    setEditName(list.name);
    setEditDesc(list.description || '');
    setEditCategories(list.categories || []);
    setEditNewCatInput('');
  };

  // Save edited list
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList || !editName.trim()) return;

    const extraCats = parseCategoriesInput(editNewCatInput);
    const finalCategories = Array.from(new Set([...editCategories, ...extraCats]));

    onUpdateList({
      ...editingList,
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      categories: finalCategories
    });

    if (extraCats.length > 0 && onAddCategories) {
      onAddCategories(extraCats);
    }

    showSuccess(`تم حفظ تعديل قائمة "${editName.trim()}"`);
    setEditingList(null);
  };

  const handleAddBulkToEdit = () => {
    const parsed = parseCategoriesInput(editNewCatInput);
    if (parsed.length === 0) return;
    setEditCategories((prev) => Array.from(new Set([...prev, ...parsed])));
    if (onAddCategories) {
      onAddCategories(parsed);
    }
    setEditNewCatInput('');
  };

  const toggleCategoryInEdit = (cat: string) => {
    setEditCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Quick remove category from list card directly
  const handleRemoveCategoryFromList = (list: ProductList, categoryToRemove: string) => {
    const updatedCats = (list.categories || []).filter((c) => c !== categoryToRemove);
    onUpdateList({
      ...list,
      categories: updatedCats
    });
    showSuccess(`تم حذف قسم "${categoryToRemove}" من قائمة "${list.name}"`);
  };

  // Quick add multiple categories inline to an existing list
  const handleQuickAddCategory = (list: ProductList) => {
    const parsed = parseCategoriesInput(quickCatInput);
    if (parsed.length === 0) return;
    const currentCats = list.categories || [];
    const updatedCats = Array.from(new Set([...currentCats, ...parsed]));

    onUpdateList({
      ...list,
      categories: updatedCats
    });

    if (onAddCategories) {
      onAddCategories(parsed);
    }

    showSuccess(`تمت إضافة (${parsed.length}) أقسام إلى قائمة "${list.name}" بنجاح!`);
    setQuickCatInput('');
    setQuickCatListId(null);
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Top Banner explaining the 2-Tier Unlimited Structure */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#121217] p-5 sm:p-6 rounded-2xl border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
            <Layers className="w-4 h-4" />
            <span>نظام الأقسام والقوائم غير المحدودة</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            إدارة الأقسام والقوائم وتوزيعها بكل حرية
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
            يمكنك إنشاء **عدد غير محدود من الأقسام** دفعة واحدة (مفصولة بفواصل)، وإنشاء **عدد غير محدود من القوائم** وربطها معاً لتظهر لزبائنك بأعلى درجات الترتيب.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-black gold-gradient-bg rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 fill-black" />}
          <span>{isCreating ? 'إلغاء' : 'إنشاء قائمة جديدة'}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ================= SECTION 1: MASTER UNLIMITED CATEGORIES HUB ================= */}
      <div className="bg-[#14141C] border border-[#D4AF37]/35 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Tag className="w-4 h-4 text-[#D4AF37]" />
              <span>بنك الأقسام والتصنيفات الشامل (غير محدود)</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              أضف أقسام متجرك هنا (اكتب عدة أقسام مفصولة بفارزة مثل: ساعات، عطور، أحذية، ملابس) وستتاح فوراً في كافة القوائم وإضافة المنتجات.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-[#F3E5AB] bg-[#1E1E2A] px-3 py-1 rounded-lg border border-[#D4AF37]/30 shrink-0 self-start sm:self-auto">
            {allCombinedCategories.length} قسم متوفر
          </span>
        </div>

        {/* Bulk Category Addition Form */}
        <form onSubmit={handleAddBulkCategories} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="اكتب أسماء الأقسام مفصولة بفارزة (مثال: ساعات، عطور، ملابس رجالية، ملابس نسائية، أحذية، نظارات، حقائب، إكسسوارات)..."
              value={bulkCategoryInput}
              onChange={(e) => setBulkCategoryInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#181822] border border-neutral-700 focus:border-[#D4AF37] rounded-xl text-white text-xs outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!bulkCategoryInput.trim()}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold text-xs rounded-xl transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة الأقسام فوراً</span>
          </button>
        </form>

        {/* Search Categories in Pool if many */}
        {allCombinedCategories.length > 6 && (
          <div className="relative pt-1">
            <input
              type="text"
              placeholder="ابحث في الأقسام المضافة..."
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-[#181822] border border-neutral-800 focus:border-[#D4AF37] rounded-lg text-white text-xs outline-none"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        )}

        {/* Master Categories Grid / Chips */}
        {allCombinedCategories.length === 0 ? (
          <div className="p-4 bg-[#181824] rounded-xl text-center text-xs text-neutral-400">
            لم تقم بإضافة أقسام بعد. اكتب أول أقسام لمتجرك في الصندوق أعلاه واضغط على "إضافة الأقسام فوراً".
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 max-h-56 overflow-y-auto p-1 scrollbar-thin">
            {filteredMasterCategories.map((cat) => {
              const prodCount = getCategoryProductCount(cat);
              const linkedLists = getListsWithCategory(cat);
              const isLinkingThis = linkingCatName === cat;

              return (
                <div
                  key={cat}
                  className="group relative flex items-center gap-2 px-3 py-1.5 bg-[#181824] hover:bg-[#1E1E2C] border border-neutral-700 hover:border-[#D4AF37] rounded-xl text-xs font-semibold text-white transition-all shadow-sm"
                >
                  <span className="text-[#F3E5AB] font-bold">{cat}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">({prodCount} منتج)</span>

                  {/* Which lists this category is linked to */}
                  {linkedLists.length > 0 ? (
                    <span 
                      onClick={() => setLinkingCatName(isLinkingThis ? null : cat)}
                      className="text-[9px] bg-[#2A261A] text-[#F3E5AB] px-1.5 py-0.5 rounded border border-[#D4AF37]/40 cursor-pointer"
                      title={linkedLists.map((l) => l.name).join('، ')}
                    >
                      {linkedLists.length} قوائم
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLinkingCatName(isLinkingThis ? null : cat)}
                      className="text-[9px] bg-neutral-800 hover:bg-[#D4AF37] hover:text-black text-neutral-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      title="ربط هذا القسم بقائمة"
                    >
                      + ربط بقائمة
                    </button>
                  )}

                  {/* Delete category button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-neutral-500 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                    title={`حذف قسم ${cat}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Dropdown to link/unlink to lists */}
                  {isLinkingThis && (
                    <div className="absolute top-full right-0 mt-1 z-30 w-52 bg-[#121218] border border-[#D4AF37] rounded-xl p-2 shadow-2xl space-y-1 animate-fade-in text-right">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#F3E5AB] pb-1 border-b border-neutral-800">
                        <span>ربط قسم: {cat}</span>
                        <button onClick={() => setLinkingCatName(null)} className="text-neutral-400 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {lists.length === 0 ? (
                        <p className="text-[10px] text-neutral-400 p-1">لا توجد قوائم منشأة بعد.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {lists.map((list) => {
                            const isLinked = (list.categories || []).includes(cat);
                            return (
                              <button
                                key={list.id}
                                type="button"
                                onClick={() => handleToggleCategoryInList(list, cat)}
                                className={`w-full text-right px-2 py-1 rounded text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  isLinked
                                    ? 'bg-[#2A261A] text-[#F3E5AB]'
                                    : 'hover:bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                <span className="truncate">{list.name}</span>
                                <span>{isLinked ? '✓' : '+'}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= CREATE NEW LIST FORM ================= */}
      {isCreating && (
        <div className="bg-[#15151E] border-2 border-[#D4AF37]/50 rounded-2xl p-5 sm:p-7 space-y-5 animate-fade-in">
          <div className="border-b border-neutral-800 pb-3">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#D4AF37]" />
              <span>إنشاء قائمة جديدة وربط الأقسام بها (غير محدود)</span>
            </h4>
            <span className="text-xs text-neutral-400">
              حدد اسم القائمة واختر الأقسام التي تتبع لها أو اكتب أقساماً جديدة لإضافتها فوراً.
            </span>
          </div>

          <form onSubmit={handleCreateList} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  اسم القائمة (مثال: أزياء وموضة، عطور وساعات، هدايا فاخرة) <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="اكتب اسم القائمة..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1C26] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  وصف مختصر للقائمة (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: تشكيلة فاخرة مختارة بعناية..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1C26] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none"
                />
              </div>
            </div>

            {/* Link Categories to this List */}
            <div className="bg-[#121218] p-4 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-200 font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>الأقسام المندرجة تحت هذه القائمة ({selectedCategories.length} محددة):</span>
                </span>
                <span className="text-[11px] text-neutral-400">
                  انقر على القسم لإضافته للقائمة
                </span>
              </div>

              {/* Existing Categories Selection */}
              {allCombinedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
                  {allCombinedCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    const prodCount = getCategoryProductCount(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategoryInCreation(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37] shadow-sm'
                            : 'bg-[#181822] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-[#D4AF37] text-black font-bold' : 'border border-neutral-600'
                        }`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                        <span>{cat}</span>
                        <span className="text-[10px] opacity-75 font-mono">({prodCount})</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 py-1">
                  لا توجد أقسام سابقة. اكتب أسماء الأقسام بالأسفل لإضافتها لهذه القائمة فوراً:
                </p>
              )}

              {/* Add Multiple Custom Categories on the fly */}
              <div className="pt-2 border-t border-neutral-800 flex gap-2">
                <input
                  type="text"
                  placeholder="كتابة أقسام جديدة (يمكنك كتابة عدة أقسام مفصولة بفارزة مثل: ساعات، نظارات، أحذية)..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBulkToCreation();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-[#181822] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBulkToCreation}
                  disabled={!newCatInput.trim()}
                  className="px-4 py-2 bg-[#252538] hover:bg-[#2F2F45] text-[#F3E5AB] text-xs font-bold rounded-lg border border-neutral-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 font-bold text-black gold-gradient-bg rounded-xl hover:brightness-110 shadow-md cursor-pointer"
              >
                إنشاء وحفظ القائمة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= LISTS DISPLAY ================= */}
      {lists.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#111116] rounded-2xl border border-neutral-800">
          <div className="w-12 h-12 rounded-full bg-[#181822] border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37]">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">لا توجد قوائم مخصصة حالياً</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
            انقر على زر "إنشاء قائمة جديدة" لإنشاء قائمتك الأولى وربط الأقسام بها لتبدو واجهة المتجر مرتبة واحترافية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map((list) => {
            const listCats = list.categories || [];
            const listProducts = getProductsInList(list);
            const isAddingQuickCat = quickCatListId === list.id;

            return (
              <div
                key={list.id}
                className="bg-[#121218] border border-neutral-800 hover:border-[#D4AF37]/50 rounded-2xl p-5 space-y-4 transition-all shadow-sm"
              >
                {/* List Header */}
                <div className="flex items-start justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{list.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A261A] text-[#F3E5AB] border border-[#D4AF37]/40">
                        {listCats.length} أقسام • {listProducts.length} منتجات
                      </span>
                    </div>
                    {list.description && (
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        {list.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(list)}
                      className="p-1.5 bg-[#181822] hover:bg-[#222230] text-neutral-300 hover:text-[#D4AF37] border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="تعديل اسم ووصف وأقسام القائمة"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setListToDelete(list)}
                      className="p-1.5 bg-[#181822] hover:bg-[#281818] text-neutral-400 hover:text-red-400 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذه القائمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Categories inside this List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>الأقسام المندرجة بالقائمة:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickCatListId(isAddingQuickCat ? null : list.id);
                        setQuickCatInput('');
                      }}
                      className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingQuickCat ? 'إغلاق' : 'إضافة أقسام'}</span>
                    </button>
                  </div>

                  {/* Inline quick add category form (supports comma-separated multiple categories) */}
                  {isAddingQuickCat && (
                    <div className="p-2.5 bg-[#171722] rounded-xl border border-[#D4AF37]/40 flex gap-2 animate-fade-in">
                      <input
                        type="text"
                        autoFocus
                        placeholder="اكتب أقسام لإضافتها (مفصولة بفارزة مثل: ساعات، عطور)..."
                        value={quickCatInput}
                        onChange={(e) => setQuickCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddCategory(list);
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-[#12121A] border border-neutral-700 rounded-lg text-white text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddCategory(list)}
                        disabled={!quickCatInput.trim()}
                        className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        إضافة
                      </button>
                    </div>
                  )}

                  {/* Categories Pills */}
                  {listCats.length === 0 ? (
                    <div className="p-3 bg-[#161620] rounded-xl text-center text-neutral-400 text-xs">
                      لم يتم ربط أي أقسام بهذه القائمة بعد. انقر على "إضافة أقسام" لربط أول قسم.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {listCats.map((cat) => {
                        const count = getCategoryProductCount(cat);
                        return (
                          <div
                            key={cat}
                            className="group flex items-center gap-1.5 px-2.5 py-1 bg-[#1C1C26] border border-[#D4AF37]/35 rounded-lg text-xs font-semibold text-[#F3E5AB]"
                          >
                            <span>{cat}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({count})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCategoryFromList(list, cat)}
                              className="text-neutral-500 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                              title={`إزالة قسم ${cat} من هذه القائمة`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Thumbnails of products inside this list */}
                {listProducts.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800/60 space-y-1.5">
                    <span className="text-[11px] text-neutral-400 block">
                      عينة من المنتجات المعروضة تلقائياً في هذه القائمة:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {listProducts.slice(0, 8).map((p) => (
                        <div
                          key={p.id}
                          className="relative w-11 h-11 rounded-lg overflow-hidden border border-neutral-700 bg-black shrink-0 p-0.5"
                          title={`${p.name} - قسم: ${p.categoryLabel}`}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                      {listProducts.length > 8 && (
                        <div className="w-11 h-11 rounded-lg bg-[#1C1C28] border border-neutral-700 flex items-center justify-center text-[11px] font-bold text-[#F3E5AB] shrink-0 font-mono">
                          +{listProducts.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تظهر في متجر الزبائن مباشرة</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(list)}
                    className="px-3 py-1 bg-[#1A1A26] hover:bg-[#252535] text-white rounded-lg border border-neutral-700 font-medium transition-colors cursor-pointer"
                  >
                    تعديل الأقسام ({listCats.length})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EDIT LIST MODAL ================= */}
      {editingList && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setEditingList(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#121218] border border-[#D4AF37]/50 rounded-2xl p-6 space-y-4 text-right shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h4 className="text-base font-bold text-white">تعديل اسم وأقسام القائمة</h4>
              <button onClick={() => setEditingList(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">اسم القائمة</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1C26] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">الوصف (اختياري)</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#1C1C26] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none resize-none"
                />
              </div>

              {/* Manage categories in edit modal */}
              <div className="bg-[#171722] p-3.5 rounded-xl border border-neutral-800 space-y-2.5">
                <label className="block text-neutral-300 font-bold">
                  الأقسام التابعة لهذه القائمة ({editCategories.length} محددة):
                </label>

                {allCombinedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto">
                    {allCombinedCategories.map((cat) => {
                      const isIncluded = editCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleCategoryInEdit(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isIncluded
                              ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37]'
                              : 'bg-[#14141C] text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                        >
                          <span>{isIncluded ? '✓' : '+'}</span>
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-neutral-800">
                  <input
                    type="text"
                    placeholder="إضافة أقسام جديدة (مفصولة بفارزة)..."
                    value={editNewCatInput}
                    onChange={(e) => setEditNewCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBulkToEdit();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#12121A] border border-neutral-700 rounded-lg text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBulkToEdit}
                    disabled={!editNewCatInput.trim()}
                    className="px-3 py-1.5 bg-[#252538] hover:bg-[#2F2F45] text-[#F3E5AB] text-xs font-bold rounded-lg border border-neutral-700 disabled:opacity-50 cursor-pointer"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingList(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE LIST CONFIRMATION MODAL ================= */}
      {listToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setListToDelete(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#14141C] border border-red-500/50 rounded-2xl p-6 space-y-4 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-white">تأكيد حذف القائمة</h4>
              <p className="text-xs text-neutral-300">
                هل أنت متأكد من حذف قائمة <strong className="text-[#F3E5AB]">"{listToDelete.name}"</strong>؟
              </p>
              <p className="text-[11px] text-neutral-400">
                لن يتم حذف المنتجات أو الأقسام؛ فقط سيتم إزالة تصنيف هذه القائمة من المتجر.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setListToDelete(null)}
                className="py-2.5 px-4 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                تراجع وإلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteList(listToDelete.id);
                  showSuccess(`تم حذف قائمة "${listToDelete.name}" بنجاح`);
                  setListToDelete(null);
                }}
                className="py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                نعم، احذف القائمة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
