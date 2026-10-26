"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useApp } from "@/lib/context";

export interface CashierUser {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: "CASHIER" | "ADMIN" | "MANAGER" | string;
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
  const { authenticatedUser } = useApp();
  const [cashier, setCashierState] = useState<CashierUser | null>(null);
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessionData = useCallback(async () => {
    try {
      const res = await fetch("/api/cashier/session");
      const data = await res.json();
      if (data) {
        if (data.cashiers && Array.isArray(data.cashiers)) {
          setCashiers(data.cashiers);
        }
        setManagers(data.managers || []);
        setBranches(data.branches || []);

        // Authenticated cashier is strictly bound from login session
        if (data.currentUser) {
          setCashierState(data.currentUser);
          if (typeof window !== "undefined") {
            localStorage.setItem("nexus_cashier_id", String(data.currentUser.employee_id));
          }
        } else if (!authenticatedUser) {
          setCashierState(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("nexus_cashier_id");
          }
        }
      }
    } catch (e) {
      console.error("Failed to load cashier session", e);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedUser]);

  useEffect(() => {
    if (authenticatedUser) {
      // Immediately seed cashier from authenticatedUser so downstream components never see null while fetching
      setCashierState((prev) => {
        if (prev && prev.employee_id === authenticatedUser.employee_id) return prev;
        return {
          employee_id: authenticatedUser.employee_id,
          branch_id: authenticatedUser.branch_id,
          full_name: authenticatedUser.full_name,
          role: authenticatedUser.role,
          email: authenticatedUser.email,
          branch_name: authenticatedUser.branch_name || "",
          branch_code: `BR${String(authenticatedUser.branch_id).padStart(2, "0")}`,
          city: "",
        };
      });
    } else {
      setCashierState(null);
    }
    fetchSessionData();
  }, [authenticatedUser, fetchSessionData]);

  const setCashier = (_c: CashierUser) => {
    // Manual cashier switching via drop box is disabled; cashier changes only via login
    console.warn("Cashier switching via drop box is disabled. Navigate by signing in.");
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
