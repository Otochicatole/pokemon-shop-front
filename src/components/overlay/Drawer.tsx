'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Drawer({ open, title, onClose, children, className = '' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; className?: string }) { if (!open) return null; return <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className={`drawer ${className}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>{children}</aside></div>; }
