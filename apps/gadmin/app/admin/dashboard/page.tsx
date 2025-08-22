"use client";
import React from 'react';

function Card({ title, value, footer, children }: { title: string; value?: string; footer?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          {value && <div className="text-2xl font-semibold mt-1">{value}</div>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
      {footer && <div className="text-xs text-muted-foreground mt-3">{footer}</div>}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Usuarios activos" value="1,284" footer="+4.5% vs semana anterior" />
        <Card title="Ingresos (hoy)" value="$12,430" footer="-1.2% vs ayer" />
        <Card title="Tasa de error" value="0.21%" footer="P95 latencia 420ms" />
        <Card title="DLQ pendientes" value="3" footer="0 reprocesados hoy" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Tráfico (7 días)" footer="Actualizado hace 2 min">
          <div className="h-40 bg-muted rounded" />
        </Card>
        <Card title="Errores por servicio" footer="Últimas 24h">
          <div className="h-40 bg-muted rounded" />
        </Card>
        <Card title="Uso por plan" footer="Distribución actual">
          <div className="h-40 bg-muted rounded" />
        </Card>
      </section>
    </div>
  );
}

export const dynamic = 'force-dynamic';
