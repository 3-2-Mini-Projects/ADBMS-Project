"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCashier, ManagerUser } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";
import ManagerAuthModal from "@/components/ManagerAuthModal";
import CameraBarcodeScannerModal from "@/components/CameraBarcodeScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";

interface Product {
  product_id: number;
  barcode: string;
  name: string;
  brand?: string;
  unit_price: number | string;
  tax_rate: number | string;
  category_name?: string;
  quantity_on_hand: number;
  reserved_qty: number;
  available_stock: number;
  is_active: number;
}

interface CartItem {
  product_id: number;
  name: string;
  barcode: string;
  unit_price: number;
  tax_rate: number;
  quantity: number;
  discount_amount: number;
  available_stock: number;
}

interface Customer {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  tier: string;
  points_balance: number;
}

interface PaymentLine {
  method: "CASH" | "CARD" | "MOBILE" | "POINTS";
  amount: number;
  reference?: string;
}

export default function POSBillingPage() {
  const { cashier } = useCashier();

  // Search & Products
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ category_id: number; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustSearch, setShowCustSearch] = useState(false);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([{ method: "CASH", amount: 0 }]);
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Manager Approval for Discounts / Voids
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [pendingDiscountItem, setPendingDiscountItem] = useState<{ id: number; disc: number } | null>(null);

  // Completed Receipt
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);

  // Camera Barcode Scanner Modal
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastBarcodeSubmitRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const lastCameraScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  // Load products & categories for the active branch
  const fetchProducts = useCallback(
    async (q = "", catId: number | null = null) => {
      if (!cashier) return;
      setLoadingProducts(true);
      try {
        let url = `/api/cashier/products?branchId=${cashier.branch_id}`;
        if (q.trim()) url += `&search=${encodeURIComponent(q.trim())}`;
        if (catId) url += `&categoryId=${catId}`;
        const res = await fetch(url);
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoadingProducts(false);
      }
    },
    [cashier]
  );

  useEffect(() => {
    fetchProducts(searchQuery, selectedCategory);
  }, [fetchProducts, searchQuery, selectedCategory]);

  // Focus barcode input on mount and on 'F2' or 'Escape'
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

  // Handle direct barcode scanner enter
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code || !cashier) return;

    // Guard against rapid duplicate enter / scanner bounce within 800ms
    const now = Date.now();
    if (code === lastBarcodeSubmitRef.current.code && now - lastBarcodeSubmitRef.current.time < 800) {
      setBarcodeInput("");
      return;
    }
    lastBarcodeSubmitRef.current = { code, time: now };

    try {
      const res = await fetch(
        `/api/cashier/products?branchId=${cashier.branch_id}&barcode=${encodeURIComponent(code)}`
      );
      const json = await res.json();
      if (json.products && json.products.length > 0) {
        addProductToCart(json.products[0]);
        setBarcodeInput("");
      } else {
        // Fallback: search by query
        const found = products.find(
          (p) => p.barcode === code || p.barcode.toLowerCase() === code.toLowerCase()
        );
        if (found) {
          addProductToCart(found);
          setBarcodeInput("");
        } else {
          setErrorMsg(`No active product found with barcode: "${code}"`);
          setTimeout(() => setErrorMsg(""), 3500);
        }
      }
    } catch {
      setErrorMsg("Error searching barcode");
    }
  };

  // Handle scanned barcode from camera modal
  const handleCameraBarcodeScanned = async (code: string) => {
    const trimmed = code ? code.trim() : "";
    if (!trimmed || !cashier) return;

    // Guard against rapid duplicate scans of the same item within 1500ms
    const now = Date.now();
    if (trimmed === lastCameraScanRef.current.code && now - lastCameraScanRef.current.time < 1500) {
      return;
    }
    lastCameraScanRef.current = { code: trimmed, time: now };

    try {
      const res = await fetch(
        `/api/cashier/products?branchId=${cashier.branch_id}&barcode=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (json.products && json.products.length > 0) {
        addProductToCart(json.products[0]);
      } else {
        const found = products.find(
          (p) => p.barcode === trimmed || p.barcode.toLowerCase() === trimmed.toLowerCase()
        );
        if (found) {
          addProductToCart(found);
        } else {
          setErrorMsg(`Scanned barcode "${trimmed}" not found in branch catalog.`);
          setTimeout(() => setErrorMsg(""), 4000);
        }
      }
    } catch {
      setErrorMsg("Failed to query scanned barcode.");
    }
  };

  // Add Product to Temporary Cart
  const addProductToCart = (prod: Product) => {
    if (prod.is_active === 0) {
      alert(`Product "${prod.name}" is inactive and cannot be sold.`);
      return;
    }
    if (prod.available_stock <= 0) {
      alert(`Product "${prod.name}" is out of stock at this branch.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === prod.product_id);
      if (existing) {
        if (existing.quantity + 1 > prod.available_stock) {
          alert(`Cannot add more. Available branch stock: ${prod.available_stock} units.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === prod.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: prod.product_id,
            name: prod.name,
            barcode: prod.barcode,
            unit_price: Number(prod.unit_price),
            tax_rate: Number(prod.tax_rate || 0),
            quantity: 1,
            discount_amount: 0,
            available_stock: prod.available_stock,
          },
        ];
      }
    });

    barcodeInputRef.current?.focus();
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const finalQty = Math.min(qty, item.available_stock);
          if (qty > item.available_stock) {
            alert(`Available stock is only ${item.available_stock} units.`);
          }
          return { ...item, quantity: finalQty };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Are you sure you want to clear the shopping cart?")) {
      setCart([]);
      setCustomer(null);
    }
  };

  // Discount adjustment with manager authorization if > 15%
  const handleDiscountChange = (productId: number, discount: number) => {
    const item = cart.find((c) => c.product_id === productId);
    if (!item) return;

    const lineSubtotal = item.unit_price * item.quantity;
    const discountPercent = lineSubtotal > 0 ? (discount / lineSubtotal) * 100 : 0;

    if (discountPercent > 15) {
      // Require manager approval
      setPendingDiscountItem({ id: productId, disc: discount });
      setShowManagerModal(true);
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, discount_amount: Math.max(0, discount) } : i
      )
    );
  };

  const handleManagerDiscountApproved = () => {
    if (pendingDiscountItem) {
      setCart((prev) =>
        prev.map((i) =>
          i.product_id === pendingDiscountItem.id
            ? { ...i, discount_amount: pendingDiscountItem.disc }
            : i
        )
      );
      setPendingDiscountItem(null);
    }
  };

  // Customer Loyalty Lookup
  const handleCustomerSearch = async (val: string) => {
    setCustomerSearch(val);
    if (!val.trim()) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/cashier/customers?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setCustomerResults(data);
    } catch {
      setCustomerResults([]);
    }
  };

  // Billing Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discountTotal = cart.reduce((sum, item) => sum + item.discount_amount, 0);

  // Calculate item tax or 18% standard VAT
  const rawTaxTotal = cart.reduce((sum, item) => {
    const taxableLine = Math.max(0, item.unit_price * item.quantity - item.discount_amount);
    return sum + taxableLine * (item.tax_rate / 100);
  }, 0);
  const taxTotal = rawTaxTotal > 0 ? rawTaxTotal : Math.max(0, subtotal - discountTotal) * 0.18;
  const finalTotal = Math.max(0, Number((subtotal - discountTotal + taxTotal).toFixed(2)));

  // Setup payment modal
  const openCheckoutModal = () => {
    if (cart.length === 0) {
      alert("Cart is empty! Add products before proceeding to checkout.");
      return;
    }
    setPaymentLines([{ method: "CASH", amount: finalTotal }]);
    setCashTendered(String(finalTotal));
    setShowCheckout(true);
  };

  // Split payment helper
  const addSplitPayment = () => {
    const currentSum = paymentLines.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const remaining = Math.max(0, Number((finalTotal - currentSum).toFixed(2)));
    setPaymentLines((prev) => [...prev, { method: "CARD", amount: remaining }]);
  };

  const removeSplitPayment = (index: number) => {
    setPaymentLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updatePaymentLine = (index: number, field: keyof PaymentLine, val: any) => {
    setPaymentLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, [field]: val } : line))
    );
  };

  // Calculate Change
  const totalPaidSum = paymentLines.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const hasCash = paymentLines.some((p) => p.method === "CASH");
  const effectiveCashTendered = hasCash && cashTendered ? Number(cashTendered) : totalPaidSum;
  const changeDue = Math.max(0, Number((effectiveCashTendered - finalTotal).toFixed(2)));

  // Complete Sale Submission
  const handleCompleteSale = async () => {
    if (!cashier) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        branchId: cashier.branch_id,
        cashierId: cashier.employee_id,
        customerId: customer?.customer_id || null,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount_amount: c.discount_amount,
          tax_rate: c.tax_rate,
        })),
        payments: paymentLines.map((p) => ({
          method: p.method,
          amount: Number(p.amount),
          reference: p.reference || null,
        })),
        amountTendered: effectiveCashTendered,
      };

      const res = await fetch("/api/cashier/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": `pos-${Date.now()}-${Math.random()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.receipt) {
        setCompletedReceipt(data.receipt);
        setShowCheckout(false);
        setCart([]);
        setCustomer(null);
        // Refresh products stock in background
        fetchProducts(searchQuery, selectedCategory);
      } else {
        setErrorMsg(data.error || "Failed to finalize sale");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while completing transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: 14 }}>
      {/* Top Search & Category Bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} style={{ display: "flex", gap: 6, flex: 1, minWidth: 320 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              ref={barcodeInputRef}
              type="text"
              className="input"
              placeholder="Scan Barcode (e.g. 4790001) & Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{ paddingLeft: 34, borderColor: "var(--accent-emerald)" }}
            />
            <span style={{ position: "absolute", left: 10, top: 8, fontSize: 16 }}>🏷️</span>
          </div>
          <button type="submit" className="btn btn-emerald">
            Scan
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCameraScanner(true)}
            title="Scan barcode with computer webcam or camera"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>📷</span> Camera Scan
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowBarcodeModal(true)}
            title="Generate and view scannable barcodes for testing"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>🏷️</span> Barcodes
          </button>
        </form>

        {/* Product Keyword Search */}
        <div style={{ width: 220 }}>
          <input
            type="text"
            className="input"
            placeholder="Search name or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: 400 }}>
          <button
            className={`btn ${selectedCategory === null ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={() => setSelectedCategory(null)}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              className={`btn ${selectedCategory === c.category_id ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => setSelectedCategory(c.category_id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Customer Loyalty Selector */}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          {customer ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(88, 166, 255, 0.12)",
                border: "1px solid rgba(88, 166, 255, 0.3)",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span>⭐ {customer.full_name}</span>
              <span className="badge badge-open" style={{ fontSize: 9.5 }}>{customer.tier}</span>
              <button
                className="btn btn-ghost"
                style={{ padding: "1px 4px", fontSize: 10 }}
                onClick={() => setCustomer(null)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setShowCustSearch(!showCustSearch)}
            >
              👤 Attach Customer
            </button>
          )}

          {/* Customer Dropdown search */}
          {showCustSearch && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 38,
                width: 280,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                zIndex: 20,
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Phone or Card No..."
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                autoFocus
              />
              <div style={{ marginTop: 8, maxHeight: 160, overflowY: "auto" }}>
                {customerResults.map((c) => (
                  <div
                    key={c.customer_id}
                    onClick={() => {
                      setCustomer(c);
                      setShowCustSearch(false);
                      setCustomerSearch("");
                    }}
                    style={{
                      padding: "6px 8px",
                      cursor: "pointer",
                      borderRadius: 6,
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.full_name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.card_no}</div>
                    </div>
                    <span className="badge badge-open" style={{ fontSize: 9 }}>{c.tier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(248, 81, 73, 0.15)",
            border: "1px solid rgba(248, 81, 73, 0.3)",
            color: "var(--accent-rose)",
            fontSize: 12,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Two-Column POS Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Product Catalog / Quick Add Grid */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Product Catalog ({products.length} Items Available)
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Click item card to add to cart
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 12,
              paddingRight: 4,
            }}
          >
            {loadingProducts ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                Loading catalog products...
              </div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                No matching products found.
              </div>
            ) : (
              products.map((p) => {
                const inStock = p.available_stock > 0;
                return (
                  <div
                    key={p.product_id}
                    onClick={() => inStock && addProductToCart(p)}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      cursor: inStock ? "pointer" : "not-allowed",
                      opacity: inStock ? 1 : 0.45,
                      transition: "transform 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (inStock) {
                        e.currentTarget.style.borderColor = "var(--accent-emerald)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (inStock) {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--accent-blue)",
                          fontFamily: "'JetBrains Mono', monospace",
                          marginBottom: 2,
                        }}
                      >
                        {p.barcode}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                          marginBottom: 4,
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.brand || p.category_name || "General"}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-emerald)" }}>
                          {fmt(p.unit_price)}
                        </div>
                        <div style={{ fontSize: 10, color: inStock ? "var(--text-secondary)" : "var(--accent-rose)" }}>
                          Stock: {p.available_stock}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                          background: inStock ? "var(--bg-card2)" : "transparent",
                        }}
                        disabled={!inStock}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cart, Calculations & Checkout Button */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Cart Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🛒</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                Current Sale Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                className="btn btn-ghost"
                onClick={clearCart}
                style={{ padding: "3px 8px", fontSize: 11, color: "var(--accent-rose)" }}
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 180, display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>🛍️</span>
                <span>Cart is empty. Scan barcode or click catalog items.</span>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = Math.max(0, item.unit_price * item.quantity - item.discount_amount);
                return (
                  <div
                    key={item.product_id}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {fmt(item.unit_price)} × {item.quantity} • Barcode: {item.barcode}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                          {fmt(lineTotal)}
                        </div>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>

                    {/* Stepper & Line Discount */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {/* Quantity Stepper */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "2px 7px", fontSize: 12 }}
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, fontSize: 12, minWidth: 20, textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "2px 7px", fontSize: 12 }}
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      {/* Discount Input */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Disc Rs:</span>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 65, padding: "2px 6px", fontSize: 11, textAlign: "right" }}
                          value={item.discount_amount || ""}
                          placeholder="0"
                          onChange={(e) => handleDiscountChange(item.product_id, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bill Calculation Totals */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Subtotal:</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-rose)" }}>
                <span>Discount Total:</span>
                <span>-{fmt(discountTotal)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Tax Total (18% / Item Tax):</span>
              <span>{fmt(taxTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                fontWeight: 900,
                color: "var(--accent-emerald)",
                marginTop: 6,
                paddingTop: 6,
                borderTop: "1px solid var(--border)",
              }}
            >
              <span>TOTAL DUE:</span>
              <span>{fmt(finalTotal)}</span>
            </div>
          </div>

          {/* Checkout Action Button */}
          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn-emerald"
              style={{ width: "100%", justifyContent: "center", padding: "12px 18px", fontSize: 15 }}
              onClick={openCheckoutModal}
              disabled={cart.length === 0}
            >
              💳 Pay & Complete Sale ({fmt(finalTotal)})
            </button>
          </div>
        </div>
      </div>

      {/* Checkout & Split Payment Modal */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520, width: "100%", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                  Payment & Final Checkout
                </h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowCheckout(false)}>
                ✕
              </button>
            </div>

            {/* Total Due Banner */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                padding: "12px 16px",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Grand Total Due</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "var(--accent-emerald)" }}>
                {fmt(finalTotal)}
              </span>
            </div>

            {/* Split Payment Lines */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Payment Methods (Split payments supported)
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  onClick={addSplitPayment}
                >
                  + Add Split Method
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {paymentLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      background: "var(--bg-surface)",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <select
                      className="input"
                      style={{ width: 110, padding: "6px 8px" }}
                      value={line.method}
                      onChange={(e) => updatePaymentLine(idx, "method", e.target.value)}
                    >
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="MOBILE">MOBILE</option>
                      <option value="POINTS">POINTS</option>
                    </select>

                    <input
                      type="number"
                      className="input"
                      style={{ width: 120, padding: "6px 8px" }}
                      placeholder="Amount"
                      value={line.amount || ""}
                      onChange={(e) => updatePaymentLine(idx, "amount", Number(e.target.value))}
                    />

                    <input
                      type="text"
                      className="input"
                      style={{ flex: 1, padding: "6px 8px" }}
                      placeholder={line.method === "CASH" ? "Cash notes..." : "Approval code / Ref #"}
                      value={line.reference || ""}
                      onChange={(e) => updatePaymentLine(idx, "reference", e.target.value)}
                    />

                    {paymentLines.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", color: "var(--accent-rose)" }}
                        onClick={() => removeSplitPayment(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Cash Buttons & Tendered Input */}
            {hasCash && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Quick Cash Denominations:
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {[500, 1000, 2000, 5000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => {
                        const cur = Number(cashTendered || 0);
                        setCashTendered(String(cur + denom));
                      }}
                    >
                      +{denom}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                    onClick={() => setCashTendered(String(finalTotal))}
                  >
                    Exact ({fmt(finalTotal)})
                  </button>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      Cash Tendered from Customer (Rs.)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Change Due</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-emerald)" }}>
                      {fmt(changeDue)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCheckout(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                onClick={handleCompleteSale}
                disabled={isSubmitting}
                style={{ padding: "10px 20px", fontSize: 14 }}
              >
                {isSubmitting ? "Processing..." : "✓ Confirm & Print Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Approval Modal for High Discounts */}
      <ManagerAuthModal
        isOpen={showManagerModal}
        title="Manager Approval: High Discount Override"
        description="Line discount exceeds 15% standard limit and requires manager authorization PIN."
        onClose={() => {
          setShowManagerModal(false);
          setPendingDiscountItem(null);
        }}
        onSuccess={() => {
          handleManagerDiscountApproved();
        }}
      />

      {/* Printable Receipt Modal */}
      {completedReceipt && (
        <PrintableReceipt
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
          onNewSale={() => {
            setCompletedReceipt(null);
            barcodeInputRef.current?.focus();
          }}
        />
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleCameraBarcodeScanned}
        continuous={true}
      />

      {/* Barcode Generator / Sheet Modal */}
      <BarcodeGeneratorModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        productsList={products.map((p) => ({
          name: p.name,
          barcode: p.barcode,
          price: p.unit_price,
          category: p.category_name,
        }))}
      />
    </div>
  );
}
