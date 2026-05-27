import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout, getStoredUser, setStoredUser } from "@/lib/api";

export type Role = "student" | "teacher" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone_number?: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setReady(true);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    setStoredUser(u);
  };

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    persist(u);
    return u as User;
  };

  const register = async (name: string, email: string, password: string) => {
    const u = await apiRegister(name, email, password);
    persist(u);
    return u as User;
  };

  const logout = async () => {
    await apiLogout();
    persist(null);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setStoredUser(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUser, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function dashboardPathFor(role: Role) {
  return `/${role}/dashboard`;
}
