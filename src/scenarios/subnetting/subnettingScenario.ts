import type { SubnettingScenario } from '../../engine/types/scenario';

export const subnettingScenario: SubnettingScenario = {
  kind: 'subnetting',
  id: 'ipv4-subnetting',
  title: 'IPv4 y subnetting',
  summary: 'Calculadora real: máscara, red, broadcast, rango de hosts y representación binaria, con casos /31 y /32.',
  category: 'fundamentos',
  difficulty: 'intermedio',
  examTopics: ['1.6 Direccionamiento IPv4 y subnetting', '1.7 Direcciones privadas'],
  estimatedMinutes: 10,
  objectives: [
    'Convertir direcciones y máscaras a binario.',
    'Calcular red, broadcast y rango de hosts con AND binario.',
    'Calcular direcciones y hosts utilizables (2^h y 2^h − 2).',
    'Conocer las particularidades de /31 (RFC 3021) y /32.',
  ],
  simplifications: [
    'La calculadora trabaja con una sola subred; no divide un bloque en varias subredes (VLSM) en esta versión.',
    'La clase (A, B, C) se muestra solo como dato histórico: el direccionamiento actual es sin clases.',
  ],
  examples: [
    { label: '192.168.10.77/26', ip: '192.168.10.77', prefix: 26, note: 'Prefijo que no es múltiplo de 8' },
    { label: '10.1.2.3/8', ip: '10.1.2.3', prefix: 8, note: 'Red privada grande' },
    { label: '172.16.35.200/20', ip: '172.16.35.200', prefix: 20, note: 'Frontera en el tercer octeto' },
    { label: '192.168.1.0/24', ip: '192.168.1.0', prefix: 24, note: 'La dirección es la de red' },
    { label: '192.168.1.255/24', ip: '192.168.1.255', prefix: 24, note: 'La dirección es el broadcast' },
    { label: '10.0.12.0/30', ip: '10.0.12.1', prefix: 30, note: 'Enlace entre routers clásico' },
    { label: '10.0.12.0/31', ip: '10.0.12.0', prefix: 31, note: 'Punto a punto (RFC 3021)' },
    { label: '1.1.1.1/32', ip: '1.1.1.1', prefix: 32, note: 'Ruta de host / loopback' },
    { label: '0.0.0.0/0', ip: '0.0.0.0', prefix: 0, note: 'Ruta por defecto' },
  ],
};
