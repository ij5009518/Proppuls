import { useState, useEffect } from "react";
import TenantLogin from "./TenantLogin";
import TenantDashboard from "./TenantDashboard";

export default function TenantPortal() {
  const [tenant, setTenant] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on component mount
    const savedToken = localStorage.getItem("tenantToken");
    if (savedToken) {
      // Verify the token by attempting to fetch tenant profile
      fetch("/api/tenant/profile", {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Invalid token");
        })
        .then(profile => {
          setTenant(profile);
          setToken(savedToken);
        })
        .catch(() => {
          // Invalid or expired token
          localStorage.removeItem("tenantToken");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (tenantData: any, sessionToken: string) => {
    setTenant(tenantData);
    setToken(sessionToken);
  };

  const handleLogout = () => {
    setTenant(null);
    setToken(null);
    localStorage.removeItem("tenantToken");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tenant || !token) {
    return <TenantLogin onLogin={handleLogin} />;
  }

  return <TenantDashboard tenant={tenant} token={token} onLogout={handleLogout} />;
}