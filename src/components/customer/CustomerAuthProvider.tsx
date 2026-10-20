import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { demoLogIn, demoLogOut, demoSignUp, readDemoAuth, setAuthMode } from "@/lib/services/demo-auth";
import type { CustomerIdentity } from "@/lib/demo/customer-auth";

interface AuthContext { user: CustomerIdentity | null; loading: boolean; mode: "cloud" | "demo"; changeMode: (mode: "cloud" | "demo") => void; logOut: () => Promise<void>; localLogIn: typeof demoLogIn; localSignUp: typeof demoSignUp }
const CustomerAuthContext = createContext<AuthContext>({ user: null, loading: true, mode: "cloud", changeMode: () => {}, logOut: async () => {}, localLogIn: demoLogIn, localSignUp: demoSignUp });
export const useCustomerAuth = () => useContext(CustomerAuthContext);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [cloudUser, setCloudUser] = useState<CustomerIdentity | null>(null);
  const [local, setLocal] = useState<{ mode: "cloud" | "demo"; user: CustomerIdentity | null }>({ mode: "cloud", user: null });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    const syncDemo = () => setLocal(readDemoAuth());
    syncDemo();
    window.addEventListener("resolveiq-auth", syncDemo);
    window.addEventListener("storage", syncDemo);
    let identityVersion = 0;
    const initialVersion = identityVersion;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      identityVersion++;
      const identity = session?.user;
      setCloudUser(identity ? { id: identity.id, name: String(identity.user_metadata["name"] ?? "Customer"), email: identity.email ?? "" } : null);
      setLoading(false);
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (active && identityVersion === initialVersion) { const identity = data.user; setCloudUser(identity ? { id: identity.id, name: String(identity.user_metadata["name"] ?? "Customer"), email: identity.email ?? "" } : null); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener("resolveiq-auth", syncDemo); window.removeEventListener("storage", syncDemo); };
  }, [queryClient, router]);
  const logOut = async () => {
    if (local.mode === "demo") demoLogOut();
    else { const result = await supabase.auth.signOut(); if (result.error) throw result.error; }
  };
  return <CustomerAuthContext.Provider value={{ user: local.mode === "demo" ? local.user : cloudUser, loading: local.mode === "demo" ? false : loading, mode: local.mode, changeMode: setAuthMode, logOut, localLogIn: demoLogIn, localSignUp: demoSignUp }}>{children}</CustomerAuthContext.Provider>;
}