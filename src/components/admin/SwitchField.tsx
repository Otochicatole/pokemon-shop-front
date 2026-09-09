export function SwitchField({ label, checked, onChange, description, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string; disabled?: boolean }) {
  return <label className="admin-switch"><button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button><span><strong>{label}</strong>{description && <small>{description}</small>}</span></label>;
}
