"use client";

import React, { useState } from "react";
import { UserPlus, Sparkles, X, Check, ShieldCheck, CreditCard, Phone, Mail, MapPin } from "lucide-react";

export interface RegisteredCustomer {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  points_balance: number;
}

interface RegisterCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: RegisteredCustomer) => void;
  defaultCity?: string;
}

export default function RegisterCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCity = "Galle",
}: RegisterCustomerModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [customCardNo, setCustomCardNo] = useState("");
  const [giveBonus, setGiveBonus] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg("Please enter customer's full name");
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 9) {
      setErrorMsg("Please enter a valid phone number (e.g. 0771234567)");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMsg("Customer email is required for loyalty rewards updates (e.g. customer@gmail.com)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/cashier/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
          city: city.trim() || defaultCity,
          card_no: customCardNo.trim() || undefined,
          giveBonus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to register customer");
        return;
      }

      onSuccess(data.customer);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred while registering customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 540, width: "100%", padding: 0 }}>
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.05))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
              }}
            >
              ⭐
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                New Loyalty Customer Registration
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                Enroll member to earn loyalty points on every purchase
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "4px 8px", fontSize: 14 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(248, 81, 73, 0.15)",
                border: "1px solid rgba(248, 81, 73, 0.3)",
                color: "var(--accent-rose)",
                fontSize: 12,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Membership Card Preview Card */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: 18,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 100,
                height: 100,
                background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-emerald)", fontWeight: 800 }}>
                  NEXUS SUPERMARKET
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
                  LOYALTY CLUB CARD
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(210, 153, 34, 0.2)",
                  color: "var(--accent-amber)",
                  border: "1px solid rgba(210, 153, 34, 0.4)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                BRONZE TIER
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Member Name</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                  {fullName.trim() || "Customer Name"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Starting Points</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--accent-emerald)" }}>
                  {giveBonus ? "100 pts" : "0 pts"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: "var(--text-secondary)" }}>
                Full Name <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Kamal Perera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: "var(--text-secondary)" }}>
                Phone Number (Unique) <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="tel"
                className="input"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: "var(--text-secondary)" }}>
                Email Address <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. customer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginTop: 3 }}>
                Required for earning & redeeming points receipts
              </span>
            </div>

            {/* City */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: "var(--text-secondary)" }}>
                City / Location
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Galle"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Optional Custom Card No */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: "var(--text-secondary)" }}>
              Custom Loyalty Card Number (Leave blank to auto-generate)
            </label>
            <input
              type="text"
              className="input mono"
              placeholder="Auto-generated e.g. LOY000001"
              value={customCardNo}
              onChange={(e) => setCustomCardNo(e.target.value.toUpperCase())}
            />
          </div>

          {/* Joining Bonus Checkbox */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              cursor: "pointer",
            }}
            onClick={() => setGiveBonus(!giveBonus)}
          >
            <input
              type="checkbox"
              id="giveBonus"
              checked={giveBonus}
              onChange={(e) => setGiveBonus(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--accent-emerald)", cursor: "pointer" }}
            />
            <label htmlFor="giveBonus" style={{ fontSize: 12, color: "var(--text-primary)", cursor: "pointer", userSelect: "none" }}>
              <strong>Grant +100 Points Welcome Bonus</strong> (Recorded as an auditable EARN transaction in points history)
            </label>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-emerald"
              disabled={loading}
              style={{ minWidth: 160 }}
            >
              {loading ? "Registering Member..." : "⭐ Register & Attach"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
