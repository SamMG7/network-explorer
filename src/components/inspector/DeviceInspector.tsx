import type { Device } from '../../engine/types/network';
import type { DeviceState } from '../../engine/simulation/snapshot';
import { DEVICE_LABEL, DeviceIcon } from '../shared/visuals';
import { prefixToMask, formatIPv4 } from '../../services/network/ipv4';
import { DataTable } from './Tables';

interface DeviceInspectorProps {
  device: Device | undefined;
  state: DeviceState | undefined;
  /** Filas que cambiaron en este paso (para resaltarlas). */
  changed?: { arp: Set<string>; mac: Set<string>; nat: Set<string> };
}

const maskOf = (prefix?: number) => (prefix === undefined ? '' : formatIPv4(prefixToMask(prefix)));

/** Muestra solo los datos que tienen sentido para el tipo de dispositivo. */
export function DeviceInspector({ device, state, changed }: DeviceInspectorProps) {
  if (!device || !state) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">Haz clic en un dispositivo del diagrama para inspeccionarlo.</p>;
  }
  const isHost = device.type === 'pc' || device.type === 'server';
  const isSwitch = device.type === 'switch';
  const isRouter = device.type === 'router';

  const arpRows = state.arp.map((e) => [e.ip, e.mac, isRouter ? 'ARPA' : 'dinámica']);
  const arpHi = new Set(state.arp.flatMap((e, i) => (changed?.arp.has(e.ip) ? [i] : [])));
  const macRows = state.mac.map((e) => [String(e.vlan), e.mac, e.type, e.port]);
  const macHi = new Set(state.mac.flatMap((e, i) => (changed?.mac.has(`${e.vlan}|${e.mac}`) ? [i] : [])));
  const natRows = state.nat.map((e) => [e.protocol, e.insideGlobal, e.insideLocal, e.outsideLocal, e.outsideGlobal]);
  const natHi = new Set(state.nat.flatMap((e, i) => (changed?.nat.has(e.insideGlobal) ? [i] : [])));

  return (
    <section aria-labelledby="dev-title" className="space-y-4">
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-panel-2 text-cyan">
          <DeviceIcon type={device.type} size={24} />
        </span>
        <div>
          <h2 id="dev-title" className="text-base font-semibold text-fg">
            {device.hostname}
          </h2>
          <p className="text-xs text-muted">{DEVICE_LABEL[device.type]}{device.caption ? ` · ${device.caption}` : ''}</p>
        </div>
      </header>

      {device.type !== 'cloud' && (
        <DataTable
          title="Interfaces"
          command={isRouter ? 'show ip interface brief' : isSwitch ? 'show interfaces status' : 'ipconfig /all'}
          columns={isSwitch ? ['Interfaz', 'Modo', 'VLAN'] : ['Interfaz', 'IPv4', 'Máscara', 'MAC', ...(isRouter ? ['NAT'] : [])]}
          rows={state.interfaces.map((i) =>
            isSwitch
              ? [i.name, i.mode ?? '—', i.mode === 'trunk' ? `permitidas ${(i.allowed ?? []).join(',')} · nativa ${i.native ?? 1}` : String(i.vlan ?? 1)]
              : [i.name, i.ip ? `${i.ip}/${i.prefix}` : 'sin asignar', maskOf(i.prefix) || '—', i.mac ?? '—', ...(isRouter ? [i.nat ?? '—'] : [])],
          )}
          empty="Sin interfaces"
        />
      )}

      {isHost && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-line px-3 py-2">
            <dt className="text-muted">Gateway predeterminado</dt>
            <dd className="font-mono text-fg">{state.gateway ?? 'no configurado'}</dd>
          </div>
          <div className="rounded-lg border border-line px-3 py-2">
            <dt className="text-muted">DNS</dt>
            <dd className="font-mono text-fg">{state.dns ?? '—'}</dd>
          </div>
        </dl>
      )}

      {(isHost || isRouter) && (
        <DataTable title="Caché ARP" command={isRouter ? 'show ip arp' : 'arp -a'} columns={['IP', 'MAC', 'Tipo']} rows={arpRows} empty="Caché vacía" highlight={arpHi} />
      )}

      {isSwitch && (
        <>
          <DataTable title="Tabla de direcciones MAC" command="show mac address-table" columns={['VLAN', 'MAC', 'Tipo', 'Puerto']} rows={macRows} empty="Tabla vacía: aún no se ha recibido ninguna trama" highlight={macHi} />
          {device.vlans && (
            <DataTable title="VLAN" command="show vlan brief" columns={['VLAN', 'Nombre', 'Puertos access']} rows={device.vlans.map((v) => [String(v.id), v.name, device.interfaces.filter((i) => i.mode === 'access' && i.vlan === v.id).map((i) => i.name).join(', ') || '—'])} empty="—" />
          )}
        </>
      )}

      {isRouter && device.routes && (
        <DataTable
          title="Tabla de enrutamiento"
          command="show ip route"
          columns={['Código', 'Red', 'AD/Métrica', 'Siguiente salto / interfaz']}
          rows={device.routes.map((r) => [r.code, `${r.network}/${r.prefix}`, r.code === 'C' || r.code === 'L' ? '—' : `[${r.ad}/${r.metric}]`, r.nextHop ? `via ${r.nextHop}, ${r.iface}` : `directamente conectada, ${r.iface}`])}
          empty="Sin rutas"
        />
      )}

      {isRouter && device.pat && (
        <>
          <p className="rounded-lg border border-line px-3 py-2 font-mono text-[11px] text-muted">
            ip nat inside source list {device.pat.acl} interface {device.interfaces.find((i) => i.nat === 'outside')?.name} overload
          </p>
          <DataTable title="Traducciones NAT" command="show ip nat translations" columns={['Pro', 'Inside global', 'Inside local', 'Outside local', 'Outside global']} rows={natRows} empty="Sin traducciones activas" highlight={natHi} />
        </>
      )}

      {device.dhcpPool && (
        <>
          <DataTable
            title={`Pool DHCP ${device.dhcpPool.name}`}
            command="show running-config | section dhcp"
            columns={['Parámetro', 'Valor']}
            rows={[
              ['network', `${device.dhcpPool.network} ${maskOf(device.dhcpPool.prefix)}`],
              ['default-router', device.dhcpPool.defaultRouter],
              ['dns-server', device.dhcpPool.dns],
              ['lease', `${device.dhcpPool.leaseSeconds / 86400} día(s)`],
              ['excluded-address', device.dhcpPool.excluded],
            ]}
            empty="—"
          />
          <DataTable title="Préstamos DHCP" command="show ip dhcp binding" columns={['IP', 'MAC del cliente', 'Duración']} rows={state.dhcpBindings.map((b) => [b.ip, b.mac, `${b.leaseSeconds} s`])} empty="Sin préstamos" />
        </>
      )}
    </section>
  );
}
