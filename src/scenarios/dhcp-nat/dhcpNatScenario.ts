import type { TopologyScenario, Track } from '../../engine/types/scenario';
import type { Device, Link } from '../../engine/types/network';
import type { DhcpMessage } from '../../engine/types/packet';
import type { Route } from '../../services/network/routing';
import { BROADCAST_MAC, dhcp, eth, ip, packet, tcp, udp } from '../builders';

// ============================================================== DHCP
const NEW = { mac: '0050.7966.6810' };
const OLD = { mac: '0050.7966.6811', ip: '192.168.10.12' };
const R1_LAN = '0c1a.2b3c.0100';
const OFFERED = '192.168.10.11';
const XID = '0x3903F326';

const dhcpDevices: Device[] = [
  { id: 'cliente', type: 'pc', hostname: 'PC-NUEVA', position: { x: 0, y: 40 }, interfaces: [{ name: 'NIC', mac: NEW.mac }], dhcpClient: true, caption: 'Cliente DHCP' },
  { id: 'pc-b', type: 'pc', hostname: 'PC-B', position: { x: 0, y: 320 }, interfaces: [{ name: 'NIC', mac: OLD.mac, ip: OLD.ip, prefix: 24 }], gateway: '192.168.10.1', dns: '8.8.8.8' },
  {
    id: 's1',
    type: 'switch',
    hostname: 'S1',
    position: { x: 320, y: 180 },
    interfaces: [
      { name: 'Fa0/1', mode: 'access', vlan: 1 },
      { name: 'Fa0/2', mode: 'access', vlan: 1 },
      { name: 'G0/1', mode: 'access', vlan: 1 },
    ],
    vlans: [{ id: 1, name: 'default' }],
    initialMac: [{ vlan: 1, mac: OLD.mac, port: 'Fa0/2', type: 'DYNAMIC' }],
  },
  {
    id: 'r1',
    type: 'router',
    hostname: 'R1',
    position: { x: 640, y: 180 },
    interfaces: [{ name: 'G0/0', mac: R1_LAN, ip: '192.168.10.1', prefix: 24, description: 'LAN' }],
    caption: 'Servidor DHCP (IOS)',
    dhcpPool: { name: 'LAN', network: '192.168.10.0', prefix: 24, defaultRouter: '192.168.10.1', dns: '8.8.8.8', leaseSeconds: 86400, excluded: '192.168.10.1 – 192.168.10.10' },
    initialDhcpBindings: [{ ip: OLD.ip, mac: OLD.mac, leaseSeconds: 86400 }],
    routes: [
      { code: 'C', network: '192.168.10.0', prefix: 24, iface: 'G0/0', ad: 0, metric: 0 },
      { code: 'L', network: '192.168.10.1', prefix: 32, iface: 'G0/0', ad: 0, metric: 0 },
    ],
  },
];

const dhcpLinks: Link[] = [
  { id: 'c-s1', a: { device: 'cliente', iface: 'NIC' }, b: { device: 's1', iface: 'Fa0/1' }, kind: 'access' },
  { id: 'b-s1', a: { device: 'pc-b', iface: 'NIC' }, b: { device: 's1', iface: 'Fa0/2' }, kind: 'access' },
  { id: 's1-r1', a: { device: 's1', iface: 'G0/1' }, b: { device: 'r1', iface: 'G0/0' }, kind: 'access' },
];

const serverOptions = (type: string): DhcpMessage['options'] => [
  { code: 53, name: 'Tipo de mensaje', value: type },
  { code: 54, name: 'Identificador del servidor', value: '192.168.10.1' },
  { code: 51, name: 'Duración del préstamo', value: '86400 s (1 día)' },
  { code: 1, name: 'Máscara de subred', value: '255.255.255.0' },
  { code: 3, name: 'Router (gateway)', value: '192.168.10.1' },
  { code: 6, name: 'Servidor DNS', value: '8.8.8.8' },
];

const fromClient = (id: string, label: string, msg: Omit<DhcpMessage, 'type' | 'op' | 'xid' | 'broadcastFlag' | 'ciaddr' | 'yiaddr' | 'chaddr'>) =>
  packet(id, label, eth(BROADCAST_MAC, NEW.mac, '0x0800'), ip('0.0.0.0', '255.255.255.255', 64, 17), udp(68, 67), dhcp({ op: 1, xid: XID, broadcastFlag: true, ciaddr: '0.0.0.0', yiaddr: '0.0.0.0', chaddr: NEW.mac, ...msg }));

const fromServer = (id: string, label: string, msg: Omit<DhcpMessage, 'type' | 'op' | 'xid' | 'broadcastFlag' | 'ciaddr' | 'yiaddr' | 'chaddr'>) =>
  packet(id, label, eth(BROADCAST_MAC, R1_LAN, '0x0800'), ip('192.168.10.1', '255.255.255.255', 255, 17), udp(67, 68), dhcp({ op: 2, xid: XID, broadcastFlag: true, ciaddr: '0.0.0.0', yiaddr: OFFERED, chaddr: NEW.mac, ...msg }));

const discover = fromClient('discover', 'DHCPDISCOVER', { messageType: 'DHCPDISCOVER', options: [{ code: 53, name: 'Tipo de mensaje', value: '1 (Discover)' }, { code: 55, name: 'Lista de parámetros solicitados', value: '1, 3, 6, 51' }] });
const offer = fromServer('offer', 'DHCPOFFER', { messageType: 'DHCPOFFER', options: serverOptions('2 (Offer)') });
const request = fromClient('request', 'DHCPREQUEST', {
  messageType: 'DHCPREQUEST',
  options: [
    { code: 53, name: 'Tipo de mensaje', value: '3 (Request)' },
    { code: 50, name: 'IP solicitada', value: OFFERED },
    { code: 54, name: 'Identificador del servidor', value: '192.168.10.1' },
  ],
});
const ack = fromServer('ack', 'DHCPACK', { messageType: 'DHCPACK', options: serverOptions('5 (ACK)') });
const copy = <T extends { id: string }>(p: T, suffix: string): T => ({ ...p, id: `${p.id}-${suffix}` });

const dhcpTrack: Track = {
  id: 'dhcp',
  title: 'DHCP (DORA)',
  description: 'PC-NUEVA obtiene su configuración IPv4 de R1.',
  devices: dhcpDevices,
  links: dhcpLinks,
  steps: [
    {
      id: 'sin-ip',
      title: '1. Un cliente sin configuración IP',
      what: 'PC-NUEVA se conecta a la red configurada para obtener IP automáticamente. No tiene dirección, máscara, gateway ni DNS (usa 0.0.0.0 como origen).',
      why: 'DHCP evita configurar cada equipo a mano y centraliza el direccionamiento. R1 actúa como servidor DHCP con un pool para 192.168.10.0/24.',
      protocol: 'DHCP',
      layers: [7],
      device: 'cliente',
      decisionText: 'Buscar un servidor DHCP enviando un Discover.',
      result: 'El cliente inicia el proceso DORA.',
      misconfig: 'Si el puerto del switch estuviera en otra VLAN que el servidor (y no hubiera relay), el cliente no obtendría IP y se asignaría una APIPA 169.254.x.x (en Windows).',
      concepts: ['dhcp', 'dora'],
      durationMs: 8000,
      activeDevices: ['cliente'],
    },
    {
      id: 'discover',
      title: '2. DHCPDISCOVER (broadcast)',
      what: 'El cliente envía un DHCPDISCOVER: MAC destino ffff.ffff.ffff, IP 0.0.0.0 → 255.255.255.255, UDP 68 → 67, con su MAC en chaddr y un identificador de transacción (xid).',
      why: 'El cliente no sabe quién es el servidor ni tiene IP propia, así que solo puede usar broadcast. Activa el bit de broadcast para pedir que las respuestas también lo sean.',
      protocol: 'DHCP sobre UDP',
      layers: [7, 4, 3, 2],
      device: 'cliente',
      decisionText: 'Enviar Discover a broadcast.',
      result: 'La trama llega a Fa0/1 de S1.',
      misconfig: 'Con DHCP snooping activado, un servidor DHCP no autorizado en un puerto “no confiable” sería bloqueado; sin él, podría responder antes que el legítimo.',
      concepts: ['dora', 'broadcast', 'udp'],
      durationMs: 8000,
      activeDevices: ['cliente', 's1'],
      transits: [{ link: 'c-s1', packet: discover }],
    },
    {
      id: 'flood-discover',
      title: '3. El switch inunda el Discover',
      what: 'S1 aprende la MAC del cliente en Fa0/1 e inunda el broadcast por Fa0/2 y G0/1. PC-B lo descarta (no es servidor DHCP); R1 lo procesa.',
      why: 'El broadcast llega a todo el dominio de broadcast, pero solo los servidores DHCP escuchan en UDP 67.',
      protocol: 'Ethernet (conmutación)',
      layers: [2],
      device: 's1',
      decisionText: 'Broadcast → inundar a todos los puertos de la VLAN excepto Fa0/1.',
      result: 'R1 recibe el Discover.',
      misconfig: 'Si el servidor estuviera en otra red, R1 debería tener ip helper-address en la interfaz para reenviar el broadcast como unicast al servidor (relay DHCP).',
      concepts: ['flooding', 'dhcp-relay'],
      durationMs: 8000,
      activeDevices: ['s1', 'r1', 'pc-b'],
      transits: [
        { link: 'b-s1', reverse: true, packet: copy(discover, 'b') },
        { link: 's1-r1', packet: copy(discover, 'r1') },
      ],
      events: [{ type: 'mac-learn', device: 's1', vlan: 1, mac: NEW.mac, port: 'Fa0/1' }],
      decision: { kind: 'switch-forward', device: 's1', inPort: 'Fa0/1', vlan: 1, dstMac: BROADCAST_MAC, expect: { action: 'flood', ports: ['Fa0/2', 'G0/1'] } },
      tone: 'warn',
    },
    {
      id: 'offer',
      title: '4. DHCPOFFER',
      what: `R1 elige del pool la primera dirección libre que no está excluida ni prestada: ${OFFERED} (.1 a .10 están excluidas y .12 ya la tiene PC-B). Envía un DHCPOFFER con yiaddr ${OFFERED}, máscara, gateway, DNS y duración del préstamo.`,
      why: 'El servidor reserva temporalmente la dirección y la ofrece. Como el cliente pidió broadcast, la oferta va a ffff.ffff.ffff y 255.255.255.255 (sin ese bit podría enviarse unicast a la MAC del cliente).',
      protocol: 'DHCP sobre UDP',
      layers: [7, 4, 3, 2],
      device: 'r1',
      decisionText: `Ofrecer ${OFFERED}/24 con gateway 192.168.10.1 y DNS 8.8.8.8.`,
      result: 'La oferta llega a G0/1 de S1.',
      misconfig: 'Si el pool se agotara (todas las IP prestadas), el servidor no podría ofrecer nada y el cliente seguiría sin IP.',
      concepts: ['dora', 'lease'],
      durationMs: 9000,
      activeDevices: ['r1', 's1'],
      transits: [{ link: 's1-r1', reverse: true, packet: offer }],
      events: [{ type: 'mac-learn', device: 's1', vlan: 1, mac: R1_LAN, port: 'G0/1' }],
    },
    {
      id: 'flood-offer',
      title: '5. El cliente recibe la oferta',
      what: 'S1 inunda la oferta (broadcast) por Fa0/1 y Fa0/2. El cliente reconoce su xid y su MAC en chaddr; PC-B la ignora.',
      why: 'El xid permite al cliente saber que la oferta responde a su Discover.',
      protocol: 'Ethernet (conmutación)',
      layers: [2],
      device: 's1',
      decisionText: 'Broadcast → inundar excepto por G0/1.',
      result: 'El cliente tiene una oferta.',
      misconfig: 'Si hubiera varios servidores, el cliente recibiría varias ofertas y elegiría normalmente la primera.',
      concepts: ['dora', 'flooding'],
      durationMs: 8000,
      activeDevices: ['s1', 'cliente'],
      transits: [
        { link: 'c-s1', reverse: true, packet: copy(offer, 'c') },
        { link: 'b-s1', reverse: true, packet: copy(offer, 'b') },
      ],
      decision: { kind: 'switch-forward', device: 's1', inPort: 'G0/1', vlan: 1, dstMac: BROADCAST_MAC, expect: { action: 'flood', ports: ['Fa0/1', 'Fa0/2'] } },
      tone: 'warn',
    },
    {
      id: 'request',
      title: '6. DHCPREQUEST (broadcast)',
      what: `El cliente pide formalmente la dirección ofrecida: opción 50 (IP solicitada) = ${OFFERED} y opción 54 = servidor elegido. Todavía usa 0.0.0.0 como origen y envía en broadcast.`,
      why: 'Al enviarlo en broadcast, todos los servidores DHCP se enteran de qué oferta se aceptó y los demás liberan las direcciones que habían reservado.',
      protocol: 'DHCP sobre UDP',
      layers: [7, 4, 3, 2],
      device: 'cliente',
      decisionText: 'Aceptar la oferta de 192.168.10.1.',
      result: 'R1 recibe la solicitud.',
      misconfig: 'Si el cliente pidiera una IP de otra red (por ejemplo, la que tenía en otra oficina), el servidor respondería DHCPNAK y el proceso empezaría de nuevo.',
      concepts: ['dora'],
      durationMs: 9000,
      activeDevices: ['cliente', 's1', 'r1'],
      transits: [
        { link: 'c-s1', packet: request },
        { link: 's1-r1', packet: copy(request, 'r1') },
        { link: 'b-s1', reverse: true, packet: copy(request, 'b') },
      ],
      decision: { kind: 'switch-forward', device: 's1', inPort: 'Fa0/1', vlan: 1, dstMac: BROADCAST_MAC, expect: { action: 'flood', ports: ['Fa0/2', 'G0/1'] } },
    },
    {
      id: 'ack',
      title: '7. DHCPACK: préstamo confirmado',
      what: `R1 registra el préstamo de ${OFFERED} para la MAC 0050.7966.6810 durante 1 día y envía el DHCPACK con toda la configuración.`,
      why: 'El ACK es la confirmación definitiva: a partir de aquí el cliente puede usar la dirección hasta que expire el préstamo (intentará renovarla al 50 %).',
      protocol: 'DHCP sobre UDP',
      layers: [7, 4, 3, 2],
      device: 'r1',
      decisionText: `Confirmar ${OFFERED} y registrar el binding.`,
      result: 'Nuevo préstamo en show ip dhcp binding.',
      misconfig: 'Si otro equipo usara la misma IP de forma estática dentro del rango del pool, habría un conflicto. Por eso las direcciones de equipos fijos se excluyen (ip dhcp excluded-address).',
      concepts: ['dora', 'lease'],
      durationMs: 9000,
      activeDevices: ['r1', 's1', 'cliente'],
      transits: [
        { link: 's1-r1', reverse: true, packet: ack, tone: 'ok' },
        { link: 'c-s1', reverse: true, packet: copy(ack, 'c'), tone: 'ok' },
        { link: 'b-s1', reverse: true, packet: copy(ack, 'b'), tone: 'ok' },
      ],
      events: [{ type: 'dhcp-bind', device: 'r1', ip: OFFERED, mac: NEW.mac, leaseSeconds: 86400 }],
      decision: { kind: 'switch-forward', device: 's1', inPort: 'G0/1', vlan: 1, dstMac: BROADCAST_MAC, expect: { action: 'flood', ports: ['Fa0/1', 'Fa0/2'] } },
      tone: 'ok',
    },
    {
      id: 'configurado',
      title: '8. El cliente aplica la configuración',
      what: `PC-NUEVA configura ${OFFERED}/24, gateway 192.168.10.1 y DNS 8.8.8.8. Abre la pestaña Dispositivo para ver el cambio.`,
      why: 'Con IP, máscara y gateway el equipo ya puede comunicarse dentro y fuera de su red. Muchos clientes envían además un ARP de comprobación para detectar si la IP ya está en uso.',
      protocol: 'DHCP',
      layers: [7, 3],
      device: 'cliente',
      decisionText: 'Aplicar la configuración recibida.',
      result: `PC-NUEVA: ${OFFERED}/24 · gateway 192.168.10.1.`,
      misconfig: 'Si el pool tuviera mal el default-router, los clientes obtendrían IP pero no podrían salir de su red.',
      concepts: ['dhcp', 'gateway'],
      durationMs: 9000,
      activeDevices: ['cliente'],
      events: [{ type: 'ip-assign', device: 'cliente', iface: 'NIC', ip: OFFERED, prefix: 24, gateway: '192.168.10.1', dns: '8.8.8.8' }],
      tone: 'ok',
    },
  ],
};

// =============================================================== NAT/PAT
const A = { mac: '0050.7966.6820', ip: '192.168.10.11' };
const B = { mac: '0050.7966.6821', ip: '192.168.10.12' };
const R1 = { inMac: '0c1a.2b3c.0100', outMac: '0c1a.2b3c.0101', public: '203.0.113.2' };
const ISP = { mac: '0c99.0000.0100', ip: '203.0.113.1' };
const WEB = '198.51.100.10';

const r1Routes: Route[] = [
  { code: 'C', network: '192.168.10.0', prefix: 24, iface: 'G0/0', ad: 0, metric: 0 },
  { code: 'L', network: '192.168.10.1', prefix: 32, iface: 'G0/0', ad: 0, metric: 0 },
  { code: 'C', network: '203.0.113.0', prefix: 30, iface: 'G0/1', ad: 0, metric: 0 },
  { code: 'L', network: '203.0.113.2', prefix: 32, iface: 'G0/1', ad: 0, metric: 0 },
  { code: 'S*', network: '0.0.0.0', prefix: 0, nextHop: ISP.ip, iface: 'G0/1', ad: 1, metric: 0 },
];

const natDevices: Device[] = [
  { id: 'pc-a', type: 'pc', hostname: 'PC-A', position: { x: 0, y: 40 }, interfaces: [{ name: 'NIC', mac: A.mac, ip: A.ip, prefix: 24 }], gateway: '192.168.10.1', initialArp: [{ ip: '192.168.10.1', mac: R1.inMac }] },
  { id: 'pc-b', type: 'pc', hostname: 'PC-B', position: { x: 0, y: 320 }, interfaces: [{ name: 'NIC', mac: B.mac, ip: B.ip, prefix: 24 }], gateway: '192.168.10.1', initialArp: [{ ip: '192.168.10.1', mac: R1.inMac }] },
  {
    id: 's1',
    type: 'switch',
    hostname: 'S1',
    position: { x: 260, y: 180 },
    interfaces: [
      { name: 'Fa0/1', mode: 'access', vlan: 1 },
      { name: 'Fa0/2', mode: 'access', vlan: 1 },
      { name: 'G0/1', mode: 'access', vlan: 1 },
    ],
    vlans: [{ id: 1, name: 'default' }],
    initialMac: [
      { vlan: 1, mac: A.mac, port: 'Fa0/1', type: 'DYNAMIC' },
      { vlan: 1, mac: B.mac, port: 'Fa0/2', type: 'DYNAMIC' },
      { vlan: 1, mac: R1.inMac, port: 'G0/1', type: 'DYNAMIC' },
    ],
  },
  {
    id: 'r1',
    type: 'router',
    hostname: 'R1',
    position: { x: 520, y: 180 },
    interfaces: [
      { name: 'G0/0', mac: R1.inMac, ip: '192.168.10.1', prefix: 24, nat: 'inside' },
      { name: 'G0/1', mac: R1.outMac, ip: R1.public, prefix: 30, nat: 'outside' },
    ],
    routes: r1Routes,
    pat: { publicIp: R1.public, portStart: 1024, portEnd: 65535, acl: 'LAN-NAT' },
    initialArp: [
      { ip: ISP.ip, mac: ISP.mac },
      { ip: A.ip, mac: A.mac },
      { ip: B.ip, mac: B.mac },
    ],
    caption: 'NAT inside → outside',
  },
  {
    id: 'isp',
    type: 'router',
    hostname: 'ISP',
    position: { x: 780, y: 180 },
    interfaces: [
      { name: 'G0/0', mac: ISP.mac, ip: ISP.ip, prefix: 30 },
      { name: 'G0/1', description: 'Hacia Internet' },
    ],
    routes: [],
  },
  { id: 'internet', type: 'cloud', hostname: 'Internet', position: { x: 1020, y: 180 }, interfaces: [{ name: 'A' }, { name: 'B' }] },
  { id: 'web', type: 'server', hostname: 'WEB', position: { x: 1260, y: 180 }, interfaces: [{ name: 'NIC', ip: WEB, prefix: 24 }], caption: 'HTTPS :443' },
];

const natLinks: Link[] = [
  { id: 'a-s1', a: { device: 'pc-a', iface: 'NIC' }, b: { device: 's1', iface: 'Fa0/1' }, kind: 'access' },
  { id: 'b-s1', a: { device: 'pc-b', iface: 'NIC' }, b: { device: 's1', iface: 'Fa0/2' }, kind: 'access' },
  { id: 's1-r1', a: { device: 's1', iface: 'G0/1' }, b: { device: 'r1', iface: 'G0/0' }, kind: 'access' },
  { id: 'r1-isp', a: { device: 'r1', iface: 'G0/1' }, b: { device: 'isp', iface: 'G0/0' }, kind: 'routed', label: '203.0.113.0/30' },
  { id: 'isp-net', a: { device: 'isp', iface: 'G0/1' }, b: { device: 'internet', iface: 'A' }, kind: 'internet' },
  { id: 'net-web', a: { device: 'internet', iface: 'B' }, b: { device: 'web', iface: 'NIC' }, kind: 'internet' },
];

const aSyn = packet('a-syn', 'TCP SYN (privada)', eth(R1.inMac, A.mac, '0x0800'), ip(A.ip, WEB, 128, 6), tcp(50000, 443, ['SYN']));
const aSynNat = packet('a-syn-nat', 'TCP SYN (traducida)', eth(ISP.mac, R1.outMac, '0x0800'), ip(R1.public, WEB, 127, 6), tcp(50000, 443, ['SYN']));
const aSynNet = packet('a-syn-net', 'TCP SYN', ip(R1.public, WEB, 126, 6), tcp(50000, 443, ['SYN']));
const bSyn = packet('b-syn', 'TCP SYN (privada)', eth(R1.inMac, B.mac, '0x0800'), ip(B.ip, WEB, 128, 6), tcp(50000, 443, ['SYN']));
const bSynNat = packet('b-syn-nat', 'TCP SYN (traducida)', eth(ISP.mac, R1.outMac, '0x0800'), ip(R1.public, WEB, 127, 6), tcp(1024, 443, ['SYN']));
const synAckNet = packet('sa-net', 'TCP SYN-ACK', ip(WEB, R1.public, 60, 6), tcp(443, 50000, ['SYN', 'ACK']));
const synAckIsp = packet('sa-isp', 'TCP SYN-ACK (pública)', eth(R1.outMac, ISP.mac, '0x0800'), ip(WEB, R1.public, 59, 6), tcp(443, 50000, ['SYN', 'ACK']));
const synAckLan = packet('sa-lan', 'TCP SYN-ACK (traducida)', eth(A.mac, R1.inMac, '0x0800'), ip(WEB, A.ip, 58, 6), tcp(443, 50000, ['SYN', 'ACK']));
const unsolicited = packet('unsol', 'TCP SYN no solicitado', eth(R1.outMac, ISP.mac, '0x0800'), ip('192.0.2.50', R1.public, 50, 6), tcp(40000, 8080, ['SYN']));

const natTrack: Track = {
  id: 'nat',
  title: 'NAT/PAT',
  description: 'Dos hosts privados comparten la IP pública 203.0.113.2.',
  devices: natDevices,
  links: natLinks,
  steps: [
    {
      id: 'salida-a',
      title: '1. PC-A abre una conexión HTTPS',
      what: 'PC-A (192.168.10.11) envía un TCP SYN a 198.51.100.10:443 desde su puerto 50000. Como el destino es remoto, la trama va al gateway R1.',
      why: '192.168.10.11 es una dirección privada (RFC 1918): no se puede enrutar en Internet tal cual.',
      protocol: 'TCP sobre IPv4',
      layers: [4, 3, 2],
      device: 'pc-a',
      decisionText: 'Destino remoto → enviar a 192.168.10.1.',
      result: 'El paquete llega a la interfaz inside de R1.',
      misconfig: 'Sin ruta por defecto en R1, el paquete se descartaría antes de llegar a la traducción de salida.',
      concepts: ['rfc1918', 'tcp', 'puerto'],
      durationMs: 8000,
      activeDevices: ['pc-a', 's1', 'r1'],
      transits: [
        { link: 'a-s1', packet: aSyn },
        { link: 's1-r1', packet: { ...aSyn, id: 'a-syn-2' } },
      ],
      decision: { kind: 'local-or-remote', device: 'pc-a', dstIp: WEB, expect: 'remote' },
    },
    {
      id: 'pat-a',
      title: '2. R1 traduce dirección y puerto (PAT)',
      what: 'El paquete entra por la interfaz inside, coincide con la ACL LAN-NAT y sale por la outside. R1 reemplaza el origen 192.168.10.11:50000 por 203.0.113.2:50000 y guarda la traducción.',
      why: 'Con PAT (overload) todos los hosts comparten una IP pública; el puerto distingue cada conexión. Si el puerto original está libre, IOS intenta conservarlo.',
      protocol: 'NAT/PAT',
      layers: [4, 3],
      device: 'r1',
      decisionText: 'Crear traducción inside local 192.168.10.11:50000 ↔ inside global 203.0.113.2:50000.',
      result: 'Antes: 192.168.10.11:50000 → después: 203.0.113.2:50000 (compara ambas PDU en la pestaña Paquete).',
      misconfig: 'Si las interfaces no tuvieran ip nat inside / ip nat outside, o la ACL no incluyera la red interna, no habría traducción y el ISP descartaría el paquete por tener origen privado.',
      concepts: ['pat', 'nat', 'tabla-nat', 'inside-local'],
      durationMs: 10000,
      activeDevices: ['r1', 'isp'],
      transits: [
        { link: 's1-r1', packet: { ...aSyn, id: 'a-syn-in' }, tone: 'warn' },
        { link: 'r1-isp', packet: aSynNat },
      ],
      events: [{ type: 'nat-translate', device: 'r1', protocol: 'tcp', srcIp: A.ip, srcPort: 50000, dstIp: WEB, dstPort: 443 }],
      decision: { kind: 'nat-out', device: 'r1', protocol: 'tcp', srcIp: A.ip, srcPort: 50000, dstIp: WEB, dstPort: 443, expect: { insideGlobal: `${R1.public}:50000` } },
    },
    {
      id: 'internet',
      title: '3. Por Internet hasta el servidor',
      what: 'El paquete cruza el ISP e Internet. El servidor ve como origen 203.0.113.2:50000: no conoce la dirección privada de PC-A.',
      why: 'Fuera de la red interna solo existe la dirección pública. La IP de destino no cambió.',
      protocol: 'IPv4',
      layers: [3],
      device: 'web',
      decisionText: 'El servidor responderá a 203.0.113.2:50000.',
      result: 'El servidor recibe el SYN.',
      misconfig: 'Si el ISP no tuviera ruta de regreso hacia 203.0.113.0/30, las respuestas nunca volverían.',
      concepts: ['nat', 'ipv4'],
      durationMs: 8000,
      activeDevices: ['isp', 'internet', 'web'],
      transits: [
        { link: 'isp-net', packet: aSynNet },
        { link: 'net-web', packet: { ...aSynNet, id: 'a-syn-net-2' } },
      ],
      simplification: 'Internet se representa como una nube: el TTL real dependería de cuántos routers haya en el camino y no se muestran las tramas de cada salto.',
    },
    {
      id: 'pat-b',
      title: '4. PC-B usa el mismo puerto de origen',
      what: 'PC-B (192.168.10.12) también abre una conexión al mismo servidor desde su puerto 50000. El puerto 50000 de 203.0.113.2 ya está ocupado por PC-A, así que R1 asigna el primer puerto libre del rango: 1024.',
      why: 'Dos conexiones no pueden compartir IP pública, puerto y destino: el router no sabría a quién devolver las respuestas. Cambiar el puerto resuelve el conflicto.',
      protocol: 'NAT/PAT',
      layers: [4, 3],
      device: 'r1',
      decisionText: 'Puerto en uso → traducir 192.168.10.12:50000 a 203.0.113.2:1024.',
      result: 'Dos traducciones distintas con la misma IP pública.',
      misconfig: 'Con NAT dinámico sin overload y un pool de una sola IP, el segundo host no obtendría traducción hasta que la primera expirara.',
      concepts: ['pat', 'tabla-nat', 'puerto'],
      durationMs: 10000,
      activeDevices: ['pc-b', 's1', 'r1', 'isp'],
      transits: [
        { link: 'b-s1', packet: bSyn },
        { link: 's1-r1', packet: { ...bSyn, id: 'b-syn-2' } },
        { link: 'r1-isp', packet: bSynNat },
      ],
      events: [{ type: 'nat-translate', device: 'r1', protocol: 'tcp', srcIp: B.ip, srcPort: 50000, dstIp: WEB, dstPort: 443 }],
      decision: { kind: 'nat-out', device: 'r1', protocol: 'tcp', srcIp: B.ip, srcPort: 50000, dstIp: WEB, dstPort: 443, expect: { insideGlobal: `${R1.public}:1024` } },
      tone: 'warn',
    },
    {
      id: 'respuesta',
      title: '5. Llega la respuesta para 203.0.113.2:50000',
      what: 'El servidor responde con un TCP SYN-ACK a 203.0.113.2:50000. R1 lo recibe por la interfaz outside y busca en su tabla NAT a quién pertenece ese socket.',
      why: 'La tabla de traducciones es lo que permite que el tráfico de respuesta vuelva al host interno correcto.',
      protocol: 'NAT/PAT',
      layers: [4, 3],
      device: 'r1',
      decisionText: '203.0.113.2:50000 (desde 198.51.100.10:443) → 192.168.10.11:50000.',
      result: 'R1 sabe que la respuesta es para PC-A.',
      misconfig: 'Si la traducción hubiera expirado (timeout), la respuesta no tendría a dónde ir y se descartaría.',
      concepts: ['tabla-nat', 'inside-local'],
      durationMs: 9000,
      activeDevices: ['web', 'internet', 'isp', 'r1'],
      transits: [
        { link: 'net-web', reverse: true, packet: synAckNet },
        { link: 'r1-isp', reverse: true, packet: synAckIsp },
      ],
      decision: { kind: 'nat-in', device: 'r1', protocol: 'tcp', srcIp: WEB, srcPort: 443, dstIp: R1.public, dstPort: 50000, expect: { insideLocal: `${A.ip}:50000` } },
    },
    {
      id: 'entrega',
      title: '6. Traducción inversa y entrega a PC-A',
      what: 'R1 cambia el destino 203.0.113.2:50000 por 192.168.10.11:50000, baja el TTL y entrega el paquete en la LAN con MAC destino de PC-A.',
      why: 'Para PC-A el proceso es transparente: cree que habló directamente con el servidor.',
      protocol: 'NAT/PAT',
      layers: [4, 3, 2],
      device: 'r1',
      decisionText: 'Reescribir destino y reenviar por G0/0 (inside).',
      result: 'PC-A recibe el SYN-ACK. La conexión puede completarse.',
      misconfig: 'Aplicaciones que incluyen la IP dentro de los datos (como FTP activo o SIP) necesitan ayuda extra del router (ALG) para funcionar con NAT.',
      concepts: ['nat', 'pat'],
      durationMs: 8000,
      activeDevices: ['r1', 's1', 'pc-a'],
      transits: [
        { link: 's1-r1', reverse: true, packet: synAckLan, tone: 'ok' },
        { link: 'a-s1', reverse: true, packet: { ...synAckLan, id: 'sa-lan-2' }, tone: 'ok' },
      ],
      tone: 'ok',
    },
    {
      id: 'no-solicitado',
      title: '7. Tráfico entrante no solicitado',
      what: 'Un equipo de Internet (192.0.2.50) intenta conectarse a 203.0.113.2:8080. No existe ninguna traducción para ese socket.',
      why: 'Con PAT, las traducciones se crean solo cuando un host interno inicia la conexión. Sin entrada en la tabla, R1 no sabe a qué host interno enviarlo.',
      protocol: 'NAT/PAT',
      layers: [4, 3],
      device: 'r1',
      decisionText: 'Sin traducción → descartar.',
      result: 'El paquete no entra a la red interna.',
      misconfig: 'Para publicar un servidor interno se usa NAT estático o reenvío de puertos (ip nat inside source static tcp 192.168.10.20 80 203.0.113.2 8080). NAT no reemplaza a un firewall.',
      concepts: ['nat-estatico', 'tabla-nat'],
      durationMs: 9000,
      activeDevices: ['isp', 'r1'],
      transits: [{ link: 'r1-isp', reverse: true, packet: unsolicited, tone: 'deny' }],
      decision: { kind: 'nat-in', device: 'r1', protocol: 'tcp', srcIp: '192.0.2.50', srcPort: 40000, dstIp: R1.public, dstPort: 8080, expect: 'drop' },
      tone: 'deny',
    },
    {
      id: 'tipos',
      title: '8. NAT estático, dinámico y PAT',
      what: 'NAT estático: 1 IP privada ↔ 1 IP pública fija (permite conexiones entrantes). NAT dinámico: IP públicas de un pool asignadas 1 a 1 mientras dura la traducción. PAT: muchas privadas comparten una pública distinguiéndose por el puerto.',
      why: 'PAT es lo más común en redes con una sola IP pública; NAT estático se usa para publicar servidores internos.',
      protocol: 'NAT',
      layers: [3],
      device: 'r1',
      decisionText: 'Revisa la tabla de traducciones de R1 en la pestaña Dispositivo.',
      result: 'Dos traducciones activas que comparten 203.0.113.2.',
      misconfig: 'Un error común es aplicar ip nat inside y ip nat outside en las interfaces invertidas.',
      concepts: ['nat-estatico', 'nat-dinamico', 'pat', 'inside-local'],
      durationMs: 10000,
      activeDevices: ['r1'],
    },
  ],
};

export const dhcpNatScenario: TopologyScenario = {
  kind: 'topology',
  id: 'dhcp-nat',
  title: 'DHCP y NAT/PAT',
  summary: 'Dos recorridos: un cliente obtiene su IP con DORA, y dos hosts privados salen a Internet compartiendo una IP pública.',
  category: 'servicios-ip',
  difficulty: 'avanzado',
  examTopics: ['4.1 NAT de origen (estático y pool)', '4.3 Función de DHCP', '4.6 Cliente y relay DHCP'],
  estimatedMinutes: 12,
  objectives: [
    'Seguir el proceso DORA y los campos clave de cada mensaje DHCP.',
    'Ver cómo el servidor elige una IP del pool respetando exclusiones y préstamos.',
    'Comparar una PDU antes y después de la traducción PAT.',
    'Leer una tabla de traducciones NAT y entender cómo vuelve la respuesta.',
    'Diferenciar NAT estático, NAT dinámico y PAT.',
  ],
  simplifications: [
    'R1 actúa como servidor DHCP integrado (IOS); no se muestran el ARP de comprobación del cliente ni la renovación del préstamo.',
    'En PAT, IOS intenta conservar el puerto de origen y, si está ocupado, toma uno libre del mismo rango (aquí desde 1024). Los detalles exactos varían por versión.',
    'Internet se dibuja como una nube y las direcciones públicas usan los rangos de documentación (RFC 5737).',
    'La animación es conceptual: no es una captura real.',
  ],
  tracks: [dhcpTrack, natTrack],
};
