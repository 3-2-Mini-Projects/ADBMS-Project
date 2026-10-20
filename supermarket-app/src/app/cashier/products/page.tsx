"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCashier } from "@/lib/cashierContext";
import CameraBarcodeScannerModal from "@/components/CameraBarcodeScannerModal";
import BarcodeGeneratorModal from "@/components/BarcodeGeneratorModal";

interface ProductRow {
  product_id: number;
  barcode: string;
  name: string;
  brand?: string;
  unit_price: string | number;
  tax_rate: string | number;
  reorder_level: number;
  is_active: number;
  category_name?: string;
  quantity_on_hand: number;
  reserved_qty: number;
  available_stock: number;
}

export default function CashierProductsPage() {
  const { cashier } = useCashier();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Array<{ category_id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [barcodeModalItem, setBarcodeModalItem] = useState<{ barcode: string; name: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!cashier) return;
    setLoading(true);
    try {
      let url = `/api/cashier/products?branchId=${cashier.branch_id}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedCat) url += `&categoryId=${selectedCat}`;

      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [cashier, search, selectedCat]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            🔍 Product & Branch Stock Lookup
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Real-time selling prices and inventory availability for <strong>{cashier?.branch_name}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/cashier/pos" className="btn btn-emerald">
            🛒 Go to POS Terminal
          </Link>
        </div>
      </div>

      {/* Permissions Banner */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--accent-blue)",
        }}
      >
        <span>
          ℹ️ <strong>Read-Only Terminal:</strong> Cashier role can check selling prices and stock levels. Adding products and editing selling prices is restricted to Catalog Managers.
        </span>
        <span className="badge badge-completed">READ ONLY</span>
      </div>

      {/* Search & Category Filter */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          padding: "14px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ flex: 1, minWidth: 260, display: "flex", gap: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="Search by product name, barcode (e.g. 4790001), or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCameraScanner(true)}
            title="Scan barcode with camera"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
          >
            <span>📷</span> Camera Scan
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setBarcodeModalItem({ barcode: "4790001", name: "Sample Item" })}
            title="Generate custom or test barcodes"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
          >
            <span>🏷️</span> Barcodes
          </button>
        </div>

        <select
          className="input"
          style={{ width: 180 }}
          value={selectedCat || ""}
          onChange={(e) => setSelectedCat(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>

        <button className="btn btn-ghost" onClick={() => { setSearch(""); setSelectedCat(null); }}>
          Reset
        </button>
      </div>

      {/* Products Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th style={{ textAlign: "right" }}>Selling Price</th>
              <th style={{ textAlign: "right" }}>Tax Rate</th>
              <th style={{ textAlign: "center" }}>Qty on Hand</th>
              <th style={{ textAlign: "center" }}>Reserved</th>
              <th style={{ textAlign: "center" }}>Available Stock</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Barcode</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  Loading product inventory...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No products found for &quot;{search}&quot;
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isOutOfStock = p.available_stock <= 0;
                const isLowStock = p.available_stock > 0 && p.available_stock <= p.reorder_level;
                return (
                  <tr key={p.product_id}>
                    <td className="mono" style={{ color: "var(--accent-blue)", fontWeight: 700 }}>
                      {p.barcode}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                    </td>
                    <td>{p.category_name || "General"}</td>
                    <td>{p.brand || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>
                      {fmt(p.unit_price)}
                    </td>
                    <td style={{ textAlign: "right" }}>{Number(p.tax_rate) > 0 ? `${p.tax_rate}%` : "0% (Exempt)"}</td>
                    <td style={{ textAlign: "center" }}>{p.quantity_on_hand}</td>
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{p.reserved_qty}</td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: isOutOfStock
                            ? "var(--accent-rose)"
                            : isLowStock
                            ? "var(--accent-amber)"
                            : "var(--accent-emerald)",
                        }}
                      >
                        {p.available_stock}
                      </span>
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge badge-cancelled">OUT OF STOCK</span>
                      ) : isLowStock ? (
                        <span className="badge badge-open">LOW STOCK</span>
                      ) : (
                        <span className="badge badge-completed">IN STOCK</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => setBarcodeModalItem({ barcode: p.barcode, name: p.name })}
                        title="View scannable barcode for camera"
                      >
                        🏷️ Barcode
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => setSearch(code)}
      />

      {/* Barcode Generator Modal */}
      {barcodeModalItem && (
        <BarcodeGeneratorModal
          isOpen={!!barcodeModalItem}
          initialBarcode={barcodeModalItem.barcode}
          initialProductName={barcodeModalItem.name}
          onClose={() => setBarcodeModalItem(null)}
          productsList={products.map((p) => ({
            name: p.name,
            barcode: p.barcode,
            price: p.unit_price,
            category: p.category_name,
          }))}
        />
      )}
    </div>
  );
}
