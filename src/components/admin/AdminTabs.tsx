'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface AdminTab { id: string; label: string; count?: number; }
export function AdminTabs({ tabs, active, onChange, label = 'Secciones', id = 'admin-tabs' }: { tabs: AdminTab[]; active: string; onChange: (id: string) => void; label?: string; id?: string }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    if (tab) { onChange(tab.id); buttons.current[next]?.focus(); }
  };
  return <div className="admin-tabs" role="tablist" aria-label={label}>{tabs.map((tab, index) => <button ref={(node) => { buttons.current[index] = node; }} key={tab.id} id={`${id}-tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onKeyDown={(event) => handleKey(event, index)} onClick={() => onChange(tab.id)}>{tab.label}{tab.count !== undefined && <span>{tab.count}</span>}</button>)}</div>;
}

export function AdminTabPanel({ tabsId = 'admin-tabs', tabId, active, children, className = '' }: { tabsId?: string; tabId: string; active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null;
  return <section id={`${tabsId}-panel-${tabId}`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tabId}`} tabIndex={0} className={className}>{children}</section>;
}
