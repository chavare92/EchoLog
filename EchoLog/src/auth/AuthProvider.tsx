import React from "react";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/store/authAtoms";
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

  // PRD §2.5: Session tokens stored in Jotai atom only (in-memory).
  // On page refresh the user must re-authenticate. No localStorage/sessionStorage persistence.
  function login(user: Cr4c3_userprofilesBase) {
    setCurrentUser(user);
  }

  function logout() {
    setCurrentUser(null);
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
