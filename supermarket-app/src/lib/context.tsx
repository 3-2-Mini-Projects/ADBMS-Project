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
  setCurrentEmployee: (employee: Employee | null) => void;
  authenticatedUser: Employee | null;
  branches: Branch[];
  employees: Employee[];
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  removeToast: (id: string) => void;
  refreshAppData: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<Employee | null>(null);
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


  const refreshAppData = async () => {
    try {
      const [resBranches, resEmployees, resMe] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/employees"),
        fetch("/api/auth/me"),
      ]);

      const dataBranches = await resBranches.json().catch(() => []);
      const dataEmployees = await resEmployees.json().catch(() => []);
      const dataMe = resMe.ok ? await resMe.json().catch(() => ({})) : null;

      if (Array.isArray(dataBranches)) {
        setBranches(dataBranches);
        if (!currentBranch && dataBranches.length > 0) {
          setCurrentBranch(dataBranches[0]);
        }
      }

      if (Array.isArray(dataEmployees)) {
        const allowedRoles = ["ADMIN", "MANAGER", "HR", "STOCK_CLERK", "CATALOG_MANAGER", "MARKETING", "CASHIER"];
        const validEmployees = dataEmployees.filter((e: Employee) => allowedRoles.includes(e.role));
        setEmployees(validEmployees);
      }

      if (dataMe?.user) {
        const authEmp: Employee = {
          employee_id: dataMe.user.employee_id,
          branch_id: dataMe.user.branch_id,
          branch_name: dataMe.user.branch_name,
          full_name: dataMe.user.full_name,
          role: dataMe.user.role,
          email: dataMe.user.email,
          monthly_salary: 0,
          is_active: 1,
          hire_date: "",
          created_at: "",
        };
        setAuthenticatedUser(authEmp);
        setCurrentEmployee(authEmp);

        if (Array.isArray(dataBranches) && dataBranches.length > 0) {
          if (dataMe.user.role === "MARKETING") {
            // Marketing Manager automatically defaults to Colombo Main
            const colomboBranch = dataBranches.find(
              (b: Branch) =>
                b.name?.toLowerCase().includes("colombo main") ||
                b.branch_code === "BR01" ||
                b.city?.toLowerCase() === "colombo" ||
                b.branch_id === 1
            );
            if (colomboBranch) {
              setCurrentBranch(colomboBranch);
            } else {
              const userBranch = dataBranches.find(
                (b: Branch) => b.branch_id === dataMe.user.branch_id
              );
              setCurrentBranch(userBranch || dataBranches[0]);
            }
          } else {
            const userBranch = dataBranches.find(
              (b: Branch) => b.branch_id === dataMe.user.branch_id
            );
            if (userBranch) {
              setCurrentBranch(userBranch);
            }
          }
        }
      } else {
        setAuthenticatedUser(null);
        setCurrentEmployee(null);
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          !window.location.pathname.startsWith("/activate-account")
        ) {
          window.location.replace("/login");
        }
      }
    } catch (err) {
      console.error("Failed to load initial application context:", err);
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
        authenticatedUser,
        branches,
        employees,
        toasts,
        showToast,
        removeToast,
        refreshAppData,
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
