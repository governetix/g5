"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getAllThemes, setActiveThemeId, duplicateTheme, deleteCustomTheme, renameCustomTheme, saveCustomTheme, getActiveThemeId, setThemeDefault } from '../../../lib/theme/localRegistry';
import { useThemeTokens } from '../../../components/theme/ThemeProvider';
import { apiClient } from '../../../lib/apiClient';

function hexToRgb(h: string){const x=h.replace('#','');const p=x.length===3?x.split('').map(c=>c+c):[x.slice(0,2),x.slice(2,4),x.slice(4,6)];const [r,g,b]=p.map(y=>parseInt(y,16));return{r,g,b};}
function relLum(hex:string){const {r,g,b}=hexToRgb(hex);const t=(v:number)=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*t(r)+0.7152*t(g)+0.0722*t(b)}
function contrast(a:string,b:string){const L1=relLum(a),L2=relLum(b);const l=Math.max(L1,L2),d=Math.min(L1,L2);return (l+0.05)/(d+0.05)}
function scoreBadge(r:number){if(r>=7)return 'AAA';if(r>=4.5)return 'AA';if(r>=3)return 'A';return ''}

type UiTheme = {
  id: string;
  name: string;
  status?: string;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  isDefault?: boolean;
  source?: 'custom'|'preset'|'api';
  tokens: any;
  wcagScore?: 'AAA'|'AA'|'A'|'';
};

export default function ThemesPage(){
  const { update } = useThemeTokens();
  const [query,setQuery]=useState('');
  const [filterStatus,setFilterStatus]=useState<string>('');
  const [filterWcag,setFilterWcag]=useState<string>('');
  const [sort,setSort]=useState<'name'|'updatedAt'|'version'>('updatedAt');
  const [view,setView]=useState<'table'|'cards'>('table');
  const [force,setForce] = useState(0);
  const [mode,setMode] = useState<'api'|'local'>('local');
  const [all,setAll] = useState<UiTheme[]>([]);
  const activeId = useMemo(()=>getActiveThemeId(),[force]);
  const refresh = ()=> setForce(n=>n+1);

  // Try loading from API first, fallback to local registry
  useEffect(()=>{
    let done = false;
    const timeout = setTimeout(()=>{ if (!done) { loadLocal(); } }, 1500);
    (async()=>{
      try {
        const themes = await apiClient.request<any[]>({ path: '/themes' });
        // For each theme, load active snapshot tokens
        const enriched = await Promise.all((themes||[]).map(async (t:any)=>{
          let tokens:any = undefined;
          try {
            const snaps = await apiClient.listThemeSnapshots(t.id);
            const active = snaps?.find((s:any)=> s.id === t.activeSnapshotId) || snaps?.[0];
            tokens = active?.tokens;
          } catch {}
          const r = tokens ? contrast(tokens.primary, tokens.background) : 0;
          const s = tokens ? (scoreBadge(r) as any) : '';
          return {
            id: String(t.id),
            name: t.name,
            status: (t.status||'draft').toLowerCase(),
            version: t.version||1,
            updatedAt: t.updatedAt,
            updatedBy: t.updatedBy,
            isDefault: !!t.isDefault,
            source: 'api',
            tokens: tokens || { primary:'#3b82f6', background:'#ffffff', foreground:'#0f172a', secondary:'#64748b', accent:'#22c55e' },
            wcagScore: s
          } as UiTheme;
        }));
        done = true; clearTimeout(timeout);
        setAll(enriched);
        setMode('api');
      } catch {
        // fallback local
        done = true; clearTimeout(timeout);
        loadLocal();
      }
    })();
    function loadLocal(){
      const list = getAllThemes();
      const enriched = list.map(t=>{
        const r=contrast(t.tokens.primary,t.tokens.background);const s=scoreBadge(r);
        return { ...t, wcagScore: s as any } as UiTheme;
      });
      setAll(enriched);
      setMode('local');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[force]);

  const filtered = useMemo(()=>{
    return all
      .filter(t=>!query || t.name.toLowerCase().includes(query.toLowerCase()))
      .filter(t=>!filterStatus || (t.status||'').toLowerCase()===filterStatus)
      .filter(t=>!filterWcag || (t.wcagScore||'').toLowerCase()===filterWcag)
      .sort((a,b)=>{
        if (sort==='name') return a.name.localeCompare(b.name);
        if (sort==='version') return (b.version||0)-(a.version||0);
        return new Date(b.updatedAt||0).getTime()-new Date(a.updatedAt||0).getTime();
      });
  },[all,query,filterStatus,filterWcag,sort]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">Temas</h1>
            <p className="text-base text-muted-foreground mt-1">Panel maestro para la gestión, edición y publicación de temas visuales.</p>
          </div>
          <span title="Origen de datos" className={`text-xs px-2 py-0.5 rounded border font-semibold ${mode==='api'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-slate-50 border-slate-200 text-slate-700'}`}>{mode.toUpperCase()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-semibold shadow-sm" onClick={async()=>{
            if (mode==='api') {
              try {
                const t = await apiClient.createTheme({ name: 'Nuevo tema' });
                window.location.href = `/admin/themes/${encodeURIComponent(t.id)}`;
                return;
              } catch { /* fallback below */ }
            }
            const rec = saveCustomTheme('Nuevo tema', filtered[0]?.tokens || all[0]?.tokens);
            window.location.href = `/admin/themes/${encodeURIComponent(rec.id)}`;
          }}>Crear tema</button>
                    <button className="px-3 py-1 rounded border text-sm font-medium" onClick={() => document.getElementById('import-input')?.click()}>Importar</button>
          <input type="file" id="import-input" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = async (event) => {
                try {
                  const theme = JSON.parse(event.target?.result as string);
                  await apiClient.importTheme(theme.name, theme.tokens);
                  refresh();
                } catch (error) {
                  console.error('Error importing theme:', error);
                }
              };
              reader.readAsText(file);
            }
          }} />
          <button className="px-3 py-1 rounded border text-sm font-medium">Exportar</button>
          <button className="px-3 py-1 rounded border text-sm font-medium" onClick={()=>{window.location.href='/admin/theme';}}>Prefabricados</button>
          <button className="px-3 py-1 rounded border text-sm font-medium" onClick={()=>{localStorage.clear(); refresh();}}>Restablecer</button>
        </div>
      </header>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre..." className="px-2 py-1 border rounded text-sm" />
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="">Estado</option>
              <option value="draft">Draft</option>
              <option value="staging">Staging</option>
              <option value="canary">Canary</option>
              <option value="published">Published</option>
              <option value="inactive">Inactivo</option>
            </select>
            <select value={filterWcag} onChange={e=>setFilterWcag(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="">WCAG</option>
              <option value="aaa">AAA</option>
              <option value="aa">AA</option>
              <option value="a">A</option>
            </select>
            <select value={sort} onChange={e=>setSort(e.target.value as any)} className="px-2 py-1 border rounded text-sm">
              <option value="updatedAt">Orden: Actualizado</option>
              <option value="name">Orden: Nombre</option>
              <option value="version">Orden: Versión</option>
            </select>
          </div>
          <div className="border rounded overflow-hidden flex">
            <button className={`px-2 py-1 text-sm font-medium ${view==='table'?'bg-muted':''}`} onClick={()=>setView('table')}>Tabla</button>
            <button className={`px-2 py-1 text-sm font-medium ${view==='cards'?'bg-muted':''}`} onClick={()=>setView('cards')}>Tarjetas</button>
          </div>
        </div>
        <h2 className="text-lg font-semibold mt-2 mb-1">Lista de temas</h2>
        <p className="text-sm text-muted-foreground mb-2">Visualiza, filtra y accede a la edición de cada tema. Usa las acciones para editar, duplicar, eliminar, previsualizar o marcar como predeterminado.</p>
        {view==='table' ? (
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-12 bg-muted text-xs px-3 py-2">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-2">Paleta</div>
              <div className="col-span-1">WCAG</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-1">Versión</div>
              <div className="col-span-1">Última Modificación</div>
              <div className="col-span-1">Último Editor</div>
              <div className="col-span-1 text-right">Acciones</div>
            </div>
            <ul>
              {filtered.map(t=>{
                const sw=[t.tokens.primary,t.tokens.secondary,t.tokens.accent,t.tokens.background,t.tokens.foreground];
                return (
                  <li key={t.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm border-t">
                    <div className="col-span-3 flex items-center gap-2">
                      <input defaultValue={t.name} onBlur={async (e)=>{
                        const val = e.target.value.trim()||t.name;
                        if (mode==='api' && t.source==='api') {
                          try { await apiClient.updateTheme(t.id, { name: val }); refresh(); return; } catch {}
                        }
                        if (t.source==='custom') { renameCustomTheme(t.id, val); refresh(); }
                      }} className="px-2 py-1 border rounded bg-background flex-1" disabled={mode==='api' ? t.source!=='api' : t.source!=='custom'} />
                      {(t.isDefault || t.id===activeId) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Default</span>}
                    </div>
                    <div className="col-span-2 flex items-center gap-1">{sw.map((c,i)=>(<span key={i} className="inline-block w-4 h-4 rounded border" style={{backgroundColor:c}} />))}</div>
                    <div className="col-span-1">
                      <span className={`px-2 py-0.5 rounded text-xs border ${t.wcagScore==='AAA'?'bg-emerald-100 border-emerald-300':t.wcagScore==='AA'?'bg-amber-100 border-amber-300':t.wcagScore==='A'?'bg-yellow-100 border-yellow-300':'bg-rose-100 border-rose-300'}`}>{t.wcagScore||'—'}</span>
                    </div>
                    <div className="col-span-2"><span className="text-xs px-2 py-0.5 rounded border">{t.status||'draft'}</span></div>
                    <div className="col-span-1">{t.version||1}</div>
                    <div className="col-span-1 text-xs text-muted-foreground">{t.updatedAt?.slice(0,19).replace('T',' ')||''}</div>
                    <div className="col-span-1 text-xs">{t.updatedBy||'—'}</div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <button className="px-2 py-1 rounded border" title="Editar" onClick={()=>{ window.location.href=`/admin/themes/${encodeURIComponent(t.id)}`; }}>Editar</button>
                      <button className="px-2 py-1 rounded border" title="Duplicar" onClick={async()=>{
                        if (mode==='api' && t.source==='api') {
                          try {
                            const created = await apiClient.createTheme({ name: `${t.name} (copia)` });
                            // create snapshot with same tokens
                            await apiClient.createThemeSnapshot(created.id, t.tokens, { label: 'Duplicado', activate: true });
                            refresh(); window.location.href=`/admin/themes/${encodeURIComponent(created.id)}`; return;
                          } catch { /* fallback below */ }
                        }
                        const d=duplicateTheme(t.id); if(d){ setActiveThemeId(d.id); update({ ...d.tokens }); window.location.href=`/admin/themes/${encodeURIComponent(d.id)}`; }
                      }}>Duplicar</button>
                      <button className="px-2 py-1 rounded border" title="Vista previa" onClick={()=>{
                        try { sessionStorage.setItem('g5_theme_preview_tokens', JSON.stringify(t.tokens)); } catch {}
                        setActiveThemeId(t.id);
                        update({ ...t.tokens });
                        window.open('/admin/themes/preview','_blank');
                      }}>Vista previa</button>
                      <button className="px-2 py-1 rounded border" title="Marcar como predeterminado" onClick={async()=>{
                        if (mode==='api' && t.source==='api') {
                          try { await apiClient.updateTheme(t.id, { isDefault: true }); refresh(); return; } catch { /* fallback */ }
                        }
                        setActiveThemeId(t.id); setThemeDefault(t.id); refresh();
                      }}>Predeterminado</button>
                      <button className="px-2 py-1 rounded border" title="Exportar" onClick={async()=>{
                        try {
                          const theme = await apiClient.exportTheme(t.id);
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme));
                          const downloadAnchorNode = document.createElement('a');
                          downloadAnchorNode.setAttribute("href",     dataStr);
                          downloadAnchorNode.setAttribute("download", t.name + ".json");
                          document.body.appendChild(downloadAnchorNode); // required for firefox
                          downloadAnchorNode.click();
                          downloadAnchorNode.remove();
                        } catch (error) {
                          console.error('Error exporting theme:', error);
                        }
                      }}>Exportar</button>
                      {(mode==='api' ? t.source==='api' : t.source==='custom') && <button className="px-2 py-1 rounded border" title="Eliminar" onClick={async()=>{
                        if(!confirm('¿Eliminar tema?')) return;
                        if (mode==='api' && t.source==='api') {
                          try { await apiClient.deleteTheme(t.id); refresh(); return; } catch { /* fallback */ }
                        }
                        deleteCustomTheme(t.id); refresh();
                      }}>Eliminar</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t=>{
              const sw=[t.tokens.primary,t.tokens.secondary,t.tokens.accent,t.tokens.background,t.tokens.foreground];
              return (
                <div key={t.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{t.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded border">{t.status||'draft'}</span>
                  </div>
                  <div className="flex items-center gap-1">{sw.map((c,i)=>(<span key={i} className="inline-block w-6 h-6 rounded border" style={{backgroundColor:c}} />))}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded border ${t.wcagScore==='AAA'?'bg-emerald-100 border-emerald-300':t.wcagScore==='AA'?'bg-amber-100 border-amber-300':t.wcagScore==='A'?'bg-yellow-100 border-yellow-300':'bg-rose-100 border-rose-300'}`}>WCAG {t.wcagScore||'—'}</span>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 rounded border" onClick={()=>{ window.location.href=`/admin/themes/${encodeURIComponent(t.id)}`; }}>Editar</button>
                      <button className="px-2 py-1 rounded border" onClick={async()=>{
                        if (mode==='api' && t.source==='api') {
                          try {
                            const created = await apiClient.createTheme({ name: `${t.name} (copia)` });
                            await apiClient.createThemeSnapshot(created.id, t.tokens, { label: 'Duplicado', activate: true });
                            refresh(); window.location.href=`/admin/themes/${encodeURIComponent(created.id)}`; return;
                          } catch { /* fallback */ }
                        }
                        const d=duplicateTheme(t.id); if(d){ setActiveThemeId(d.id); update({ ...d.tokens }); window.location.href=`/admin/themes/${encodeURIComponent(d.id)}`; }
                      }}>Duplicar</button>
                      <button className="px-2 py-1 rounded border" onClick={()=>{ try { sessionStorage.setItem('g5_theme_preview_tokens', JSON.stringify(t.tokens)); } catch {}; setActiveThemeId(t.id); update({ ...t.tokens }); window.open('/admin/themes/preview','_blank'); }}>Vista previa</button>
                      <button className="px-2 py-1 rounded border" onClick={async()=>{ if (mode==='api' && t.source==='api') { try { await apiClient.updateTheme(t.id, { isDefault: true }); refresh(); return; } catch {} } setActiveThemeId(t.id); setThemeDefault(t.id); refresh(); }}>Predeterminado</button>
                      <button className="px-2 py-1 rounded border" title="Exportar" onClick={async()=>{
                        try {
                          const theme = await apiClient.exportTheme(t.id);
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme));
                          const downloadAnchorNode = document.createElement('a');
                          downloadAnchorNode.setAttribute("href",     dataStr);
                          downloadAnchorNode.setAttribute("download", t.name + ".json");
                          document.body.appendChild(downloadAnchorNode); // required for firefox
                          downloadAnchorNode.click();
                          downloadAnchorNode.remove();
                        } catch (error) {
                          console.error('Error exporting theme:', error);
                        }
                      }}>Exportar</button>
                      {(mode==='api' ? t.source==='api' : t.source==='custom') && <button className="px-2 py-1 rounded border" onClick={async()=>{ if(confirm('¿Eliminar tema?')) { if (mode==='api' && t.source==='api') { try { await apiClient.deleteTheme(t.id); refresh(); return; } catch {} } deleteCustomTheme(t.id); refresh(); } }}>Eliminar</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
