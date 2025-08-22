"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface Tenant { id: string; name: string; }
interface TenantContextValue {
  tenantId: string | null;
  tenants: Tenant[];
  setTenant: (id: string) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const DUMMY_TENANTS: Tenant[] = [
  { id: 't_demo_1', name: 'Demo Tenant 1' },
  { id: 't_demo_2', name: 'Demo Tenant 2' }
];

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('tenant_id');
      if (stored) setTenantId(stored);
    }
  }, []);

  const setTenant = useCallback((id: string) => {
    setTenantId(id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tenant_id', id);
    }
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, tenants: DUMMY_TENANTS, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
