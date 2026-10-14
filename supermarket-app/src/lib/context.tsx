"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Branch, Employee, UserRole } from "./types";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

interface AppContextType {
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  currentEmployee: Employee | null;
  setCurrentEmployee: (employee: Employee) => void;
  branches: Branch[];
  employees: Employee[];
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  removeToast: (id: string) => void;
  refreshAppData: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const switchRole = (role: UserRole) => {
    const empWithRole = employees.find((e) => e.role === role);
    if (empWithRole) {
      setCurrentEmployee(empWithRole);
      showToast(`Switched active view to ${role} (${empWithRole.full_name})`, "info");
    } else if (currentEmployee) {
      setCurrentEmployee({
        ...currentEmployee,
        role,
      });
      showToast(`Switched active role to ${role}`, "info");
    } else {
      showToast(`Role switched to ${role}`, "info");
    }
  };

  const refreshAppData = async () => {
    try {
      const [resBranches, resEmployees] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/employees"),
      ]);
      const dataBranches = await resBranches.json();
      const dataEmployees = await resEmployees.json();

      if (Array.isArray(dataBranches)) {
        setBranches(dataBranches);
        if (!currentBranch && dataBranches.length > 0) {
          setCurrentBranch(dataBranches[0]);
        }
      }

      if (Array.isArray(dataEmployees)) {
        setEmployees(dataEmployees);
        if (!currentEmployee && dataEmployees.length > 0) {
          // Default to Admin or Manager
          const adminOrManager = dataEmployees.find(
            (e: Employee) => e.role === "ADMIN" || e.role === "MANAGER"
          ) || dataEmployees[0];
          setCurrentEmployee(adminOrManager);
        }
      }
    } catch (err) {
      console.error("Failed to load initial branches/employees:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAppData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        currentEmployee,
        setCurrentEmployee,
        branches,
        employees,
        toasts,
        showToast,
        removeToast,
        refreshAppData,
        switchRole,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
