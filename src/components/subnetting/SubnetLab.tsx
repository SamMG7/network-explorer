import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import type { SubnettingScenario } from '../../engine/types/scenario';
import { type SubnetResult, formatCount, formatIPv4 } from '../../services/network/ipv4';
import type { SubnetFocus } from '../../scenarios/subnetting/subnetSteps';
import { BinaryView } from './BinaryView';

interface SubnetLabProps {
  scenario: SubnettingScenario;
  ipText: string;
  prefixText: string;
  onIpChange: (v: string) => void;
  onPrefixChange: (v: string) => void;
  onExample: (ip: string, prefix: number) => void;
  result: SubnetResult;
  error: string | null;
  focus: SubnetFocus;
}

/** Calculadora IPv4 real: todos los valores se calculan con services/network/ipv4. */
export function SubnetLab({ scenario, ipText, prefixText, onIpChange, onPrefixChange, onExample, result, error, focus }: SubnetLabProps) {
  const ipId = useId();
  const prefixId = useId();
  const errId = useId();
  const r = result;
  const fmt = (n: number | null) => (n === null ? 'No aplica' : formatIPv4(n));

  const cells: Array<{ label: string; value: string; focus: SubnetFocus[] }> = [
    { label: 'Máscara', value: `${formatIPv4(r.mask)} (/${r.prefix})`, focus: ['mascara'] },
    { label: 'Wildcard', value: formatIPv4(r.wildcard), focus: ['mascara'] },
    { label: 'Dirección de red', value: formatIPv4(r.network), focus: ['red'] },
    { label: 'Broadcast', value: fmt(r.broadcast), focus: ['broadcast'] },
    { label: 'Primer host', value: formatIPv4(r.firstHost), focus: ['rango'] },
    { label: 'Último host', value: formatIPv4(r.lastHost), focus: ['rango'] },
    { label: 'Direcciones', value: formatCount(r.totalAddresses), focus: ['conteo'] },
    { label: 'Hosts utilizables', value: formatCount(r.usableHosts), focus: ['conteo'] },
  ];

  return (
    <div className="space-y-5 p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()} aria-describedby={error ? errId : undefined}>
        <div>
          <label htmlFor={ipId} className="mb-1 block text-xs text-muted">
            Dirección IPv4
          </label>
          <input
            id={ipId}
            value={ipText}
            onChange={(e) => onIpChange(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error !== null}
            className="w-44 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-fg focus:border-accent focus:outline-none aria-[invalid=true]:border-deny"
          />
        </div>
        <div>
          <label htmlFor={prefixId} className="mb-1 block text-xs text-muted">
            Prefijo CIDR
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted">/</span>
            <input
              id={prefixId}
              value={prefixText}
              onChange={(e) => onPrefixChange(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={error !== null}
              className="w-16 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-fg focus:border-accent focus:outline-none"
            />
            <input
              type="range"
              min={0}
              max={32}
              value={Number.isFinite(Number(prefixText)) ? Number(prefixText) : r.prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              aria-label="Ajustar prefijo"
              className="w-40 accent-[var(--accent)]"
            />
          </div>
        </div>
      </form>

      {error && (
        <p id={errId} role="alert" className="flex items-start gap-2 rounded-lg border border-deny/60 bg-deny/10 px-3 py-2 text-sm text-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-deny" aria-hidden="true" />
          <span>
            {error} <span className="text-muted">Se muestran los resultados de la última entrada válida.</span>
          </span>
        </p>
      )}

      <div>
        <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Ejemplos</h2>
        <ul className="flex flex-wrap gap-1.5">
          {scenario.examples.map((ex) => (
            <li key={ex.label}>
              <button
                type="button"
                onClick={() => onExample(ex.ip, ex.prefix)}
                title={ex.note}
                className="cursor-pointer rounded-md border border-line bg-panel-2 px-2 py-1 font-mono text-xs text-fg transition hover:border-accent"
              >
                {ex.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        {cells.map((c) => {
          const on = c.focus.includes(focus);
          return (
            <div key={c.label} className="rounded-lg border px-3 py-2 transition-colors" style={{ borderColor: on ? 'var(--cyan)' : 'var(--line)', background: on ? 'color-mix(in srgb, var(--cyan) 10%, transparent)' : undefined }}>
              <dt className="text-[11px] text-muted">{c.label}</dt>
              <dd className="font-mono text-sm font-semibold break-all text-fg">{c.value}</dd>
            </div>
          );
        })}
      </dl>

      {r.kind !== 'normal' && (
        <p className="rounded-lg border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-fg">
          {r.kind === 'p2p31'
            ? '/31 (RFC 3021): 2 direcciones, ambas utilizables en un enlace punto a punto. No hay dirección de broadcast.'
            : '/32: una sola dirección que identifica a un host (loopback o ruta de host). No hay red ni broadcast separados.'}
        </p>
      )}

      <div className="rounded-xl border border-line bg-panel p-3">
        <BinaryView
          prefix={r.prefix}
          focus={focus}
          rows={[
            { id: 'ip', label: 'IP', value: r.ip, dotted: formatIPv4(r.ip), focus: ['ip', 'red', 'rol'] },
            { id: 'mask', label: 'Máscara', value: r.mask, dotted: formatIPv4(r.mask), focus: ['mascara', 'red'] },
            { id: 'net', label: 'Red', value: r.network, dotted: formatIPv4(r.network), focus: ['red', 'rango', 'rol'] },
            ...(r.broadcast !== null ? [{ id: 'bc', label: 'Broadcast', value: r.broadcast, dotted: formatIPv4(r.broadcast), focus: ['broadcast', 'rango', 'rol'] as SubnetFocus[] }] : []),
          ]}
        />
      </div>
    </div>
  );
}
