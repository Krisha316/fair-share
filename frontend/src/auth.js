import { createContext, useContext, useEffect, useState } from "react";
import { api, getUserId, setUserId, clearUserId } from "./api";
import { setCurrency } from "./utils";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getUserId());

  const applyUser = (u) => {
    setCurrency(u?.currency);
    setUser(u);
  };

  useEffect(() => {
    if (!getUserId()) return;
    api
      .get("/auth/me")
      .then(applyUser)
      .catch(clearUserId)
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, body) => {
    const data = await api.post(path, body);
    setUserId(data.user.id);
    applyUser(data.user);
  };

  const value = {
    user,
    loading,
    login: (body) => authenticate("/auth/login", body),
    register: (body) => authenticate("/auth/register", body),
    updateUser: (u) =>
      setUser((prev) => {
        const next = { ...prev, ...u };
        setCurrency(next.currency);
        return next;
      }),
    logout: () => {
      clearUserId();
      applyUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}