"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getActiveThemeId, getThemeById } from '../../../../lib/theme/localRegistry';
import { useThemeTokens } from '../../../../components/theme/ThemeProvider';

export default function ThemePreview(){
  const { update } = useThemeTokens();
  const [ready,setReady]=useState(false);
  const activeId = useMemo(()=>getActiveThemeId(),[]);
  useEffect(()=>{
    try {
      const raw = sessionStorage.getItem('g5_theme_preview_tokens');
      if (raw) {
        const tk = JSON.parse(raw);
        update({ ...tk });
        setReady(true);
        return;
      }
    } catch {}
    if (!activeId) return;
    const t = getThemeById(activeId);
    if (t){ update({ ...t.tokens }); setReady(true); }
  },[activeId, update]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vista previa de tema aplicado</h1>
        <Link href="/admin/themes" className="text-sm underline">Volver a Gestión de Temas</Link>
      </div>
      <p className="text-sm text-muted-foreground">Valida accesibilidad, contraste y performance con el tema activo.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4 space-y-3">
          <h2 className="text-sm font-medium">Botones</h2>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1 rounded bg-primary text-primary-foreground">Primario</button>
            <button className="px-3 py-1 rounded bg-secondary text-secondary-foreground">Secundario</button>
            <button className="px-3 py-1 rounded bg-accent text-accent-foreground">Accento</button>
            <button className="px-3 py-1 rounded bg-destructive text-destructive-foreground">Peligro</button>
          </div>
        </div>
        <div className="border rounded p-4 space-y-3">
          <h2 className="text-sm font-medium">Tipografía</h2>
          <p className="text-base">Texto base — lorem ipsum dolor sit amet.</p>
          <p className="text-sm text-muted-foreground">Texto secundario — muted.</p>
          <h3 className="text-lg font-semibold">Encabezado</h3>
        </div>
        <div className="border rounded p-4 space-y-3">
          <h2 className="text-sm font-medium">Tarjetas y tablas</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded p-3 bg-card text-card-foreground">Card</div>
            <div className="border rounded p-3 bg-popover text-popover-foreground">Popover</div>
          </div>
        </div>
        <div className="border rounded p-4 space-y-3">
          <h2 className="text-sm font-medium">Campos de formulario</h2>
          <input className="px-2 py-1 border rounded w-full" placeholder="Placeholder" />
          <select className="px-2 py-1 border rounded w-full"><option>Opción</option></select>
        </div>
      </div>
    </div>
  );
}
