import { useEffect, useState, useCallback } from "react";
import { loadDB, getSession, type User } from "@/lib/store";

export function useDB() {
  const [db, setDb] = useState(() => loadDB());
  useEffect(() => {
    const h = () => setDb(loadDB());
    window.addEventListener("acadex:db", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("acadex:db", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return db;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(() => getSession());
  useEffect(() => {
    const h = () => setUser(getSession());
    window.addEventListener("acadex:session", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("acadex:session", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return user;
}

export function useForceUpdate() {
  const [, set] = useState(0);
  return useCallback(() => set((n) => n + 1), []);
}
