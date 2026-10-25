"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCashier, ManagerUser } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";
import ManagerAuthModal from "@/components/ManagerAuthModal";
import CameraBarcodeScannerModal from "@/components/CameraBarcodeScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";
import QuantityEntryModal, { QuantityModalProduct } from "@/components/QuantityEntryModal";
import RegisterCustomerModal from "@/components/RegisterCustomerModal";
import { playScanBeep, playErrorBeep, playCheckoutChime } from "@/lib/posAudio";

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
  const [customPointsInput, setCustomPointsInput] = useState<string>("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
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

  // Fast Keyboard Quantity Entry Modal
  const [selectedProductForQty, setSelectedProductForQty] = useState<QuantityModalProduct | null>(null);
  const [qtyModalMode, setQtyModalMode] = useState<"add" | "set">("add");
  const [initialModalQty, setInitialModalQty] = useState<number>(1);

  // Register Customer Modal
  const [showRegisterCustomerModal, setShowRegisterCustomerModal] = useState(false);

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

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Open Quantity Entry Modal
  const openQuantityModal = (
    prod: Product | QuantityModalProduct,
    mode: "add" | "set" = "add",
    defaultQty: number = 1
  ) => {
    if ("is_active" in prod && prod.is_active === 0) {
      alert(`Product "${prod.name}" is inactive and cannot be sold.`);
      return;
    }
    if (prod.available_stock <= 0) {
      alert(`Product "${prod.name}" is out of stock at this branch.`);
      return;
    }
    setSelectedProductForQty(prod);
    setQtyModalMode(mode);
    setInitialModalQty(defaultQty);
  };

  const handleQuantityConfirm = (quantity: number, mode: "add" | "set") => {
    if (!selectedProductForQty) return;

    if (mode === "set") {
      updateQuantity(selectedProductForQty.product_id, quantity);
    } else {
      addProductToCart(selectedProductForQty as Product, quantity);
    }

    setSelectedProductForQty(null);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Handle direct barcode scanner enter
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw || !cashier) return;

    // Support multiplier syntax e.g. "5*4790010"
    let multiplier = 1;
    let code = raw;
    if (raw.includes("*")) {
      const parts = raw.split("*");
      if (parts.length === 2) {
        const parsedQty = parseInt(parts[0].trim(), 10);
        if (!isNaN(parsedQty) && parsedQty > 0) {
          multiplier = parsedQty;
          code = parts[1].trim();
        }
      }
    }

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
      let prod: Product | undefined;
      if (json.products && json.products.length > 0) {
        prod = json.products[0];
      } else {
        // Fallback: search by query
        prod = products.find(
          (p) => p.barcode === code || p.barcode.toLowerCase() === code.toLowerCase()
        );
      }

      if (prod) {
        const autoAdd = typeof window !== "undefined" ? localStorage.getItem("adbms_auto_add_scan") !== "false" : true;
        if (autoAdd) {
          addProductToCart(prod, multiplier);
          playScanBeep();
        } else {
          openQuantityModal(prod, "add", multiplier);
        }
        setBarcodeInput("");
      } else {
        playErrorBeep();
        setErrorMsg(`No active product found with barcode: "${code}"`);
        setTimeout(() => setErrorMsg(""), 3500);
      }
    } catch {
      playErrorBeep();
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
      let prod: Product | undefined;
      if (json.products && json.products.length > 0) {
        prod = json.products[0];
      } else {
        prod = products.find(
          (p) => p.barcode === trimmed || p.barcode.toLowerCase() === trimmed.toLowerCase()
        );
      }

      if (prod) {
        const autoAdd = typeof window !== "undefined" ? localStorage.getItem("adbms_auto_add_scan") !== "false" : true;
        if (autoAdd) {
          addProductToCart(prod, 1);
          playScanBeep();
        } else {
          openQuantityModal(prod, "add", 1);
        }
      } else {
        playErrorBeep();
        setErrorMsg(`Scanned barcode "${trimmed}" not found in branch catalog.`);
        setTimeout(() => setErrorMsg(""), 4000);
      }
    } catch {
      playErrorBeep();
      setErrorMsg("Failed to query scanned barcode.");
    }
  };

  // Add Product to Temporary Cart
  const addProductToCart = (prod: Product, qtyToAdd: number = 1) => {
    if (prod.is_active === 0) {
      playErrorBeep();
      alert(`Product "${prod.name}" is inactive and cannot be sold.`);
      return;
    }
    if (prod.available_stock <= 0) {
      playErrorBeep();
      alert(`Product "${prod.name}" is out of stock at this branch.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === prod.product_id);
      if (existing) {
        if (existing.quantity + qtyToAdd > prod.available_stock) {
          alert(`Cannot add more. Available branch stock: ${prod.available_stock} units.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === prod.product_id
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      } else {
        const finalQty = Math.min(qtyToAdd, prod.available_stock);
        return [
          ...prev,
          {
            product_id: prod.product_id,
            name: prod.name,
            barcode: prod.barcode,
            unit_price: Number(prod.unit_price),
            tax_rate: Number(prod.tax_rate || 0),
            quantity: finalQty,
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

  const [isRefreshingCustomer, setIsRefreshingCustomer] = useState(false);

  // Customer Loyalty Lookup (Bypass cache completely with cache: no-store and timestamp)
  const handleCustomerSearch = async (val: string) => {
    setCustomerSearch(val);
    if (!val.trim()) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/cashier/customers?q=${encodeURIComponent(val.trim())}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      setCustomerResults(Array.isArray(data) ? data : []);
    } catch {
      setCustomerResults([]);
    }
  };

  // Re-fetch customer directly from DB to guarantee real-time balance
  const refreshCustomer = async (targetId?: number) => {
    const id = targetId || customer?.customer_id;
    if (!id) return;
    setIsRefreshingCustomer(true);
    try {
      const res = await fetch(`/api/cashier/customers?id=${id}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCustomer(data[0]);
      }
    } catch (err) {
      console.error("Failed to refresh customer points", err);
    } finally {
      setIsRefreshingCustomer(false);
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
    const defaultMethod =
      (typeof window !== "undefined" && (localStorage.getItem("adbms_pos_default_payment") as any)) || "CASH";
    const validMethod = defaultMethod === "CARD" ? "CARD" : "CASH";
    setPaymentLines([{ method: validMethod, amount: finalTotal }]);
    setCustomPointsInput("");
    setCashTendered(String(finalTotal));
    setShowCheckout(true);
  };

  const applyPointsRedemption = (pts: number) => {
    const maxPts = Math.min(Number(customer?.points_balance || 0), Math.floor(finalTotal));
    const validPts = Math.max(0, Math.min(Math.floor(pts || 0), maxPts));
    const remaining = Math.max(0, Number((finalTotal - validPts).toFixed(2)));
    setCustomPointsInput(validPts > 0 ? String(validPts) : "");

    if (validPts > 0) {
      setPaymentLines([
        { method: "POINTS", amount: validPts, reference: `PTS-REDEEM-${customer?.card_no || "CUST"}` },
        ...(remaining > 0 ? [{ method: "CASH" as const, amount: remaining }] : []),
      ]);
    } else {
      setPaymentLines([{ method: "CASH", amount: finalTotal }]);
    }
    setCashTendered(remaining > 0 ? remaining.toFixed(2) : "0");
  };

  const updatePaymentLine = (index: number, field: keyof PaymentLine, val: any) => {
    // If it's a POINTS line, do not allow changing method or amount
    if (paymentLines[index]?.method === "POINTS" && (field === "method" || field === "amount")) {
      return;
    }
    setPaymentLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, [field]: val } : line))
    );
  };

  // Calculate Payments & Change Breakdown
  const totalPaidSum = paymentLines.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const hasCash = paymentLines.some((p) => p.method === "CASH");
  const cashLine = paymentLines.find((p) => p.method === "CASH");
  const cashAmount = cashLine ? Number(cashLine.amount || 0) : 0;
  const effectiveCashTendered = hasCash && cashTendered ? Number(cashTendered) : cashAmount;
  const changeDue = hasCash && effectiveCashTendered > cashAmount
    ? Number((effectiveCashTendered - cashAmount).toFixed(2))
    : 0;

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
        couponCode: appliedCoupon || null,
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
        playCheckoutChime();
        setCompletedReceipt(data.receipt);
        setShowCheckout(false);
        setCart([]);
        setAppliedCoupon(null);
        setCouponCode("");

        // Always refresh customer details with latest points balance and tier from completed sale
        if (data.receipt.customer) {
          setCustomer({
            customer_id: data.receipt.customer.customer_id,
            card_no: data.receipt.customer.card_no,
            full_name: data.receipt.customer.full_name,
            phone: data.receipt.customer.phone,
            tier: data.receipt.customer.tier || "BRONZE",
            points_balance: Number(data.receipt.customer.points_balance || 0),
          });
        } else {
          setCustomer(null);
        }

        // Reset customer search dropdown state
        setCustomerResults([]);
        setCustomerSearch("");

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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%", gap: 12, overflow: "hidden" }}>
      {/* Top Search & Category Bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <img
          src="/logo.png"
          alt="Nexus Supermarket Logo"
          style={{
            height: 38,
            width: 38,
            objectFit: "contain",
            borderRadius: 8,
            background: "#ffffff",
            padding: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
        />
        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} style={{ display: "flex", gap: 6, flex: 1, minWidth: 260, alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%", flex: 1 }}>
            <input
              ref={barcodeInputRef}
              type="text"
              className="input"
              placeholder="Scan Barcode (e.g. 4790001) & Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{ paddingLeft: 34, borderColor: "var(--accent-emerald)", height: 38 }}
            />
            <span style={{ position: "absolute", left: 10, top: 9, fontSize: 15 }}>🏷️</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowCameraScanner(true)}
            title="Scan barcode with computer webcam or camera"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              height: 38,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span>📷</span>
            <span>Scan</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowBarcodeModal(true)}
            title="Generate and view scannable barcodes for testing"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              height: 38,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span>🏷️</span>
            <span>Barcodes</span>
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
              <span>⭐ <strong>{customer.full_name}</strong> ({customer.card_no})</span>
              <span className="badge badge-open" style={{ fontSize: 9.5 }}>{customer.tier}</span>
              <span style={{ fontSize: 11, color: "var(--accent-emerald)", fontWeight: 700 }}>
                {customer.points_balance || 0} pts
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "1px 5px", fontSize: 11 }}
                onClick={() => refreshCustomer(customer.customer_id)}
                title="Refresh loyalty points from database"
                disabled={isRefreshingCustomer}
              >
                {isRefreshingCustomer ? "⏳" : "🔄"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "1px 4px", fontSize: 10 }}
                onClick={() => setCustomer(null)}
                title="Detach customer"
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setShowCustSearch(!showCustSearch)}
              >
                👤 Attach Customer
              </button>
              <button
                type="button"
                className="btn btn-emerald"
                style={{ fontSize: 12, padding: "6px 12px", gap: 4 }}
                onClick={() => setShowRegisterCustomerModal(true)}
                title="Enroll walk-in customer into loyalty rewards program"
              >
                <span>⭐</span>
                <span>+ Register Member</span>
              </button>
            </div>
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
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
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
                    onClick={async () => {
                      setCustomer(c);
                      setShowCustSearch(false);
                      setCustomerSearch("");
                      // Guarantee latest DB points
                      await refreshCustomer(c.customer_id);
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
              Click item to enter quantity (or press Enter ↵)
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
                    onClick={() => inStock && openQuantityModal(p, "add")}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inStock) openQuantityModal(p, "add");
                        }}
                      >
                        + Qty
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
                        <span
                          title="Click to edit quantity with Enter key"
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            minWidth: 24,
                            textAlign: "center",
                            cursor: "pointer",
                            background: "rgba(88, 166, 255, 0.12)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "1px dashed rgba(88, 166, 255, 0.4)",
                          }}
                          onClick={() => {
                            const prod = products.find((p) => p.product_id === item.product_id) || {
                              product_id: item.product_id,
                              barcode: item.barcode,
                              name: item.name,
                              unit_price: item.unit_price,
                              tax_rate: item.tax_rate,
                              available_stock: item.available_stock,
                              is_active: 1,
                              quantity_on_hand: item.available_stock,
                              reserved_qty: 0,
                            };
                            openQuantityModal(prod as Product, "set");
                          }}
                        >
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

            {/* Loyalty Points Earning Live Preview Banner */}
            {customer ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ fontSize: 14 }}>⭐</span>
                    <strong style={{ color: "var(--text-primary)" }}>{customer.full_name}</strong>
                    <span className="badge badge-open" style={{ fontSize: 9.5 }}>{customer.tier}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--accent-emerald)", fontWeight: 800 }}>
                    Bal: {customer.points_balance || 0} pts
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Earning on this purchase:</span>
                  <span style={{ color: "var(--accent-emerald)", fontWeight: 900, fontSize: 12 }}>
                    🪙 +{Math.floor((finalTotal / 100) * (customer.tier === 'SILVER' ? 1.1 : customer.tier === 'GOLD' ? 1.25 : customer.tier === 'PLATINUM' ? 1.5 : 1.0))} Points
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#f8fafc",
                  border: "1px dashed var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                <span>No loyalty member attached</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "2px 8px", fontSize: 11, color: "var(--accent-emerald)", fontWeight: 700 }}
                  onClick={() => setShowRegisterCustomerModal(true)}
                >
                  ⭐ + Register Member
                </button>
              </div>
            )}
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
          <div
            className="modal-box"
            style={{
              maxWidth: 520,
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Payment & Final Checkout
                </h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowCheckout(false)}>
                ✕
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Bill & Discount Summary Banner */}
            {(() => {
              const activePoints = paymentLines.find((p) => p.method === "POINTS");
              const redeemedPts = activePoints ? Number(activePoints.amount || 0) : 0;
              const remainingPurchaseVal = Math.max(0, Number((finalTotal - redeemedPts).toFixed(2)));

              return (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    padding: "12px 16px",
                    borderRadius: 10,
                    marginBottom: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>Gross Purchase Value</span>
                    <span style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(finalTotal)}</span>
                  </div>
                  {redeemedPts > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#c084fc",
                        fontWeight: 700,
                        background: "rgba(147, 51, 234, 0.12)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(147, 51, 234, 0.3)",
                      }}
                    >
                      <span>⭐ Loyalty Point Discount ({redeemedPts} pts):</span>
                      <span style={{ fontFamily: "monospace" }}>-{fmt(redeemedPts)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {redeemedPts > 0 ? "Remaining Purchase Value" : "Grand Total Due"}
                      </span>
                      {redeemedPts > 0 && (
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Payable amount after loyalty point discount</div>
                      )}
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: redeemedPts > 0 ? "#a855f7" : "var(--accent-emerald)" }}>
                      {fmt(remainingPurchaseVal)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Promotional Coupon Section */}
            <div
              style={{
                background: appliedCoupon ? "#ecfdf5" : "#f8fafc",
                border: appliedCoupon ? "1px solid #a7f3d0" : "1px solid var(--border)",
                padding: "10px 14px",
                borderRadius: 10,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  🏷️ Promotional Coupon
                </span>
                {appliedCoupon && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>
                    ✓ Applied: <strong>{appliedCoupon}</strong>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: 12,
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                  }}
                  placeholder="Enter coupon code (e.g. TOP20, DAIRY10)..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && couponCode.trim() && !appliedCoupon) {
                      e.preventDefault();
                      setAppliedCoupon(couponCode.trim().toUpperCase());
                    }
                  }}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "6px 12px", color: "var(--accent-rose)" }}
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "6px 12px" }}
                    onClick={() => {
                      if (!couponCode.trim()) return;
                      setAppliedCoupon(couponCode.trim().toUpperCase());
                    }}
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {/* Customer Loyalty Banner in Checkout */}
            {customer && (() => {
              const currentPoints = Number(customer.points_balance || 0);
              const maxRedeemable = Math.min(currentPoints, Math.floor(finalTotal));
              const activePointsPayment = paymentLines.find((p) => p.method === "POINTS");
              const currentRedeemedPoints = activePointsPayment ? Number(activePointsPayment.amount) : 0;
              const remainingDue = Math.max(0, Number((finalTotal - currentRedeemedPoints).toFixed(2)));

              return (
                <div
                  style={{
                    background: "rgba(147, 51, 234, 0.08)",
                    border: "1px solid rgba(147, 51, 234, 0.3)",
                    padding: "12px 14px",
                    borderRadius: 10,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                    <span>⭐ <strong>{customer.full_name}</strong> ({customer.card_no})</span>
                    <span className="badge badge-open" style={{ borderColor: "#a855f7", color: "#c084fc" }}>
                      {customer.tier} MEMBER
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, marginTop: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>
                      Available Balance: <strong>{currentPoints} pts</strong> (Value: Rs. {currentPoints.toFixed(2)})
                    </span>
                    {currentRedeemedPoints === 0 ? (
                      <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>
                        🪙 +{Math.floor((finalTotal / 100) * (customer.tier === 'SILVER' ? 1.1 : customer.tier === 'GOLD' ? 1.25 : customer.tier === 'PLATINUM' ? 1.5 : 1.0))} pts will be earned
                      </span>
                    ) : (
                      <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                        ⚠️ 0 pts earned (points redeemed)
                      </span>
                    )}
                  </div>

                  {currentPoints > 0 ? (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(147, 51, 234, 0.3)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#d8b4fe" }}>
                          Redeem Loyalty Points (Max {maxRedeemable} pts):
                        </span>
                        {currentRedeemedPoints > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#34d399" }}>
                            ✓ {currentRedeemedPoints} pts applied (-Rs. {currentRedeemedPoints.toFixed(2)})
                          </span>
                        )}
                      </div>

                      {/* If points exceed/cover bill: option to buy product with points */}
                      {currentPoints >= Math.floor(finalTotal) && (
                        <div style={{ marginBottom: 10 }}>
                          <button
                            type="button"
                            className="btn btn-emerald"
                            style={{
                              width: "100%",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 800,
                              padding: "8px 12px",
                              background: currentRedeemedPoints === Math.floor(finalTotal) ? "#059669" : "rgba(16, 185, 129, 0.15)",
                              border: "1px solid #10b981",
                              color: currentRedeemedPoints === Math.floor(finalTotal) ? "#ffffff" : "#a7f3d0",
                            }}
                            onClick={() => {
                              if (currentRedeemedPoints === Math.floor(finalTotal)) {
                                setCustomPointsInput("");
                                applyPointsRedemption(0);
                              } else {
                                setCustomPointsInput(String(Math.floor(finalTotal)));
                                applyPointsRedemption(Math.floor(finalTotal));
                              }
                            }}
                          >
                            🛍️ {currentRedeemedPoints === Math.floor(finalTotal) ? "✓ Bought with Points (Customer pays Rs. 0)" : `Buy Product with Points (${Math.floor(finalTotal)} pts = Pay Rs. 0)`}
                          </button>
                        </div>
                      )}

                      {/* Redeem any valid amount of points */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ position: "relative", flex: "1 1 180px" }}>
                          <input
                            type="number"
                            className="input"
                            min="0"
                            max={maxRedeemable}
                            style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
                            placeholder={`Enter points to redeem (1 - ${maxRedeemable})...`}
                            value={customPointsInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setCustomPointsInput("");
                                return;
                              }
                              const num = parseInt(val, 10);
                              if (isNaN(num)) return;
                              // Clamp so points can never make the bill negative or exceed customer balance
                              const clamped = Math.max(0, Math.min(num, maxRedeemable));
                              setCustomPointsInput(String(clamped));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                applyPointsRedemption(Number(customPointsInput || 0));
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "6px 14px", fontSize: 11.5, fontWeight: 700 }}
                          onClick={() => applyPointsRedemption(Number(customPointsInput || 0))}
                        >
                          Apply Points
                        </button>
                        {currentRedeemedPoints > 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: "6px 10px", fontSize: 11, color: "var(--accent-rose)" }}
                            onClick={() => {
                              setCustomPointsInput("");
                              applyPointsRedemption(0);
                            }}
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                        <span>
                          Customer pays: <strong style={{ color: "var(--text-primary)" }}>Rs. {Math.max(0, finalTotal - currentRedeemedPoints).toFixed(2)}</strong>
                        </span>
                        <span>
                          Points remaining: <strong style={{ color: "#c084fc" }}>{currentPoints - currentRedeemedPoints} pts</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                      Customer has 0 points available. Points will be automatically earned from this purchase.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Payment Method Section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {paymentLines.some((p) => p.method === "POINTS")
                    ? "Payment Settlement"
                    : "Payment Method"}
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {paymentLines.map((line, idx) => {
                  const isPoints = line.method === "POINTS";

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        background: isPoints ? "rgba(147, 51, 234, 0.08)" : "var(--bg-surface)",
                        padding: 8,
                        borderRadius: 8,
                        border: isPoints ? "1px solid rgba(147, 51, 234, 0.3)" : "1px solid var(--border)",
                      }}
                    >
                      {isPoints ? (
                        <div
                          style={{
                            width: 110,
                            padding: "6px 8px",
                            background: "rgba(147, 51, 234, 0.2)",
                            color: "#d8b4fe",
                            fontWeight: 700,
                            fontSize: 12,
                            borderRadius: 6,
                            textAlign: "center",
                            border: "1px solid rgba(147, 51, 234, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          ⭐ POINTS
                        </div>
                      ) : (
                        <select
                          className="input"
                          style={{ width: 110, padding: "6px 8px" }}
                          value={line.method}
                          onChange={(e) => updatePaymentLine(idx, "method", e.target.value)}
                        >
                          <option value="CASH">CASH</option>
                          <option value="CARD">CARD</option>
                          <option value="MOBILE">MOBILE</option>
                        </select>
                      )}

                      <input
                        type="number"
                        className="input"
                        style={{
                          width: 120,
                          padding: "6px 8px",
                          ...(isPoints ? { background: "#f1f5f9", cursor: "not-allowed", color: "#9333ea", fontWeight: 700 } : {}),
                        }}
                        placeholder="Amount"
                        value={line.amount || ""}
                        disabled={isPoints}
                        onChange={(e) => updatePaymentLine(idx, "amount", Number(e.target.value))}
                      />

                      <input
                        type="text"
                        className="input"
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          ...(isPoints ? { background: "#f1f5f9", cursor: "not-allowed", color: "var(--text-muted)" } : {}),
                        }}
                        placeholder={
                          isPoints
                            ? "Loyalty Points Redemption"
                            : line.method === "CASH"
                            ? "Cash notes..."
                            : "Approval code / Ref #"
                        }
                        value={line.reference || ""}
                        disabled={isPoints}
                        onChange={(e) => updatePaymentLine(idx, "reference", e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cash Tendered Input & Remaining Purchase Value Reduction */}
            {hasCash && (
              <div style={{ marginBottom: 16, background: "#f8fafc", padding: "12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      Customer Tendered Cash (Rs.)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={`e.g. ${cashAmount.toFixed(2)}`}
                    />
                    {/* Quick Tender Shortcuts */}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setCashTendered(cashAmount.toFixed(2))}
                        className="btn btn-ghost"
                        style={{ padding: "2px 6px", fontSize: 10.5, fontWeight: 700, border: "1px solid var(--border)" }}
                      >
                        Exact
                      </button>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(String(amt))}
                          className="btn btn-secondary"
                          style={{ padding: "2px 6px", fontSize: 10.5, fontWeight: 700 }}
                        >
                          Rs. {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "rgba(16, 185, 129, 0.08)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Change to Return</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent-emerald)" }}>
                      {fmt(changeDue)}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Complete Sale Button - Inside Sticky Footer */}
            </div>

            {/* Sticky Action Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-surface)",
              }}
            >
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
      {/* Fast Keyboard Quantity Entry Modal */}
      <QuantityEntryModal
        isOpen={Boolean(selectedProductForQty)}
        product={selectedProductForQty}
        currentCartQty={
          selectedProductForQty
            ? cart.find((i) => i.product_id === selectedProductForQty.product_id)?.quantity || 0
            : 0
        }
        initialMode={qtyModalMode}
        defaultQuantity={initialModalQty}
        onConfirm={handleQuantityConfirm}
        onClose={() => {
          setSelectedProductForQty(null);
          setTimeout(() => {
            barcodeInputRef.current?.focus();
          }, 50);
        }}
      />

      {/* New Loyalty Customer Registration Modal */}
      <RegisterCustomerModal
        isOpen={showRegisterCustomerModal}
        onClose={() => setShowRegisterCustomerModal(false)}
        defaultCity={cashier?.city || "Galle"}
        onSuccess={(newCustomer) => {
          setCustomer(newCustomer);
          setErrorMsg("");
        }}
      />
    </div>
  );
}
