"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CashierUser {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: "CASHIER";
  email: string;
  branch_name: string;
  branch_code: string;
  city: string;
}

export interface ManagerUser {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: "MANAGER";
  email: string;
  branch_name: string;
  branch_code: string;
}

export interface BranchInfo {
  branch_id: number;
  branch_code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
}

interface CashierContextType {
  cashier: CashierUser | null;
  setCashier: (c: CashierUser) => void;
  cashiers: CashierUser[];
  managers: ManagerUser[];
  branches: BranchInfo[];
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  verifyManagerPin: (managerId: number, pin: string) => Promise<{ authorized: boolean; error?: string; manager?: any }>;
}

const CashierContext = createContext<CashierContextType | undefined>(undefined);

export function CashierProvider({ children }: { children: ReactNode }) {
  const [cashier, setCashierState] = useState<CashierUser | null>(null);
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessionData = async () => {
    try {
      const res = await fetch("/api/cashier/session");
      const data = await res.json();
      if (data.cashiers && Array.isArray(data.cashiers)) {
        setCashiers(data.cashiers);
        setManagers(data.managers || []);
        setBranches(data.branches || []);

        // Load saved cashier from localStorage or default to first active cashier
        const savedId = typeof window !== "undefined" ? localStorage.getItem("nexus_cashier_id") : null;
        let matched = null;
        if (savedId) {
          matched = data.cashiers.find((c: CashierUser) => c.employee_id === Number(savedId));
        }
        if (!matched && data.cashiers.length > 0) {
          matched = data.cashiers[0];
        }
        if (matched) {
          setCashierState(matched);
        }
      }
    } catch (e) {
      console.error("Failed to load cashier session", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const setCashier = (c: CashierUser) => {
    setCashierState(c);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_cashier_id", String(c.employee_id));
    }
  };

  const verifyManagerPin = async (managerId: number, pin: string) => {
    try {
      const res = await fetch("/api/cashier/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId, pin }),
      });
      return await res.json();
    } catch (e: any) {
      return { authorized: false, error: e.message || "Network error" };
    }
  };

  return (
    <CashierContext.Provider
      value={{
        cashier,
        setCashier,
        cashiers,
        managers,
        branches,
        isLoading,
        refreshSession: fetchSessionData,
        verifyManagerPin,
      }}
    >
      {children}
    </CashierContext.Provider>
  );
}

export function useCashier() {
  const context = useContext(CashierContext);
  if (!context) {
    throw new Error("useCashier must be used within a CashierProvider");
  }
  return context;
}
