import type { FormEvent } from 'react';
import { Search } from 'lucide-react';

export function HeaderSearch({ value, onChange, onSubmit, placeholder = 'Buscar cartas...' }: { value: string; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; placeholder?: string }) {
  return <form className="header-search" onSubmit={onSubmit}><Search size={16} aria-hidden="true" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label="Buscar cartas" /></form>;
}
