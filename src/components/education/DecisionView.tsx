import { Cpu } from 'lucide-react';
import type { DecisionOutcome } from '../../engine/simulation/decisions';
import { routeLabel } from '../../services/network/routing';
import { formatIPv4, networkAddress, parseIPv4, prefixToMask } from '../../services/network/ipv4';
import { DataTable } from '../inspector/Tables';

/**
 * Decisión CALCULADA por la lógica de red (no es texto del guion):
 * tabla de rutas con la elegida resaltada, puertos de inundación, etc.
 */
export function DecisionView({ outcome, deviceName }: { outcome: DecisionOutcome; deviceName: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-line bg-panel-2/60 p-3" aria-label="Decisión calculada por el simulador">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        <Cpu size={13} aria-hidden="true" /> Calculado por el motor · {deviceName}
      </p>
      <Body outcome={outcome} />
    </div>
  );
}

function Body({ outcome }: { outcome: DecisionOutcome }) {
  switch (outcome.kind) {
    case 'local-or-remote': {
      const own = parseIPv4(outcome.ownIp)!;
      const mask = prefixToMask(outcome.prefix);
      return (
        <div className="space-y-1 text-xs text-fg">
          <p className="font-mono">
            {outcome.ownIp} AND {formatIPv4(mask)} = {formatIPv4(networkAddress(own, outcome.prefix))}
          </p>
          <p>
            Destino: <strong>{outcome.verdict === 'local' ? 'local (misma subred)' : 'remoto (otra subred)'}</strong>
            {outcome.target ? ` → resolver ${outcome.target}` : ''}
          </p>
          <p className="text-muted">{outcome.reason}</p>
        </div>
      );
    }
    case 'arp-lookup':
      return (
        <p className="text-xs text-fg">
          <strong style={{ color: outcome.verdict === 'hit' ? 'var(--ok)' : 'var(--warn)' }}>{outcome.verdict === 'hit' ? 'Acierto en caché' : 'Fallo de caché'}</strong> · {outcome.reason}
        </p>
      );
    case 'switch-forward': {
      const d = outcome.decision;
      return (
        <div className="space-y-1 text-xs text-fg">
          <p className="font-mono">
            VLAN {outcome.vlan} · entrada {outcome.inPort} · destino {outcome.dstMac}
          </p>
          <p>
            <strong style={{ color: d.action === 'forward' ? 'var(--ok)' : d.action === 'flood' ? 'var(--warn)' : 'var(--deny)' }}>
              {d.action === 'flood' ? `Inundar → ${d.ports.join(', ') || '(ningún otro puerto en la VLAN)'}` : d.action === 'forward' ? `Reenviar → ${d.port}` : 'Filtrar (descartar)'}
            </strong>
          </p>
          <p className="text-muted">{d.reason}</p>
        </div>
      );
    }
    case 'route-lookup': {
      const { lookup } = outcome;
      const best = lookup.best;
      return (
        <div className="space-y-2 text-xs text-fg">
          <p>
            Destino <span className="font-mono">{outcome.dstIp}</span>: {lookup.reason}
          </p>
          <DataTable
            title="Rutas que contienen al destino"
            columns={['Código', 'Red', 'AD/Métrica', 'Salida']}
            rows={lookup.candidates.map((r) => [r.code, routeLabel(r), `[${r.ad}/${r.metric}]`, r.nextHop ? `via ${r.nextHop} (${r.iface})` : `conectada (${r.iface})`])}
            highlight={new Set(best ? [0] : [])}
            empty="Ninguna: se descarta el paquete"
          />
          {lookup.equalCost.length > 1 && <p className="text-muted">Empate exacto en prefijo, AD y métrica: rutas de igual costo (ECMP); IOS puede balancear entre ellas.</p>}
          {best && (
            <p>
              Interfaz de salida <strong className="font-mono">{best.iface}</strong> · siguiente salto{' '}
              <strong className="font-mono">{best.nextHop ?? `${outcome.dstIp} (destino en red conectada)`}</strong>
            </p>
          )}
        </div>
      );
    }
    case 'nat-out':
      return (
        <div className="space-y-1 text-xs text-fg">
          <p className="font-mono">
            {outcome.entry.insideLocal} → <strong>{outcome.entry.insideGlobal}</strong>
          </p>
          <p className="text-muted">
            {outcome.reused
              ? 'Ya existía una traducción para esta conexión: se reutiliza.'
              : outcome.portPreserved
                ? 'Nueva traducción: el puerto de origen estaba libre en la IP pública y se conserva.'
                : 'Nueva traducción: el puerto de origen ya estaba en uso en la IP pública, así que PAT asigna otro puerto libre.'}
          </p>
        </div>
      );
    case 'nat-in':
      return outcome.entry ? (
        <p className="font-mono text-xs text-fg">
          {outcome.destination} → <strong>{outcome.entry.insideLocal}</strong>
        </p>
      ) : (
        <p className="text-xs text-fg">
          <strong style={{ color: 'var(--deny)' }}>Sin traducción para {outcome.destination}</strong>: el router no sabe a qué host interno pertenece y descarta el paquete.
        </p>
      );
  }
}
