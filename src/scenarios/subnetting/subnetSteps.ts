import type { EducationalStep } from '../../engine/types/scenario';
import { type SubnetResult, formatCount, formatIPv4, toDottedBinary } from '../../services/network/ipv4';

export type SubnetFocus = 'entrada' | 'ip' | 'mascara' | 'red' | 'broadcast' | 'rango' | 'conteo' | 'rol';

export interface SubnetStep extends EducationalStep {
  focus: SubnetFocus;
}

const base = { layers: [3] as EducationalStep['layers'], protocol: 'IPv4 · CIDR', device: 'calc', durationMs: 8000 };

/**
 * Genera los pasos de la explicación A PARTIR DEL CÁLCULO REAL.
 * Cambiar la dirección o el prefijo produce una explicación distinta.
 */
export function buildSubnetSteps(r: SubnetResult): SubnetStep[] {
  const ip = formatIPv4(r.ip);
  const cidr = `${ip}/${r.prefix}`;
  const hostBits = 32 - r.prefix;
  const mask = formatIPv4(r.mask);
  const network = formatIPv4(r.network);
  const first = formatIPv4(r.firstHost);
  const last = formatIPv4(r.lastHost);
  const broadcast = r.broadcast === null ? null : formatIPv4(r.broadcast);

  const special =
    r.kind === 'host32'
      ? 'Con /32 no quedan bits de host: la “subred” es una sola dirección. Se usa para loopbacks y rutas de host (las rutas L que IOS crea para cada IP de interfaz).'
      : r.kind === 'p2p31'
        ? 'Con /31 queda 1 bit de host: 2 direcciones. Según RFC 3021 ambas se asignan a los dos extremos de un enlace punto a punto; no existen dirección de red ni broadcast reservadas.'
        : null;

  const steps: SubnetStep[] = [
    {
      ...base,
      id: 'entrada',
      focus: 'entrada',
      title: `1. Analizar ${cidr}`,
      what: `El prefijo /${r.prefix} indica que los primeros ${r.prefix} bits son de red y los ${hostBits} restantes son de host.`,
      why: 'En el direccionamiento sin clases (CIDR) el prefijo, no la clase, define dónde termina la red.',
      decisionText: `Separar ${r.prefix} bits de red y ${hostBits} de host.`,
      result: `${r.prefix} bits de red · ${hostBits} bits de host.`,
      misconfig: 'Si un host se configura con otro prefijo que el resto de la red, calculará mal qué destinos son locales y algunos equipos le parecerán “remotos”.',
      concepts: ['cidr', 'subred'],
    },
    {
      ...base,
      id: 'ip',
      focus: 'ip',
      title: '2. La dirección en binario',
      what: `${ip} = ${toDottedBinary(r.ip)}. Cada octeto son 8 bits (valores 128, 64, 32, 16, 8, 4, 2, 1).`,
      why: 'Las operaciones de subredes se hacen bit a bit; en decimal solo es fácil cuando el prefijo es múltiplo de 8.',
      decisionText: 'Convertir cada octeto a binario.',
      result: toDottedBinary(r.ip),
      misconfig: 'Un octeto mayor que 255 o con ceros a la izquierda no es una IPv4 válida: la calculadora lo rechaza.',
      concepts: ['ipv4'],
    },
    {
      ...base,
      id: 'mascara',
      focus: 'mascara',
      title: '3. Máscara de subred',
      what: `/${r.prefix} = ${r.prefix} unos seguidos de ${hostBits} ceros = ${mask}. Su inverso, la wildcard, es ${formatIPv4(r.wildcard)}.`,
      why: 'La máscara marca con 1 los bits de red. IOS la usa en ip address; la wildcard, en ACL y OSPF.',
      decisionText: `Escribir ${r.prefix} bits en 1 y ${hostBits} en 0.`,
      result: `Máscara ${mask} · wildcard ${formatIPv4(r.wildcard)}`,
      misconfig: 'Una máscara no contigua (p. ej. 255.0.255.0) no es válida en IPv4 moderno.',
      concepts: ['mascara', 'wildcard'],
    },
    {
      ...base,
      id: 'red',
      focus: 'red',
      title: '4. Dirección de red: IP AND máscara',
      what: `Al aplicar AND bit a bit entre la IP y la máscara, los bits de host quedan en 0: ${network}.`,
      why: 'Así calcula cada host si un destino es local: si (IP destino AND máscara) es igual a su propia red, lo entrega directamente.',
      decisionText: 'Conservar los bits de red y poner en 0 los bits de host.',
      result: `Red ${network}/${r.prefix}`,
      misconfig: 'Configurar una dirección de red como IP de un host (en prefijos ≤ /30) provoca que IOS la rechace con “Bad mask” o que el host no funcione.',
      concepts: ['and-binario', 'direccion-red'],
    },
    {
      ...base,
      id: 'broadcast',
      focus: 'broadcast',
      title: '5. Dirección de broadcast',
      what: broadcast ? `Con todos los bits de host en 1 se obtiene ${broadcast}.` : special ?? '',
      why: broadcast ? 'Un paquete a esta dirección llega a todos los hosts de la subred.' : 'Los prefijos /31 y /32 son casos especiales.',
      decisionText: broadcast ? 'Poner en 1 los bits de host.' : 'No hay dirección de broadcast que reservar.',
      result: broadcast ? `Broadcast ${broadcast}` : 'Sin dirección de broadcast',
      misconfig: 'Asignar la dirección de broadcast a un host impide que ese host funcione y genera tráfico inesperado.',
      concepts: broadcast ? ['direccion-broadcast', 'broadcast'] : [r.kind === 'host32' ? 'slash32' : 'slash31'],
    },
    {
      ...base,
      id: 'rango',
      focus: 'rango',
      title: '6. Rango de hosts utilizables',
      what:
        r.kind === 'normal'
          ? `Del siguiente a la red hasta el anterior al broadcast: ${first} – ${last}.`
          : r.kind === 'p2p31'
            ? `Ambas direcciones son utilizables: ${first} y ${last}.`
            : `La única dirección utilizable es ${first}.`,
      why: r.kind === 'normal' ? 'La primera dirección identifica a la red y la última es el broadcast: no se asignan a hosts.' : special ?? '',
      decisionText: 'Excluir la dirección de red y la de broadcast (si existen).',
      result: first === last ? first : `${first} – ${last}`,
      misconfig: 'Por convención el gateway suele ser la primera o la última dirección utilizable; si hosts y router no coinciden en cuál es, no habrá salida de la red.',
      concepts: r.kind === 'normal' ? ['subred', 'gateway'] : [r.kind === 'host32' ? 'slash32' : 'slash31'],
    },
    {
      ...base,
      id: 'conteo',
      focus: 'conteo',
      title: '7. ¿Cuántas direcciones y hosts?',
      what:
        r.kind === 'normal'
          ? `Direcciones = 2^${hostBits} = ${formatCount(r.totalAddresses)}. Hosts utilizables = 2^${hostBits} − 2 = ${formatCount(r.usableHosts)}.`
          : `Direcciones = 2^${hostBits} = ${r.totalAddresses}. Hosts utilizables = ${r.usableHosts} (no se restan 2).`,
      why: 'Cada bit de host duplica la cantidad de direcciones. Se restan la de red y la de broadcast, salvo en /31 y /32.',
      decisionText: 'Elevar 2 a la cantidad de bits de host.',
      result: `${formatCount(r.totalAddresses)} direcciones · ${formatCount(r.usableHosts)} hosts`,
      misconfig: 'Elegir un prefijo demasiado largo deja la subred sin direcciones suficientes; uno demasiado corto desperdicia direcciones y agranda el dominio de broadcast.',
      concepts: ['subred', 'cidr'],
    },
    {
      ...base,
      id: 'rol',
      focus: 'rol',
      title: '8. ¿Qué es la dirección introducida?',
      what: `${ip} es ${r.role === 'red' ? 'la dirección de RED de la subred' : r.role === 'broadcast' ? 'la dirección de BROADCAST de la subred' : 'una dirección de HOST válida'}. Es una dirección ${r.isPrivate ? 'privada (RFC 1918)' : 'no privada'}; su clase histórica sería ${r.historicClass}.`,
      why: 'Saber si una dirección es de red, de broadcast o de host evita errores de configuración. La clase es solo informativa: hoy manda el prefijo.',
      decisionText: 'Comparar la IP con la dirección de red y la de broadcast.',
      result: r.role === 'host' ? 'Puede asignarse a una interfaz.' : 'No debe asignarse a una interfaz de host.',
      misconfig: r.isPrivate ? 'Las direcciones privadas no se enrutan en Internet: para salir necesitan NAT (ver el escenario NAT/PAT).' : 'Usar direcciones públicas que no te pertenecen en tu red interna rompe el acceso a esos destinos reales de Internet.',
      concepts: r.isPrivate ? ['rfc1918', 'nat'] : ['ipv4'],
      tone: r.role === 'host' ? 'ok' : 'warn',
    },
  ];
  return steps;
}
