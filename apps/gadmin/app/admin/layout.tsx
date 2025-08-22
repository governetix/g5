"use client";
import React from 'react';
import '../globals.css';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { TenantProvider } from '../../components/tenant/TenantProvider';
import { useI18n } from '../../components/i18n/I18nProvider';
import { ThemeProvider } from '../../components/theme/ThemeProvider';
import { ResourcesProvider } from '../../components/theme/ResourcesProvider';

function Sidebar() {
  const { t } = useI18n();
  return (
    <>
      <h1 className="font-semibold text-lg">gAdmin</h1>
      <nav className="flex flex-col text-sm space-y-2">
        <a href="/admin/dashboard" className="hover:underline">Dashboard</a>
        <a href="/admin/themes" className="hover:underline font-semibold">Temas</a>
        <a href="#" className="hover:underline">Usuarios</a>
        <a href="#" className="hover:underline">Configuración</a>
        <a href="#" className="hover:underline">Reportes</a>
        <div className="pt-2 border-t border-border" />
        <a href="/admin/style" className="hover:underline">{t('style')}</a>
        <a href="/admin/status" className="hover:underline">Status</a>
        <a href="/admin/theme" className="hover:underline text-muted-foreground">Editor rápido (legacy)</a>
      </nav>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <ThemeProvider>
          <ResourcesProvider>
          <div className="min-h-screen flex flex-row bg-background text-foreground">
            <aside className="w-56 border-r border-border p-4 space-y-4">
              <Sidebar />
            </aside>
            <div className="flex-1 flex flex-col min-h-screen">
              <header className="h-14 border-b border-border flex items-center justify-between px-4">
                <div className="text-sm text-muted-foreground">Barra superior (buscador global, accesos rápidos)</div>
                <div className="flex items-center gap-2 text-sm">
                  <button className="px-2 py-1 rounded border">Buscar</button>
                  <button className="px-2 py-1 rounded bg-primary text-primary-foreground">Acción</button>
                </div>
              </header>
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
          </ResourcesProvider>
        </ThemeProvider>
      </TenantProvider>
    </AuthProvider>
  );
}

export const dynamic = 'force-dynamic';
