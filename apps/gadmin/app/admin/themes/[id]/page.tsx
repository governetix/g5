"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getThemeById, updateTheme } from '../../../../lib/theme/localRegistry';
import { useThemeTokens } from '../../../../components/theme/ThemeProvider';
import type { ThemeTokens } from '../../../../lib/theme/tokensSchema';
import { apiClient } from '../../../../lib/apiClient';

type Tab = 'fundamentos'|'layout'|'componentes'|'viz'|'a11y'|'i18n'|'gob';

function hexToRgb(h: string){const x=h.replace('#','');const p=x.length===3?x.split('').map(c=>c+c):[x.slice(0,2),x.slice(2,4),x.slice(4,6)];const [r,g,b]=p.map(y=>parseInt(y,16));return{r,g,b};}
function relLum(hex:string){const {r,g,b}=hexToRgb(hex);const t=(v:number)=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*t(r)+0.7152*t(g)+0.0722*t(b)}
function contrast(a:string,b:string){const L1=relLum(a),L2=relLum(b);const l=Math.max(L1,L2),d=Math.min(L1,L2);return (l+0.05)/(d+0.05)}
function wcag(r:number){if(r>=7)return 'AAA';if(r>=4.5)return 'AA';if(r>=3)return 'A';return ''}

export default function ThemeEditor({ params }:{ params:{ id: string } }){
  const { tokens, update } = useThemeTokens();
  const [tab,setTab]=useState<Tab>('fundamentos');
  const [id] = useState<string>(params.id);
  const [name,setName]=useState('');
  const [status,setStatus]=useState<'draft'|'staging'|'canary'|'published'|'inactive'>('draft');
  const [version,setVersion]=useState<number>(1);
  const [init, setInit] = useState(false);
  const [editable, setEditable] = useState(false);
  const [mode, setMode] = useState<'api'|'local'>('local');
  const stageLabel = useMemo(()=>{
    switch (status) {
      case 'staging': return 'Prueba interna';
      case 'canary': return 'Implementación parcial';
      case 'published': return 'Tema publicado';
      default: return 'Borrador no publicado';
    }
  }, [status]);

  useEffect(()=>{
    (async()=>{
      // Try API first
      try {
        const theme = await apiClient.request<any>({ path: `/themes/${id}` });
        let tokens: any | undefined = undefined;
        try {
          const snaps = await apiClient.listThemeSnapshots(id);
          const active = snaps?.find((s:any)=> s.id === theme.activeSnapshotId) || snaps?.[0];
          tokens = active?.tokens;
        } catch {}
        setName(theme.name);
        setStatus((theme.status||'draft').toLowerCase());
        setVersion(theme.version||1);
        setEditable(true);
        if (tokens) update({ ...tokens });
        setMode('api');
        setInit(true);
        return;
      } catch {}
      // Fallback local
      const t = getThemeById(id);
      if (t){ setName(t.name); setStatus((t.status as any)||'draft'); setVersion(t.version||1); setEditable(t.source==='custom'); update({ ...t.tokens }); setInit(true); setMode('local'); }
    })();
  },[id, update]);

  useEffect(()=>{ if (init) { const i = setTimeout(async()=>{
    if (mode==='api') {
      try { await apiClient.updateTheme(id, { name, status }); return; } catch {}
    }
    updateTheme(id, { name, status, updatedBy: 'admin' });
  }, 400); return ()=>clearTimeout(i); } },[name,status,mode,id]);

  // Persist token updates per-theme (custom only)
  useEffect(()=>{ if (init && editable) { const i = setTimeout(async()=>{
    if (mode==='api') {
      try { await apiClient.createThemeSnapshot(id, { ...tokens }, { label: 'Autosave', activate: true }); return; } catch {}
    }
    updateTheme(id, { tokens: { ...tokens }, updatedBy: 'admin' });
  }, 600); return ()=>clearTimeout(i); } },[tokens, init, editable, id, mode]);

  const tabs: {key:Tab;label:string}[] = useMemo(()=>[
    {key:'fundamentos',label:'Fundamentos'},
    {key:'layout',label:'Layout'},
    {key:'componentes',label:'Componentes UI'},
    {key:'viz',label:'Visualización de Datos'},
    {key:'a11y',label:'Accesibilidad'},
    {key:'i18n',label:'Internacionalización'},
    {key:'gob',label:'Avanzado / Gobernanza'},
  ],[]);

  const doPreview = ()=>{
    try { sessionStorage.setItem('g5_theme_preview_tokens', JSON.stringify(tokens)); } catch {}
    window.open('/admin/themes/preview','_blank');
  };
  const doSave = ()=>{
    if (mode==='api') { apiClient.updateTheme(id, { name, status }).catch(()=>{}); return; }
    updateTheme(id, { name, status });
  };
  const doPublish = ()=>{
    if (mode==='api') {
      // create labeled snapshot and keep status
      apiClient.createThemeSnapshot(id, { ...tokens }, { label: 'Publish', activate: true })
        .then(()=> apiClient.updateTheme(id, { status: 'published' }))
        .then(()=> setStatus('published'))
        .catch(()=>{});
      return;
    }
    const next = status==='draft' ? 'staging' : status==='staging' ? 'canary' : 'published';
    setStatus(next as any);
    updateTheme(id, { status: next as any });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <nav className="text-xs text-muted-foreground font-medium"><Link href="/admin/themes">Temas</Link> <span className="mx-1">/</span> <span className="text-foreground font-semibold">{name||'Tema'}</span></nav>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded border text-xs capitalize font-semibold ${status==='published'?'bg-emerald-50 border-emerald-200 text-emerald-700':status==='canary'?'bg-amber-50 border-amber-200 text-amber-700':status==='staging'?'bg-blue-50 border-blue-200 text-blue-700':'bg-slate-50 border-slate-200 text-slate-700'}`}>{status}</span>
            <button className="px-2 py-1 rounded border text-xs font-medium" onClick={doSave}>Guardar</button>
            <button className="px-2 py-1 rounded border text-xs font-medium" onClick={doPreview}>Vista previa</button>
            <button className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold shadow-sm" onClick={doPublish}>{status==='draft'?'Publicar a Staging':status==='staging'?'Pasar a Canary':status==='canary'?'Publicar':'Publicado'}</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <input value={name} onChange={e=>setName(e.target.value)} className="px-2 py-1 border rounded text-lg font-semibold bg-background" />
          <span className="text-xs text-muted-foreground">v{version}</span>
        </div>
        <p className="text-base text-muted-foreground">Opciones de personalización del tema</p>
        <p className="text-xs text-muted-foreground font-medium">{stageLabel}</p>
      </header>
      <nav className="border-b border-border">
        <ul className="flex flex-wrap gap-1">
          {tabs.map(t => (
            <li key={t.key}>
              <button onClick={()=>setTab(t.key)} className={`px-3 py-2 text-sm rounded-t font-medium ${tab===t.key? 'bg-card border-x border-t border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
            </li>
          ))}
        </ul>
      </nav>
      {tab==='fundamentos' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Fundamentos (Design Tokens)</h2>
          <p className="text-xs text-muted-foreground">Configura la paleta, tipografía, sombras, bordes y más.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Paleta de colores</h3>
              <p className="text-[11px] text-muted-foreground">Colores base del tema. Para presets rápidos usa el editor legado.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['primary','background','foreground','secondary','accent','muted','destructive','border','input','ring','card','cardForeground','popover','popoverForeground'] as (keyof ThemeTokens)[]).map((key)=> (
                  <label key={key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="capitalize">{key}</span>
                    <input type="color" disabled={!editable} value={String(tokens[key])} onChange={e=>update({ [key]: e.target.value } as any)} className="h-8 w-12 border rounded" />
                  </label>
                ))}
              </div>
              <Link href="/admin/theme" className="underline text-xs">Abrir editor rápido de paleta</Link>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Tipografía</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Familia</span>
                  <select disabled={!editable} value={tokens.fontFamily} onChange={e=>update({ fontFamily: e.target.value })} className="px-2 py-1 border rounded text-xs">
                    <option value="'Inter', system-ui, sans-serif">Inter</option>
                    <option value={'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"'}>System UI</option>
                    <option value="'Roboto', system-ui, sans-serif">Roboto</option>
                    <option value="'Source Sans 3', system-ui, sans-serif">Source Sans 3</option>
                  </select>
                </label>
                <label className="flex flex-col">
                  <span>Tamaño base (px)</span>
                  <input disabled={!editable} type="number" min={10} max={22} value={tokens.fontSizeBase} onChange={e=>update({ fontSizeBase: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Peso regular</span>
                  <input disabled={!editable} type="number" min={300} max={700} step={100} value={tokens.fontWeightRegular} onChange={e=>update({ fontWeightRegular: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Peso medio</span>
                  <input disabled={!editable} type="number" min={400} max={800} step={100} value={tokens.fontWeightMedium} onChange={e=>update({ fontWeightMedium: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Peso negrita</span>
                  <input disabled={!editable} type="number" min={600} max={900} step={100} value={tokens.fontWeightBold} onChange={e=>update({ fontWeightBold: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Bordes y radios</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Radio (px)</span>
                  <input disabled={!editable} type="number" min={0} max={24} value={tokens.radius} onChange={e=>update({ radius: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Borde</span>
                  <input disabled={!editable} type="color" value={tokens.border} onChange={e=>update({ border: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Sombras y elevación</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder — las sombras se derivarán en CSS según tokens.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Espaciado y layout base</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Unidad (px)</span>
                  <input disabled={!editable} type="number" min={2} max={12} value={tokens.spacing} onChange={e=>update({ spacing: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Header (px)</span>
                  <input disabled={!editable} type="number" min={40} max={96} value={tokens.headerHeight} onChange={e=>update({ headerHeight: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Sidebar (px)</span>
                  <input disabled={!editable} type="number" min={180} max={400} value={tokens.sidebarWidth} onChange={e=>update({ sidebarWidth: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Movimiento</h3>
              <div className="flex gap-3 text-xs">
                {(['full','reduced','none'] as ThemeTokens['motion'][]).map(m => (
                  <label key={m} className="flex items-center gap-1"><input disabled={!editable} type="radio" name="motion" checked={tokens.motion===m} onChange={()=>update({ motion: m })} /> {m}</label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab==='layout' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Configuración de Layout y Grilla</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Breakpoints</h3>
              <p className="text-[11px] text-muted-foreground">Definición de puntos de quiebre para el diseño responsivo.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Small (sm)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.breakpointSm} onChange={e=>update({ breakpointSm: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Medium (md)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.breakpointMd} onChange={e=>update({ breakpointMd: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Large (lg)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.breakpointLg} onChange={e=>update({ breakpointLg: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Extra Large (xl)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.breakpointXl} onChange={e=>update({ breakpointXl: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Header y Footer</h3>
              <p className="text-[11px] text-muted-foreground">Alturas de la cabecera y el pie de página.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Header (px)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.headerHeight} onChange={e=>update({ headerHeight: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Footer (px)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.footerHeight} onChange={e=>update({ footerHeight: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Sidebar</h3>
              <p className="text-[11px] text-muted-foreground">Ancho y comportamiento de la barra lateral.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Ancho (px)</span>
                  <input disabled={!editable} type="number" min={0} value={tokens.sidebarWidth} onChange={e=>update({ sidebarWidth: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Dirección LTR/RTL</h3>
              <p className="text-[11px] text-muted-foreground">Dirección del layout para internacionalización.</p>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1"><input disabled={!editable} type="radio" name="direction" checked={tokens.direction==='ltr'} onChange={()=>update({ direction: 'ltr' })} /> LTR</label>
                <label className="flex items-center gap-1"><input disabled={!editable} type="radio" name="direction" checked={tokens.direction==='rtl'} onChange={()=>update({ direction: 'rtl' })} /> RTL</label>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab==='componentes' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Componentes UI</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Botones</h3>
              <p className="text-[11px] text-muted-foreground">Color primario y radio de los botones.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Color Primario</span>
                  <input disabled={!editable} type="color" value={tokens.primary} onChange={e=>update({ primary: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Radio (px)</span>
                  <input disabled={!editable} type="number" min={0} max={24} value={tokens.radius} onChange={e=>update({ radius: Number(e.target.value) })} className="px-2 py-1 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Inputs y Selects</h3>
              <p className="text-[11px] text-muted-foreground">Color de fondo y borde de los campos de entrada.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Fondo</span>
                  <input disabled={!editable} type="color" value={tokens.input} onChange={e=>update({ input: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Borde</span>
                  <input disabled={!editable} type="color" value={tokens.border} onChange={e=>update({ border: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Cards y Tabs</h3>
              <p className="text-[11px] text-muted-foreground">Color de fondo y texto de las tarjetas.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Fondo</span>
                  <input disabled={!editable} type="color" value={tokens.card} onChange={e=>update({ card: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
                <label className="flex flex-col">
                  <span>Texto</span>
                  <input disabled={!editable} type="color" value={tokens.cardForeground} onChange={e=>update({ cardForeground: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Tablas y Listas</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Toasts y Modales</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder.</p>
            </div>
          </div>
        </section>
      )}

      {tab==='viz' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Paletas y Estilos de Gráficos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Paleta categórica</h3>
              <p className="text-[11px] text-muted-foreground">Definición de colores por categoría para los gráficos.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['datavizColor1','datavizColor2','datavizColor3','datavizColor4','datavizColor5'] as (keyof ThemeTokens)[]).map((key)=> (
                  <label key={key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="capitalize">{key.replace('datavizColor','Color ')}</span>
                    <input type="color" disabled={!editable} value={String(tokens[key])} onChange={e=>update({ [key]: e.target.value } as any)} className="h-8 w-12 border rounded" />
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Ejes y leyendas</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Tipos de gráficos</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Estados sin datos</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder.</p>
            </div>
          </div>
        </section>
      )}

      {tab==='a11y' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Accesibilidad y Estándares WCAG</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Contraste</h3>
              <p className="text-[11px] text-muted-foreground">Verificador en vivo y objetivo AA/AAA.</p>
              <div className="mt-2 text-xs space-y-1">
                {(()=>{
                  const pairs = [
                    ['Primario vs Fondo', tokens.primary, tokens.background],
                    ['Texto vs Fondo', tokens.foreground, tokens.background],
                    ['Secundario vs Fondo', tokens.secondary, tokens.background],
                  ] as const;
                  const items = pairs.map(([label,a,b])=>({label, r: contrast(a,b)}));
                  const global = items.reduce((m,i)=>Math.min(m,i.r), 10);
                  const grade = wcag(global);
                  return (
                    <div className="border rounded p-2 space-y-1">
                      <div className="flex items-center justify-between"><span>WCAG Rating Panel</span><span className="px-2 py-0.5 rounded border">{grade||'—'}</span></div>
                      {items.map(i=> (
                        <div key={i.label} className="flex items-center justify-between"><span>{i.label}</span><span>{i.r.toFixed(2)}:1</span></div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Indicadores de foco</h3>
              <p className="text-[11px] text-muted-foreground">Color del anillo de foco.</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex flex-col">
                  <span>Anillo de foco</span>
                  <input disabled={!editable} type="color" value={tokens.ring} onChange={e=>update({ ring: e.target.value })} className="h-8 w-12 border rounded" />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Preferencias de movimiento</h3>
              <p className="text-[11px] text-muted-foreground">Pleno, reducido o sin animación (gestionado en Fundamentos).</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Modo daltónico</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para futuros preajustes de color.</p>
            </div>
          </div>
        </section>
      )}

      {tab==='i18n' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Opciones de idioma y formatos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Dirección LTR/RTL</h3>
              <p className="text-[11px] text-muted-foreground">Dirección del layout para internacionalización.</p>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1"><input disabled={!editable} type="radio" name="direction" checked={tokens.direction==='ltr'} onChange={()=>update({ direction: 'ltr' })} /> LTR</label>
                <label className="flex items-center gap-1"><input disabled={!editable} type="radio" name="direction" checked={tokens.direction==='rtl'} onChange={()=>update({ direction: 'rtl' })} /> RTL</label>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Idioma</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para la configuración de idioma y fallback.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Fecha y hora</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para el formato de fecha/hora y calendario.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Moneda</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para el símbolo y separadores de moneda.</p>
            </div>
          </div>
        </section>
      )}

      {tab==='gob' && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Control de versiones y permisos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Historial de versiones</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para el historial de cambios y rollback.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Importación/Exportación</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para importar y exportar temas en formato JSON.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Permisos por rol</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para la configuración de permisos por rol.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-medium">Ámbitos de aplicación</h3>
              <p className="text-[11px] text-muted-foreground">Placeholder para definir los ámbitos de aplicación del tema.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
