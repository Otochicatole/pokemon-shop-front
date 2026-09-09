'use client';

import { ArrowLeft, ArrowRight, ImageOff, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';

export interface ManagedImage { id: string; url: string; altText: string | null; sortOrder: number; }
export function ImageManager({ images, onMove, onRemove, onAltChange, disabled = false }: { images: ManagedImage[]; onMove: (id: string, direction: -1 | 1) => void; onRemove: (id: string) => void; onAltChange: (id: string, value: string) => void; disabled?: boolean }) {
  if (!images.length) return <div className="admin-image-empty"><ImageOff size={28} /><span>Este producto todavía no tiene imágenes.</span></div>;
  return <ol className="admin-image-grid">{images.map((image, index) => <li key={image.id}><div className="admin-image-preview"><Image src={image.url} alt={image.altText ?? ''} width={320} height={400} unoptimized />{index === 0 && <span><Star size={12} />Portada</span>}</div><label><span>Texto alternativo</span><input key={`${image.id}:${image.altText ?? ''}`} defaultValue={image.altText ?? ''} disabled={disabled} onBlur={(event) => { if (event.target.value !== (image.altText ?? '')) onAltChange(image.id, event.target.value); }} maxLength={255} /></label><div><button type="button" disabled={disabled || index === 0} onClick={() => onMove(image.id, -1)} aria-label="Mover imagen a la izquierda"><ArrowLeft size={16} /></button><button type="button" disabled={disabled || index === images.length - 1} onClick={() => onMove(image.id, 1)} aria-label="Mover imagen a la derecha"><ArrowRight size={16} /></button><button type="button" disabled={disabled} onClick={() => onRemove(image.id)} aria-label="Retirar imagen"><Trash2 size={16} /></button></div></li>)}</ol>;
}
