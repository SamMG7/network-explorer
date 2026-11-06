import { isInNetwork, parseIPv4 } from './ipv4';

/** Códigos de origen como en `show ip route` de Cisco IOS. */
export type RouteCode = 'C' | 'L' | 'S' | 'S*';

export interface Route {
  code: RouteCode;
  network: string;
  prefix: number;
  /** Ausente en rutas conectadas/locales: el destino está en la interfaz. */
  nextHop?: string;
  iface: string;
  /** Distancia administrativa (C/L = 0, estática = 1 por defecto). */
  ad: number;
  metric: number;
}

export interface RouteLookup {
  /** Ruta elegida (null si no hay coincidencia: el paquete se descarta). */
  best: Route | null;
  /** Todas las rutas que contienen al destino, ordenadas de mejor a peor. */
  candidates: Route[];
  /** Rutas con el mismo prefijo, AD y métrica que la mejor (balanceo ECMP). */
  equalCost: Route[];
  reason: string;
}

function compare(a: Route, b: Route): number {
  // 1) Prefijo más largo gana.
  if (a.prefix !== b.prefix) return b.prefix - a.prefix;
  // 2) Mismo prefijo: menor distancia administrativa.
  if (a.ad !== b.ad) return a.ad - b.ad;
  // 3) Misma AD: menor métrica.
  return a.metric - b.metric;
}

/**
 * Selección de ruta por coincidencia de prefijo más largo.
 *
 * Desempate con el mismo prefijo: en IOS la AD y la métrica deciden qué ruta
 * se INSTALA en la tabla (una ruta estática flotante con AD mayor queda fuera).
 * Esta función aplica el mismo criterio sobre la lista recibida; si quedan
 * rutas idénticas en prefijo, AD y métrica, se consideran de igual costo
 * (ECMP) y se devuelve la primera, indicando el empate en `equalCost`.
 */
export function lookupRoute(routes: Route[], destination: string): RouteLookup {
  const dst = parseIPv4(destination);
  if (dst === null) throw new Error(`Destino inválido: ${destination}`);

  const candidates = routes
    .filter((r) => {
      const net = parseIPv4(r.network);
      return net !== null && isInNetwork(dst, net, r.prefix);
    })
    .sort(compare);

  const best = candidates[0] ?? null;
  if (!best) {
    return { best: null, candidates, equalCost: [], reason: 'No hay ninguna ruta (ni ruta por defecto) que contenga al destino: el paquete se descarta.' };
  }
  const equalCost = candidates.filter((r) => compare(r, best) === 0);
  const reason =
    candidates.length === 1
      ? `Solo la ruta ${best.network}/${best.prefix} contiene al destino.`
      : `${candidates.length} rutas contienen al destino; gana ${best.network}/${best.prefix} por tener el prefijo más largo (/${best.prefix}).`;

  return { best, candidates, equalCost, reason };
}

export function routeLabel(r: Route): string {
  return `${r.network}/${r.prefix}`;
}
