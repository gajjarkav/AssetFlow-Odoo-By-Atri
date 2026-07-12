import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import client from "../api/client";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isAssetManager: boolean;
  isDeptHead: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("af_token"));
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("af_token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const { data } = await client.get("/auth/me");
          setUser(data);
        } catch (error) {
          logout();
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [token]);

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("af_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const isAdmin = user?.role === "ADMIN";
  const isAssetManager = user?.role === "ASSET_MANAGER";
  const isDeptHead = user?.role === "DEPARTMENT_HEAD";

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin, isAssetManager, isDeptHead }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
