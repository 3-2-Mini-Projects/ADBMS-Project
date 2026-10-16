"use client";

import React, { useState } from "react";
import { useCashier, ManagerUser } from "@/lib/cashierContext";

interface ManagerAuthModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSuccess: (manager: ManagerUser) => void;
}

export default function ManagerAuthModal({
  isOpen,
  title = "Manager Authorization Required",
  description = "This action requires an authorized manager's override PIN.",
  onClose,
  onSuccess,
}: ManagerAuthModalProps) {
  const { managers, verifyManagerPin } = useCashier();
  const [selectedManagerId, setSelectedManagerId] = useState<number>(
    managers.length > 0 ? managers[0].employee_id : 1
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await verifyManagerPin(selectedManagerId, pin);
      if (res.authorized) {
        const mgr = managers.find((m) => m.employee_id === selectedManagerId) || {
          employee_id: selectedManagerId,
          full_name: "Authorized Manager",
          role: "MANAGER" as const,
          branch_id: 1,
          email: "",
          branch_name: "",
          branch_code: "",
        };
        setPin("");
        onSuccess(mgr);
        onClose();
      } else {
        setError(res.error || "Authorization failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440, width: "100%", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(210, 153, 34, 0.15)",
              color: "var(--accent-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              border: "1px solid rgba(210, 153, 34, 0.3)",
            }}
          >
            🛡️
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{description}</p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(248, 81, 73, 0.15)",
              color: "var(--accent-rose)",
              fontSize: 12,
              marginBottom: 16,
              border: "1px solid rgba(248, 81, 73, 0.3)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              Select Authorizing Manager
            </label>
            <select
              className="input"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(Number(e.target.value))}
            >
              {managers.map((m) => (
                <option key={m.employee_id} value={m.employee_id}>
                  {m.full_name} ({m.branch_name || `Branch #${m.branch_id}`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              Manager Authorization PIN
            </label>
            <input
              type="password"
              className="input"
              placeholder="Enter PIN (Default: 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              required
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Demo testing default PIN: <code style={{ color: "var(--accent-blue)" }}>1234</code>
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPin("");
                setError("");
                onClose();
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Verifying..." : "Authorize Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
