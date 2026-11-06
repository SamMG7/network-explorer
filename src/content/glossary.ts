export interface GlossaryEntry {
  term: string;
  definition: string;
  /** Términos relacionados (ids). */
  related?: string[];
}

/** Glosario contextual. Los pasos lo referencian por id en `concepts`. */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ---- modelos y PDU
  osi: { term: 'Modelo OSI', definition: 'Modelo de referencia de 7 capas (física, enlace de datos, red, transporte, sesión, presentación y aplicación) que sirve para describir y diagnosticar comunicaciones de red.', related: ['tcp-ip', 'pdu'] },
  'tcp-ip': { term: 'Modelo TCP/IP', definition: 'Modelo de 4 capas (acceso a la red o enlace, internet, transporte y aplicación) que describe la pila de protocolos realmente usada en Internet. Agrupa las capas 5, 6 y 7 de OSI en "aplicación" y suele agrupar 1 y 2 en "acceso a la red".', related: ['osi'] },
  pdu: { term: 'PDU (unidad de datos de protocolo)', definition: 'Nombre del bloque de información en cada capa: datos (aplicación), segmento (TCP) o datagrama (UDP), paquete (IP), trama (Ethernet) y bits (física).', related: ['encapsulacion'] },
  encapsulacion: { term: 'Encapsulación', definition: 'Proceso en el que cada capa agrega su encabezado (y Ethernet también un tráiler) a la PDU de la capa superior antes de enviarla.', related: ['desencapsulacion', 'pdu'] },
  desencapsulacion: { term: 'Desencapsulación', definition: 'Proceso inverso en el receptor: cada capa lee y retira su encabezado y entrega el contenido a la capa superior indicada (EtherType, campo Protocol, puerto).', related: ['encapsulacion'] },
  bits: { term: 'Bits (capa física)', definition: 'La trama se convierte en señales eléctricas, ópticas o de radio. La capa física no interpreta direcciones.', related: ['pdu'] },
  // ---- capa 2
  mac: { term: 'Dirección MAC', definition: 'Dirección de capa 2 de 48 bits grabada en la interfaz (p. ej. 0050.7966.6801 en notación Cisco). Solo tiene significado dentro del segmento local: cambia en cada salto entre routers.', related: ['ethernet', 'arp'] },
  ethernet: { term: 'Trama Ethernet', definition: 'PDU de capa 2: MAC destino, MAC origen, EtherType (o etiqueta 802.1Q), datos y FCS.', related: ['mac', 'ethertype', 'fcs'] },
  ethertype: { term: 'EtherType', definition: 'Campo de 2 bytes que indica qué protocolo transporta la trama: 0x0800 IPv4, 0x0806 ARP, 0x86DD IPv6. El valor 0x8100 identifica una etiqueta 802.1Q.', related: ['ethernet', 'dot1q'] },
  fcs: { term: 'FCS', definition: 'Secuencia de verificación de trama (CRC de 4 bytes) al final de la trama Ethernet. Si el receptor calcula otro valor, descarta la trama.', related: ['ethernet'] },
  switch: { term: 'Switch', definition: 'Dispositivo de capa 2 que aprende las MAC de origen por puerto y reenvía las tramas según la MAC de destino, dentro de cada VLAN.', related: ['tabla-mac', 'flooding'] },
  'tabla-mac': { term: 'Tabla de direcciones MAC', definition: 'Tabla del switch (show mac address-table) que asocia VLAN + MAC → puerto. Se llena con las MAC de ORIGEN de las tramas recibidas y las entradas dinámicas envejecen (por defecto 300 s).', related: ['switch'] },
  flooding: { term: 'Inundación (flooding)', definition: 'El switch reenvía una trama por todos los puertos de la misma VLAN excepto el de entrada. Ocurre con broadcast, multicast sin control y unicast cuyo destino no está en la tabla.', related: ['broadcast', 'tabla-mac'] },
  broadcast: { term: 'Broadcast', definition: 'Envío a todos los dispositivos del dominio. En capa 2 la MAC destino es ffff.ffff.ffff. Los routers no reenvían broadcasts de capa 2.', related: ['dominio-broadcast', 'unicast'] },
  unicast: { term: 'Unicast', definition: 'Envío a un único destino identificado por su dirección.', related: ['broadcast'] },
  'dominio-broadcast': { term: 'Dominio de broadcast', definition: 'Conjunto de dispositivos que reciben un broadcast de capa 2. Lo delimitan los routers y las VLAN: cada VLAN es un dominio de broadcast distinto.', related: ['vlan', 'broadcast'] },
  // ---- ARP
  arp: { term: 'ARP', definition: 'Protocolo que resuelve una dirección IPv4 del segmento local a su dirección MAC. El Request es broadcast; el Reply, unicast.', related: ['cache-arp', 'mac'] },
  'cache-arp': { term: 'Caché ARP', definition: 'Tabla del host o router (arp -a, show ip arp) con las asociaciones IP → MAC aprendidas. Las entradas dinámicas caducan.', related: ['arp'] },
  // ---- capa 3
  ipv4: { term: 'Paquete IPv4', definition: 'PDU de capa 3 con IP origen, IP destino, TTL y el campo Protocol (1 ICMP, 6 TCP, 17 UDP), entre otros. Sin NAT, las IP origen y destino no cambian de extremo a extremo.', related: ['ttl', 'router'] },
  ttl: { term: 'TTL', definition: 'Tiempo de vida del paquete IPv4. Cada router que lo reenvía lo disminuye en 1; si llega a 0, lo descarta y envía un ICMP Time Exceeded. Evita bucles infinitos.', related: ['ipv4'] },
  icmp: { term: 'ICMP', definition: 'Protocolo de mensajes de control de IP. ping usa Echo Request (tipo 8) y Echo Reply (tipo 0).', related: ['ipv4'] },
  router: { term: 'Router', definition: 'Dispositivo de capa 3 que reenvía paquetes entre redes según su tabla de enrutamiento. Separa dominios de broadcast y vuelve a encapsular cada paquete en una trama nueva en cada salto.', related: ['tabla-routing', 'siguiente-salto'] },
  gateway: { term: 'Gateway predeterminado', definition: 'IP del router de la subred local al que un host envía los paquetes cuyo destino está en otra red.', related: ['router'] },
  'tabla-routing': { term: 'Tabla de enrutamiento', definition: 'Lista de redes conocidas por el router (show ip route) con su origen (C conectada, L local, S estática, O OSPF…), siguiente salto e interfaz de salida.', related: ['prefijo-mas-largo'] },
  'prefijo-mas-largo': { term: 'Coincidencia de prefijo más largo', definition: 'Si varias rutas contienen al destino, el router usa la más específica (la de prefijo más largo). Una ruta /24 gana a una /16 y esta a la ruta por defecto /0.', related: ['tabla-routing', 'distancia-administrativa'] },
  'distancia-administrativa': { term: 'Distancia administrativa (AD)', definition: 'Confiabilidad del origen de una ruta (conectada 0, estática 1, OSPF 110…). Con el mismo prefijo aprendido por varias fuentes, se instala la de menor AD; con la misma AD, la de menor métrica.', related: ['prefijo-mas-largo'] },
  'ruta-conectada': { term: 'Ruta conectada (C) y local (L)', definition: 'Al configurar una IP en una interfaz activa, IOS agrega la red conectada (C) y una ruta /32 local (L) para la propia dirección del router.', related: ['tabla-routing'] },
  'ruta-estatica': { term: 'Ruta estática', definition: 'Ruta configurada manualmente con ip route red máscara siguiente-salto|interfaz. AD 1 por defecto.', related: ['tabla-routing'] },
  'ruta-defecto': { term: 'Ruta por defecto', definition: 'Ruta 0.0.0.0/0 (S* en IOS) que coincide con cualquier destino; se usa solo si no existe una ruta más específica.', related: ['prefijo-mas-largo'] },
  'siguiente-salto': { term: 'Siguiente salto', definition: 'IP del próximo router hacia el destino. El router resuelve por ARP la MAC del siguiente salto (no la del destino final) para construir la nueva trama.', related: ['router', 'arp'] },
  reencapsulacion: { term: 'Reencapsulación en cada salto', definition: 'El router retira la trama recibida, procesa el paquete y lo coloca en una trama nueva con su propia MAC de salida como origen y la MAC del siguiente salto como destino.', related: ['mac', 'router'] },
  // ---- subnetting
  subred: { term: 'Subred', definition: 'Bloque de direcciones IPv4 contiguas que comparten la misma porción de red. Los hosts de la misma subred se comunican sin router.', related: ['mascara', 'cidr'] },
  mascara: { term: 'Máscara de subred', definition: 'Valor de 32 bits con unos contiguos para la porción de red y ceros para la de host (255.255.255.0 = /24).', related: ['cidr', 'and-binario'] },
  cidr: { term: 'Prefijo CIDR', definition: 'Notación /n que indica cuántos bits iniciales son de red. Sustituyó a las clases A, B y C.', related: ['mascara'] },
  'and-binario': { term: 'AND binario', definition: 'Operación bit a bit (1 AND 1 = 1; cualquier otro caso = 0). IP AND máscara = dirección de red.', related: ['direccion-red'] },
  'direccion-red': { term: 'Dirección de red', definition: 'Primera dirección de la subred: todos los bits de host en 0. Identifica a la subred y no se asigna a hosts (salvo en /31 y /32).', related: ['direccion-broadcast'] },
  'direccion-broadcast': { term: 'Dirección de broadcast', definition: 'Última dirección de la subred: todos los bits de host en 1. Llega a todos los hosts de la subred y no se asigna a un host.', related: ['direccion-red'] },
  wildcard: { term: 'Máscara wildcard', definition: 'Inverso de la máscara (0.0.0.255 para /24). La usan las ACL y OSPF en IOS.', related: ['mascara'] },
  slash31: { term: 'Prefijo /31', definition: 'RFC 3021: subred de 2 direcciones para enlaces punto a punto. No hay dirección de red ni de broadcast utilizables como tales: ambas direcciones se asignan a los dos extremos.', related: ['slash32'] },
  slash32: { term: 'Prefijo /32', definition: 'Una sola dirección: identifica un host concreto. Se usa en interfaces loopback y rutas de host (como las rutas L de IOS).', related: ['slash31'] },
  rfc1918: { term: 'Direcciones privadas (RFC 1918)', definition: '10.0.0.0/8, 172.16.0.0/12 y 192.168.0.0/16. No se enrutan en Internet; para salir necesitan NAT.', related: ['nat'] },
  // ---- transporte
  tcp: { term: 'TCP', definition: 'Protocolo de transporte orientado a conexión (protocolo IP 6): establece la conexión con el saludo de tres vías, numera y confirma los datos y retransmite pérdidas.', related: ['puerto', 'udp'] },
  udp: { term: 'UDP', definition: 'Protocolo de transporte sin conexión (protocolo IP 17): sin confirmaciones ni retransmisiones. Lo usan DHCP, DNS y voz, entre otros.', related: ['puerto', 'tcp'] },
  puerto: { term: 'Puerto', definition: 'Número de 16 bits que identifica a la aplicación en el host. Servidores en puertos conocidos (80 HTTP, 443 HTTPS, 67/68 DHCP); clientes en puertos efímeros.', related: ['tcp', 'udp'] },
  // ---- VLAN
  vlan: { term: 'VLAN', definition: 'Red de capa 2 lógica dentro de uno o varios switches. Cada VLAN es un dominio de broadcast separado; entre VLAN se necesita enrutamiento.', related: ['dominio-broadcast', 'trunk'] },
  'puerto-access': { term: 'Puerto access', definition: 'Puerto de switch que pertenece a una sola VLAN. Las tramas entran y salen sin etiqueta: el host no sabe en qué VLAN está.', related: ['vlan', 'trunk'] },
  trunk: { term: 'Enlace trunk', definition: 'Enlace entre switches (o hacia un router) que transporta varias VLAN, identificando cada trama con una etiqueta 802.1Q.', related: ['dot1q', 'vlan-nativa'] },
  dot1q: { term: 'IEEE 802.1Q', definition: 'Estándar de etiquetado: inserta 4 bytes tras la MAC origen (TPID 0x8100 + TCI con prioridad PCP, bit DEI y VLAN ID de 12 bits).', related: ['trunk'] },
  'vlan-nativa': { term: 'VLAN nativa', definition: 'VLAN cuyas tramas cruzan el trunk sin etiqueta (VLAN 1 por defecto). Debe coincidir en ambos extremos; se recomienda cambiarla a una VLAN sin uso.', related: ['trunk'] },
  'inter-vlan': { term: 'Enrutamiento inter-VLAN', definition: 'Comunicación entre VLAN mediante un dispositivo de capa 3: router-on-a-stick (subinterfaces 802.1Q) o switch multicapa con interfaces SVI.', related: ['vlan', 'router'] },
  // ---- DHCP
  dhcp: { term: 'DHCP', definition: 'Protocolo que asigna configuración IPv4 (dirección, máscara, gateway, DNS, duración del préstamo) automáticamente. Cliente en UDP 68, servidor en UDP 67.', related: ['dora', 'lease'] },
  dora: { term: 'Proceso DORA', definition: 'Discover (cliente busca servidores), Offer (servidor ofrece una IP), Request (cliente solicita la oferta elegida) y Acknowledgment (servidor confirma).', related: ['dhcp'] },
  lease: { term: 'Préstamo (lease)', definition: 'Tiempo durante el cual el cliente puede usar la IP asignada. El cliente intenta renovarla al 50 % del tiempo (T1).', related: ['dhcp'] },
  'dhcp-relay': { term: 'Agente de retransmisión DHCP', definition: 'Como los broadcast no cruzan routers, si el servidor está en otra red el router reenvía las solicitudes como unicast (ip helper-address en IOS).', related: ['dhcp', 'broadcast'] },
  // ---- NAT
  nat: { term: 'NAT', definition: 'Traducción de direcciones de red: el router reemplaza direcciones (y con PAT también puertos) al pasar entre la red interna y la externa.', related: ['pat', 'nat-estatico', 'nat-dinamico'] },
  pat: { term: 'PAT (NAT overload)', definition: 'Muchas direcciones privadas comparten una IP pública; el router distingue cada conexión por el puerto de origen y lo cambia si ya está en uso.', related: ['nat', 'tabla-nat'] },
  'nat-estatico': { term: 'NAT estático', definition: 'Asociación fija 1 a 1 entre una IP privada y una pública (ip nat inside source static). Permite conexiones entrantes hacia un servidor interno.', related: ['nat'] },
  'nat-dinamico': { term: 'NAT dinámico', definition: 'Asigna temporalmente una IP de un grupo (pool) de direcciones públicas a cada host interno, 1 a 1, mientras dura la traducción.', related: ['nat'] },
  'tabla-nat': { term: 'Tabla de traducciones NAT', definition: 'Tabla del router (show ip nat translations) con inside local, inside global, outside local y outside global de cada traducción activa.', related: ['inside-local'] },
  'inside-local': { term: 'Inside local / inside global', definition: 'Inside local: dirección del host interno vista desde dentro (privada). Inside global: cómo se ve ese host desde fuera (pública). Outside local/global: dirección del destino externo.', related: ['tabla-nat'] },
};

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY[id];
}
