import React from "react";
import { useAtom } from "jotai";
import { currentUserAtom, SESSION_STORAGE_KEY } from "@/store/authAtoms";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

interface AuthContextValue {
  login: (user: Cr4c3_userprofilesBase) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextValue>({
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setCurrentUser] = useAtom(currentUserAtom);

  function login(user: Cr4c3_userprofilesBase) {
    setCurrentUser(user);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  function logout() {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
