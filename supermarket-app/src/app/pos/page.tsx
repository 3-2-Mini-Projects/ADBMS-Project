"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context";
import { POSCartItem, Product, Customer } from "@/lib/types";
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Star,
  Printer,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Tag,
  User,
  Percent,
} from "lucide-react";

export default function POSPage() {
  const { currentBranch, currentEmployee, showToast } = useApp();

  // Search & Catalog State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cart State
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Customer Loyalty State
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Payment & Checkout Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE">("CASH");
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [cardReference, setCardReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount and F2 key shortcut
  useEffect(() => {
    barcodeInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Categories
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  // Fetch Products based on search and category
  const fetchProducts = async () => {
    if (!currentBranch) return;
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        branchId: String(currentBranch.branch_id),
      });
      if (search.trim()) params.append("search", search.trim());
      if (selectedCategory) params.append("categoryId", String(selectedCategory));

      const res = await fetch(`/api/pos/products?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error("Error searching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, currentBranch]);

  // Handle barcode exact scan/enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    // Check if any product matches barcode exactly
    const exact = products.find((p) => p.barcode === search.trim());
    if (exact) {
      addToCart(exact);
      setSearch("");
    } else if (products.length === 1) {
      addToCart(products[0]);
      setSearch("");
    } else {
      showToast("Searching for product...", "info");
    }
  };

  // Add item to cart
  const addToCart = (product: Product) => {
    const stockAvailable = Number(product.quantity_on_hand ?? (product as any).stock_available ?? 99);
    const existing = cart.find((item) => item.product_id === product.product_id);

    if (existing) {
      if (existing.quantity >= stockAvailable) {
        showToast(`Cannot add more than ${stockAvailable} available units.`, "warning");
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      showToast(`Updated ${product.name} quantity to ${existing.quantity + 1}`, "success");
    } else {
      if (stockAvailable <= 0) {
        showToast(`"${product.name}" is out of stock in this branch.`, "warning");
        return;
      }

      // Check promo discount
      let discountAmount = 0;
      if ((product as any).promo_discount_percent) {
        const pct = Number((product as any).promo_discount_percent);
        discountAmount = (Number(product.unit_price) * pct) / 100;
      }

      const newItem: POSCartItem = {
        product_id: product.product_id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        unit_price: Number(product.unit_price),
        cost_price: Number(product.cost_price || 0),
        tax_rate: Number(product.tax_rate || 0),
        quantity: 1,
        discount_amount: discountAmount,
        stock_available: stockAvailable,
      };

      setCart((prev) => [...prev, newItem]);
      showToast(`Added ${product.name} to cart`, "success");
    }
  };

  // Update Cart Quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock_available) {
              showToast(`Maximum available stock reached (${item.stock_available})`, "warning");
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as POSCartItem[]
    );
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPointsToRedeem(0);
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // Financial Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const lineDiscounts = cart.reduce((sum, item) => sum + item.quantity * item.discount_amount, 0);
  const basketCouponDiscount = appliedCoupon ? subtotal * 0.1 : 0; // 10% coupon sample or calculated
  const totalDiscount = lineDiscounts + basketCouponDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const standardTax = taxableAmount * 0.18; // 18% standard VAT/Sales Tax
  const totalDue = Math.max(0, taxableAmount + standardTax);

  // Loyalty Point Spend Calculations
  const customerBalance = Number(selectedCustomer?.points_balance || 0);
  const maxRedeemablePoints = selectedCustomer
    ? Math.min(customerBalance, Math.floor(totalDue))
    : 0;
  const effectivePointsToRedeem = Math.max(0, Math.min(pointsToRedeem, maxRedeemablePoints));
  const pointsDiscountValue = effectivePointsToRedeem; // 1 pt = Rs. 1.00
  const netDue = Math.max(0, Number((totalDue - pointsDiscountValue).toFixed(2)));

  const handleSetPointsToRedeem = (pts: number) => {
    const valid = Math.max(0, Math.min(Math.floor(pts || 0), maxRedeemablePoints));
    setPointsToRedeem(valid);
    const newNetDue = Math.max(0, Number((totalDue - valid).toFixed(2)));
    if (paymentMethod === "CASH") {
      setCashTendered(newNetDue.toFixed(2));
    }
  };

  // Customer Lookup
  const lookupCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSearch.trim()) return;
    setLookingUpCustomer(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch.trim())}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSelectedCustomer(data[0]);
        setPointsToRedeem(0);
        showToast(`Customer identified: ${data[0].full_name} (${data[0].tier} Tier)`, "success");
        setCustomerSearch("");
      } else {
        showToast("Customer card or phone not found.", "warning");
      }
    } catch {
      showToast("Error looking up customer.", "error");
    } finally {
      setLookingUpCustomer(false);
    }
  };

  // Apply Coupon
  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    setAppliedCoupon(couponCode.trim().toUpperCase());
    showToast(`Coupon "${couponCode.trim().toUpperCase()}" applied!`, "success");
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      showToast("Cart is empty!", "warning");
      return;
    }
    setPointsToRedeem(0);
    setCashTendered(totalDue.toFixed(2));
    setPaymentMethod("CASH");
    setPaymentModalOpen(true);
  };

  // Execute Transaction Checkout
  const executeCheckout = async () => {
    if (!currentBranch || !currentEmployee) {
      showToast("Branch and Cashier must be selected", "error");
      return;
    }

    const tenderedNum = Number(cashTendered || netDue);
    if (netDue > 0 && paymentMethod === "CASH" && tenderedNum < netDue) {
      showToast(`Tendered cash (Rs. ${tenderedNum.toFixed(2)}) is less than net amount due (Rs. ${netDue.toFixed(2)})!`, "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payments payload supporting split payment (POINTS + CASH/CARD/MOBILE)
      const payments: Array<{ method: "CASH" | "CARD" | "MOBILE" | "POINTS"; amount: number; reference?: string | null }> = [];
      
      // 1. Loyalty Points portion
      if (effectivePointsToRedeem > 0) {
        payments.push({
          method: "POINTS",
          amount: effectivePointsToRedeem,
          reference: `PTS-REDEEM-${selectedCustomer?.card_no || "CUST"}`,
        });
      }

      // 2. Remaining net due portion
      if (netDue > 0) {
        payments.push({
          method: paymentMethod,
          amount: netDue,
          reference: paymentMethod === "CARD" ? cardReference || "CARD-APPROVED" : null,
        });
      } else if (payments.length === 0) {
        payments.push({
          method: "CASH",
          amount: 0,
        });
      }

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: currentBranch.branch_id,
          cashier_id: currentEmployee.employee_id,
          customer_id: selectedCustomer?.customer_id || null,
          coupon_code: appliedCoupon,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            discount_amount: i.discount_amount,
          })),
          payments,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(`Sale #SALE-${result.sale_id} completed successfully!`, "success");
        setReceiptData({
          ...result.receipt,
          branch_name: currentBranch.name,
          branch_address: currentBranch.address,
          branch_phone: currentBranch.phone,
          cashier_name: currentEmployee.full_name,
          customer_name: selectedCustomer?.full_name,
          customer_card: selectedCustomer?.card_no,
          points_redeemed: result.receipt.points_redeemed ?? effectivePointsToRedeem,
          earned_points: result.receipt.earned_points ?? 0,
          new_points_balance: result.receipt.new_points_balance,
          net_due: netDue,
          tendered: netDue > 0 && paymentMethod === "CASH" ? tenderedNum : totalDue,
          change: netDue > 0 && paymentMethod === "CASH" ? Math.max(0, tenderedNum - netDue) : 0,
        });
        setPaymentModalOpen(false);
        setReceiptModalOpen(true);
        clearCart();
        fetchProducts(); // refresh inventory
      } else {
        showToast(result.error || "Checkout failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Checkout failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      {/* LEFT COLUMN: Product Catalog & Touch Barcode Register */}
      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-5 overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Top Search & Barcode Scan Bar */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan barcode or type product name... (Press F2 to focus)"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-white placeholder-slate-500 transition-all font-mono"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-800/80 shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            }`}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setSelectedCategory(c.category_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === c.category_id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loadingProducts ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
              <Sparkles className="w-5 h-5 animate-spin text-blue-400 mr-2" />
              Loading inventory catalog...
            </div>
          ) : products.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Barcode className="w-8 h-8 text-slate-600" />
              <span>No products matching your search in this branch</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((prod) => {
                const stock = Number((prod as any).stock_available ?? 0);
                const isOutOfStock = stock <= 0;
                const promoPct = (prod as any).promo_discount_percent;

                return (
                  <button
                    key={prod.product_id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`relative p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                      isOutOfStock
                        ? "bg-slate-900/30 border-slate-800/40 opacity-40 cursor-not-allowed"
                        : "bg-slate-950/70 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/40 hover:scale-[1.02] active:scale-[0.98] shadow-md"
                    }`}
                  >
                    {promoPct && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        -{promoPct}%
                      </span>
                    )}

                    <div>
                      <div className="text-[10px] font-mono text-slate-500">{prod.barcode}</div>
                      <div className="text-xs font-bold text-white line-clamp-2 mt-0.5 group-hover:text-blue-300 transition-colors">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {prod.brand || (prod as any).category_name || "General"}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="font-mono text-xs font-black text-emerald-400">
                        Rs. {Number(prod.unit_price).toFixed(2)}
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          stock <= 5
                            ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isOutOfStock ? "0 Qty" : `${stock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Loyalty & Fast Checkout Panel */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">Current Cart Register</div>
              <div className="text-[10px] text-slate-400">
                Cashier: {currentEmployee?.full_name ?? "Kamala"} • Branch: {currentBranch?.branch_code}
              </div>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Customer Loyalty Strip */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/60">
          {!selectedCustomer ? (
            <form onSubmit={lookupCustomer} className="flex items-center gap-2">
              <div className="relative flex-1">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Loyalty card / Phone (e.g. C0001)..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={lookingUpCustomer}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Lookup
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-blue-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{selectedCustomer.full_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {selectedCustomer.tier}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Card: {selectedCustomer.card_no} • {selectedCustomer.points_balance} pts available
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-500 hover:text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <ShoppingCart className="w-8 h-8 text-slate-600" />
              <span>Cart is empty. Scan barcodes or tap items.</span>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.quantity * item.unit_price - item.quantity * item.discount_amount;
              return (
                <div
                  key={item.product_id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>Rs. {item.unit_price.toFixed(2)}</span>
                      {item.discount_amount > 0 && (
                        <span className="text-rose-400">(-Rs. {item.discount_amount.toFixed(2)})</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      Rs. {lineTotal.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-500 hover:text-rose-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Coupons & Calculation Summary */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-3">
          {/* Coupon Entry */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code (e.g. DAIRY10)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 font-mono uppercase"
              />
            </div>
            <button
              onClick={applyCoupon}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
            >
              Apply
            </button>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-1 text-xs text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Gross Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="font-mono text-slate-200">Rs. {subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discounts & Promotions</span>
                <span className="font-mono">-Rs. {totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {effectivePointsToRedeem > 0 && (
              <div className="flex justify-between text-purple-400 font-bold">
                <span>Loyalty Point Discount ({effectivePointsToRedeem} pts)</span>
                <span className="font-mono">-Rs. {effectivePointsToRedeem.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Estimated Tax (18% VAT)</span>
              <span className="font-mono text-slate-200">Rs. {standardTax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-800 my-1.5" />
            <div className="flex justify-between text-base font-extrabold text-white">
              <span>{effectivePointsToRedeem > 0 ? "Remaining Purchase Value" : "Total Due"}</span>
              <span className={`font-mono ${effectivePointsToRedeem > 0 ? "text-purple-400" : "text-emerald-400"}`}>
                Rs. {netDue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout Action Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
              cart.length === 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 hover:scale-[1.01] active:scale-[0.99]"
            }`}
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL 1: Payment & Tender Details */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Tender & Payment</h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Gross Purchase Value</span>
                <span className="font-mono text-slate-200 font-semibold">Rs. {totalDue.toFixed(2)}</span>
              </div>
              {effectivePointsToRedeem > 0 && (
                <div className="flex items-center justify-between text-xs text-purple-400 font-semibold bg-purple-950/30 px-2 py-1 rounded border border-purple-500/20">
                  <span>Loyalty Point Discount ({effectivePointsToRedeem} pts):</span>
                  <span className="font-mono font-bold">-Rs. {effectivePointsToRedeem.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300">Remaining Purchase Value</span>
                  <div className="text-[10px] text-slate-400">Payable amount after points discount</div>
                </div>
                <span className={`text-2xl font-black font-mono ${netDue === 0 ? "text-purple-400" : "text-emerald-400"}`}>
                  Rs. {netDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Loyalty Points Redemption Card */}
            {selectedCustomer && (
              <div className="bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
                    <span className="text-xs font-bold text-white">Loyalty Points Redemption</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {selectedCustomer.tier} TIER
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {selectedCustomer.full_name} ({selectedCustomer.card_no})
                  </span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {customerBalance} pts available (Rs. {customerBalance.toFixed(2)})
                  </span>
                </div>

                {customerBalance > 0 ? (
                  <div className="space-y-2.5 pt-1 border-t border-purple-500/20">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Redeem Points (Full or Partial):</span>
                      <span className="font-mono font-bold text-purple-300">
                        {effectivePointsToRedeem > 0 ? `${effectivePointsToRedeem} pts = -Rs. ${effectivePointsToRedeem.toFixed(2)}` : "None"}
                      </span>
                    </div>

                    {/* Full vs Partial Selection Controls */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetPointsToRedeem(0)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          effectivePointsToRedeem === 0
                            ? "bg-slate-700 text-white border-slate-500"
                            : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
                        }`}
                      >
                        None (0 pts)
                      </button>

                      {/* Full payment button if customer has enough points to cover the entire bill */}
                      {customerBalance >= Math.floor(totalDue) && (
                        <button
                          type="button"
                          onClick={() => handleSetPointsToRedeem(Math.floor(totalDue))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                            effectivePointsToRedeem === Math.floor(totalDue)
                              ? "bg-emerald-600 text-white border-emerald-400"
                              : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60"
                          }`}
                        >
                          🛍️ Buy with Points ({Math.floor(totalDue)} pts = Pay Rs. 0)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPointsToRedeem(maxRedeemablePoints)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            effectivePointsToRedeem === maxRedeemablePoints
                              ? "bg-purple-600 text-white border-purple-400"
                              : "bg-purple-900/50 text-purple-200 border-purple-700 hover:bg-purple-800"
                          }`}
                        >
                          Use All Available ({maxRedeemablePoints} pts)
                        </button>
                      )}
                    </div>

                    {/* Custom Points Input — Redeem any valid amount of points */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max={maxRedeemablePoints}
                          value={pointsToRedeem || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              handleSetPointsToRedeem(0);
                              return;
                            }
                            const num = parseInt(val, 10);
                            if (isNaN(num)) return;
                            const clamped = Math.max(0, Math.min(num, maxRedeemablePoints));
                            handleSetPointsToRedeem(clamped);
                          }}
                          placeholder={`Enter any points to redeem (1 - ${maxRedeemablePoints})...`}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono placeholder-slate-500 focus:border-purple-500"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">pts</span>
                      {effectivePointsToRedeem > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetPointsToRedeem(0)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>

                    {/* Points Balance and Earning Preview */}
                    {effectivePointsToRedeem === 0 && (
                      <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between">
                        <span>🪙 Points to be earned on this transaction:</span>
                        <span className="font-bold font-mono">
                          +{Math.floor((totalDue / 100) * (selectedCustomer.tier === 'SILVER' ? 1.1 : selectedCustomer.tier === 'GOLD' ? 1.25 : selectedCustomer.tier === 'PLATINUM' ? 1.5 : 1.0))} pts
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                      <span>Customer balance after purchase:</span>
                      <span className="font-mono text-slate-300 font-bold">
                        {customerBalance - effectivePointsToRedeem} pts
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Customer has 0 points. Points will be earned from this purchase.
                  </div>
                )}
              </div>
            )}

            {/* Remaining Net Due Payment Method */}
            {netDue > 0 ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300">
                  {effectivePointsToRedeem > 0
                    ? `Payment Method for Remaining Balance (Rs. ${netDue.toFixed(2)})`
                    : "Choose Payment Method"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("CASH");
                      setCashTendered(netDue.toFixed(2));
                    }}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "CASH"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "CARD"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MOBILE")}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === "MOBILE"
                        ? "bg-amber-600/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">Mobile</span>
                  </button>
                </div>

                {/* Cash Tendered & Change */}
                {paymentMethod === "CASH" && (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Cash Received (Tendered)</label>
                      <div className="flex gap-1.5">
                        {[Math.ceil(netDue), 1000, 2000, 5000].map((quick) => {
                          if (quick < netDue && quick !== Math.ceil(netDue)) return null;
                          return (
                            <button
                              key={quick}
                              type="button"
                              onClick={() => setCashTendered(String(quick))}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono"
                            >
                              Rs.{quick}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-lg font-bold"
                    />
                    <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Customer Tendered Cash:</span>
                        <span className="font-mono text-white font-bold">Rs. {Number(cashTendered || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Less Remaining Purchase Value:</span>
                        <span className="font-mono text-purple-300 font-semibold">-Rs. {netDue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-emerald-400">
                        <span className="font-bold">Change to Return to Customer:</span>
                        <span className="font-mono font-black text-lg">
                          Rs. {Math.max(0, Number(cashTendered || 0) - netDue).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Reference */}
                {paymentMethod === "CARD" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Card Authorization / Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. VISA-4821"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-xl text-center space-y-1">
                <div className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Paid by Loyalty Points!</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Total purchase of Rs. {totalDue.toFixed(2)} will be settled using {effectivePointsToRedeem} points. No additional cash/card tender needed.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeCheckout}
                className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Complete Sale & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable Official Receipt Modal */}
      {receiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Transaction Completed</span>
              </h3>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div
              id="printable-receipt"
              className="my-4 p-5 bg-white text-slate-900 rounded-xl font-mono text-xs shadow-inner overflow-y-auto max-h-[60vh] space-y-3"
            >
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <div className="font-extrabold text-sm uppercase">NEXUS SUPERMARKET</div>
                <div className="text-[11px] text-slate-600">{receiptData.branch_name}</div>
                <div className="text-[10px] text-slate-500">{receiptData.branch_address}</div>
                <div className="text-[10px] text-slate-500">Tel: {receiptData.branch_phone}</div>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>RECEIPT #:</span>
                  <span className="font-bold">SALE-{receiptData.sale_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{receiptData.cashier_name}</span>
                </div>
                {receiptData.customer_name && (
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>CUSTOMER:</span>
                    <span>{receiptData.customer_name} ({receiptData.customer_card})</span>
                  </div>
                )}
              </div>

              {/* Item Lines */}
              <div className="border-b border-dashed border-slate-400 pb-2 space-y-1">
                {receiptData.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <div className="truncate max-w-[190px]">
                      {it.name} x {it.quantity}
                    </div>
                    <div className="font-bold">Rs. {Number(it.line_total).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals & Loyalty Point Discount */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span>Rs. {receiptData.subtotal}</span>
                </div>
                {Number(receiptData.discount_total) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Promotional Discounts:</span>
                    <span>-Rs. {receiptData.discount_total}</span>
                  </div>
                )}
                {receiptData.points_redeemed > 0 && (
                  <div className="flex justify-between text-purple-700 font-bold bg-purple-50 px-1 py-0.5 rounded">
                    <span>Loyalty Point Discount ({receiptData.points_redeemed} PTS):</span>
                    <span>-Rs. {Number(receiptData.points_redeemed).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (18% VAT):</span>
                  <span>Rs. {receiptData.tax_total}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-300">
                  <span>REMAINING PURCHASE VALUE:</span>
                  <span>Rs. {Number(receiptData.net_due ?? (Number(receiptData.total_amount) - Number(receiptData.points_redeemed || 0))).toFixed(2)}</span>
                </div>

                {/* Cash Settlement & Reduction Calculation */}
                {receiptData.payments?.filter((p: any) => p.method !== "POINTS").map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>Paid via {p.method} {p.reference ? `(${p.reference})` : ""}:</span>
                    <span>Rs. {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
                {receiptData.tendered !== undefined && (
                  <div className="flex justify-between font-semibold pt-1 border-t border-dotted border-slate-300">
                    <span>Customer Tendered Cash:</span>
                    <span>Rs. {Number(receiptData.tendered).toFixed(2)}</span>
                  </div>
                )}
                {receiptData.points_redeemed > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Less Remaining Purchase Value:</span>
                    <span>-Rs. {Number(receiptData.net_due ?? (Number(receiptData.total_amount) - Number(receiptData.points_redeemed || 0))).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-emerald-700 text-xs pt-0.5">
                  <span>Change Returned to Customer:</span>
                  <span>Rs. {Number(receiptData.change || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Loyalty Program Summary on Receipt */}
              {receiptData.customer_card && (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-2 rounded text-[10px] space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>LOYALTY REWARDS ({receiptData.customer_tier || "MEMBER"}):</span>
                    <span>{receiptData.customer_card}</span>
                  </div>
                  {receiptData.points_redeemed > 0 && (
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Points Redeemed:</span>
                      <span>-{receiptData.points_redeemed} PTS</span>
                    </div>
                  )}
                  {receiptData.earned_points > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Points Earned Today:</span>
                      <span>+{receiptData.earned_points} PTS</span>
                    </div>
                  )}
                  {receiptData.new_points_balance !== undefined && (
                    <div className="flex justify-between font-bold text-blue-700 border-t border-slate-200 pt-1">
                      <span>New Available Balance:</span>
                      <span>{receiptData.new_points_balance} PTS</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 pt-1">
                THANK YOU FOR SHOPPING WITH US!
                <br />
                PLEASE VISIT AGAIN
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
