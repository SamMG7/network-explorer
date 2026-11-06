import { Search, X } from 'lucide-react';
import { useId } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function SearchInput({ value, onChange, label, placeholder }: SearchInputProps) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-panel-2 py-2 pr-8 pl-9 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted hover:text-fg"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
