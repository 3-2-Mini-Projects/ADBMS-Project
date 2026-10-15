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
  switchRole: (role: UserRole) => void;
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
      showToast(`Switched active view role to ${role}`, "info");
    } else {
      showToast(`Switched active view role to ${role}`, "info");
    }
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
        setEmployees(dataEmployees);
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

        if (Array.isArray(dataBranches)) {
          const userBranch = dataBranches.find(
            (b: Branch) => b.branch_id === dataMe.user.branch_id
          );
          if (userBranch) {
            setCurrentBranch(userBranch);
          }
        }
      } else {
        setAuthenticatedUser(null);
        setCurrentEmployee(null);
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
