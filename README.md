# Network Explorer · MVP 0.1

Plataforma educativa interactiva para **comprender redes** con el temario de **Cisco CCNA 200-301**. Cada escenario muestra una topología y anima, paso a paso, las tramas y los paquetes que la atraviesan. En cada paso explica qué ocurre, por qué ocurre, qué protocolo y qué capa intervienen, qué decide el dispositivo y qué pasaría con un error de configuración.

> Observar → Comprender → Experimentar → Aprender

- 100 % en el navegador: sin backend, base de datos, equipos físicos ni credenciales.
- Simulación **educativa y determinista**: no es una emulación de red ni una captura real de tráfico.
- Stack: React 19 · TypeScript estricto · Vite · Tailwind CSS 4 · React Flow (`@xyflow/react`) · Lucide · Vitest.

## Escenarios

| # | Escenario | Qué muestra | Pasos |
|---|-----------|-------------|-------|
| 1 | Modelo OSI y encapsulación | Datos → segmento TCP → paquete IPv4 → trama Ethernet → bits, y la desencapsulación en el servidor. Diagrama OSI ↔ TCP/IP sincronizado. | 11 |
| 2 | ARP y switching | ARP Request en broadcast, flooding, ARP Reply unicast, aprendizaje de MAC, caché ARP, y la diferencia entre IP destino y MAC destino. | 11 |
| 3 | IPv4 y subnetting | Calculadora real (máscara, wildcard, red, broadcast, rango, conteos, binario) con casos /31 y /32, validación y ejemplos. La explicación paso a paso se genera a partir del cálculo. | 8 por entrada |
| 4 | VLAN y trunking 802.1Q | Puertos access, trunk etiquetado, VLAN nativa y dominios de broadcast. Incluye un selector de VLAN y dos recorridos: misma VLAN y VLAN distinta sin enrutamiento. | 8 + 6 |
| 5 | Routing IPv4 | Destino local o remoto, gateway, coincidencia de prefijo más largo, siguiente salto, TTL, reencapsulación y una tabla por salto. | 10 |
| 6 | DHCP y NAT/PAT | Dos recorridos: DORA completo (pool, exclusiones, préstamos) y PAT con conflicto de puertos, traducción inversa y descarte de tráfico no solicitado. | 8 + 8 |

También incluye un **glosario** con 60 términos, que se puede consultar dentro de cada paso o desde la pestaña "Glosario".

## Requisitos

- Node.js 20 o superior (probado con Node 24.18 y npm 11).

## Instalación y desarrollo

```bash
npm install
```

```bash
npm run dev
```

Abre la URL que muestra Vite (por defecto http://localhost:5173).

> En Windows, si PowerShell bloquea `npm`/`npx` por la política de ejecución de scripts, usa `npm.cmd` / `npx.cmd` o la terminal de Git Bash.

## Pruebas, tipos y build

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

El build genera `dist/` y puedes revisarlo localmente con `npm run preview`.

La suite tiene 145 pruebas con Vitest y Testing Library:

| Área | Qué se prueba |
|------|---------------|
| Cálculos IPv4 | Parseo estricto (entradas inválidas, ceros a la izquierda), máscaras y prefijos de /0 a /32, máscaras no contiguas, red, broadcast, rango, conteo de hosts, casos /31, /32 y /0, direcciones privadas y validación de la calculadora. |
| Routing | Prefijo más largo, ruta por defecto, descarte sin ruta y desempate por distancia administrativa, métrica y ECMP. |
| Switching | Aprendizaje y movimiento de MAC, tabla por VLAN, flooding, reenvío, filtrado, entradas estáticas y VLAN de ingreso access/trunk. |
| ARP | Altas y actualizaciones de la caché, y la decisión local/remoto (con y sin gateway). |
| NAT/PAT | Conservación de puerto, conflicto y asignación del siguiente libre, reutilización, traducción inversa, descarte y agotamiento de puertos. |
| Motor | Reproducción, pausa y reanudación, avance y retroceso, reinicio, finalización, velocidad, cancelación de temporizadores y cambio de escenario o recorrido. |
| Estado determinista | Cada snapshot coincide con el que se reconstruye desde cero, y las tablas ARP, MAC, NAT y DHCP tienen el valor exacto en pasos concretos, también al retroceder. |
| Integridad y precisión | Ver la sección siguiente. |
| Integración | Catálogo, cambio de escenario sin temporizadores activos, decisión calculada en el panel, inspector, glosario contextual, calculadora y recorridos. |

## Despliegue en Vercel

El proyecto incluye `vercel.json` (framework Vite, `npm run build`, salida `dist`) y no necesita variables de entorno.

1. Sube la carpeta a un repositorio de GitHub.
2. En Vercel elige **Add New → Project** e importa el repositorio. La configuración se detecta sola.
3. Pulsa **Deploy**. Después, cada `git push` a la rama principal vuelve a publicar el sitio.

La navegación usa rutas con hash (`#/escenario/<id>`, `#/glosario`), así que los enlaces funcionan en cualquier hosting estático.

## Uso

- **Catálogo:** búsqueda (por ejemplo "ARP", "TTL", "802.1Q"), filtro por categoría CCNA y por dificultad.
- **Reproducción:** Reproducir/Pausar (Espacio), paso anterior y siguiente (← →), Reiniciar (R), velocidad 0.5x, 1x y 2x. Puedes hacer clic en la línea de tiempo para saltar a un paso.
- **Inspector:** haz clic en un equipo para ver sus interfaces, IPv4, máscara, MAC, gateway, caché ARP, tabla MAC, VLAN, tabla de enrutamiento, traducciones NAT o pool DHCP. Solo aparecen los datos que corresponden a ese tipo de equipo, y las filas que cambiaron en el paso se resaltan.
- **Paquetes:** haz clic en la etiqueta de una PDU (en un enlace o en un equipo) para ver su estructura encapsulada y sus campos. Cuando hay inundación, puedes elegir cada copia.

---

## Arquitectura

```
src/
├── app/App.tsx                 Composición y enrutado por hash
├── services/network/           LÓGICA DE RED (funciones puras, sin interfaz)
│   ├── ipv4.ts                 Parseo, máscaras, subnetting, binario, validación
│   ├── routing.ts              Coincidencia de prefijo más largo + desempate
│   ├── switching.ts            Aprendizaje MAC, flooding/forward/filter, VLAN de ingreso
│   ├── arp.ts                  Caché ARP y decisión local/remoto
│   └── nat.ts                  PAT: traducción de salida y de entrada
├── engine/
│   ├── types/                  Modelo: dispositivos, interfaces, enlaces, PDU, pasos, eventos
│   ├── playback/               Motor de reproducción (único temporizador) + hook de React
│   └── simulation/             ESTADO: snapshots, decisiones calculadas, validador, diff
├── scenarios/                  DATOS: osi/, arp/, subnetting/, vlan/, routing/, dhcp-nat/
├── content/                    CONTENIDO EDUCATIVO: glosario, modelo OSI/TCP-IP, categorías
├── components/                 REPRESENTACIÓN VISUAL
│   ├── topology/               Canvas, nodos, enlaces animados, diagrama OSI, leyenda
│   ├── inspector/              Dispositivo, paquete, tablas, PDU encapsulada
│   ├── education/              Panel del paso, decisión calculada, glosario, resumen por salto
│   ├── subnetting/             Calculadora y vista binaria
│   ├── playback/               Controles y línea de tiempo
│   ├── catalog/  layout/  app/ Catálogo, estructura y visores
├── hooks/  utils/
└── tests/
```

Cada capa está separada: la lógica de red no sabe nada de React, el motor no conoce el contenido de los escenarios, los escenarios son datos y los componentes solo muestran estados ya calculados.

### Motor de reproducción

`SimulationEngine` es una máquina de estados (`idle` → `playing` ⇄ `paused` → `finished`):

- Es el único lugar de la aplicación que crea un temporizador, y nunca tiene más de uno pendiente.
- Al pausar conserva el tiempo que quedaba del paso.
- Al cambiar la velocidad respeta la proporción del paso que ya avanzó.
- Con `load()` cancela la reproducción anterior. Se usa al cambiar de recorrido o de entrada de la calculadora; al cambiar de escenario, el visor se desmonta y cancela su temporizador.
- El reloj es inyectable, y las pruebas usan un `FakeClock`.

### Estado determinista (snapshots)

Cada paso declara **eventos** (`mac-learn`, `arp-set`, `nat-translate`, `dhcp-bind`, `ip-assign`). Estos eventos se aplican con la misma lógica de `services/network`.

`buildSnapshots(track)` aplica los eventos en orden y guarda un snapshot **inmutable** antes y después de cada paso. Retroceder no deshace nada: simplemente lee el snapshot anterior, así que las tablas ARP, MAC, NAT y DHCP siempre corresponden exactamente al paso visible. Las pruebas comprueban que cada snapshot es idéntico a reconstruirlo desde cero.

### Decisiones calculadas, no escritas

Un paso puede declarar una decisión: `local-or-remote`, `arp-lookup`, `switch-forward`, `route-lookup`, `nat-out` o `nat-in`. El motor la **calcula** con la lógica de red y el snapshot, y el panel muestra el resultado: la tabla de rutas con la ruta elegida, los puertos de inundación o la traducción NAT. El guion del escenario indica además qué resultado espera, y una prueba falla si el cálculo y el guion no coinciden.

### Validador de precisión

`engine/simulation/validate.ts` revisa todos los escenarios. Entre otras cosas comprueba:

- EtherType 0x0806 para ARP y 0x0800 para IPv4; campo Protocol de IPv4 coherente con TCP, UDP o ICMP.
- ARP Request en broadcast con MAC objetivo en ceros; ARP Reply unicast hacia el solicitante.
- DHCP sobre UDP 68/67, con `op` coherente con el tipo de mensaje y la opción 53 presente.
- **MAC por salto:** la MAC origen es la de la interfaz que envía (en hosts y routers) y la MAC destino es la de la interfaz que recibe.
- **802.1Q:** las tramas van etiquetadas en el trunk (salvo la VLAN nativa) y sin etiqueta en puertos access.
- Las referencias a dispositivos, interfaces, enlaces y términos del glosario existen.

Pruebas adicionales verifican que, en el routing, las IP no cambian y el TTL baja exactamente 1 por router, y que en PAT solo cambian la IP y el puerto de origen.

### Agregar un escenario

1. Crea `src/scenarios/<tema>/miEscenario.ts` con un `TopologyScenario`: dispositivos, interfaces, enlaces y pasos con PDU, eventos y decisiones.
2. Regístralo en `src/scenarios/index.ts`.
3. Ejecuta `npm test`. El validador señala cualquier incoherencia; en desarrollo también aparece en la consola.

El motor, el inspector y la interfaz no se modifican. La arquitectura deja preparada la incorporación futura de un backend (Node.js/Express y MariaDB) para cosas como el progreso o los laboratorios: los escenarios ya son datos serializables y el motor no depende de dónde vengan.

### Accesibilidad

- Todos los controles son botones nativos con etiqueta accesible y foco visible, incluidos los equipos y las PDU del canvas.
- Atajos de teclado que no interfieren con la escritura.
- Panel del paso con `aria-live`, pestañas con `role="tab"` y la línea de tiempo con `aria-current`.
- Si el sistema pide reducir el movimiento, se desactivan las animaciones de PDU y solo queda el resaltado.
- Tema oscuro por defecto y tema claro opcional, ambos con tokens de color propios.

## Precisión técnica y simplificaciones

Cada escenario enumera sus simplificaciones en "Objetivos y simplificaciones", y los pasos que simplifican algo lo indican en un recuadro. Las principales:

- **ARP** se marca como capa 2, aunque resuelve direcciones de capa 3.
- **Tablas iniciales:** en routing y NAT las cachés ARP empiezan con las entradas necesarias.
- **Rutas estáticas:** muestran la interfaz de salida; en IOS se resuelve con una búsqueda recursiva.
- **Desempate de rutas:** con el mismo prefijo gana la menor distancia administrativa y luego la menor métrica; si persiste el empate, se trata como ECMP.
- **PAT:** si el puerto de origen está ocupado, se toma el primer puerto libre desde 1024. El comportamiento exacto de IOS depende de la versión.
- **Internet** se dibuja como una nube, sin las tramas de cada salto.
- **Direcciones públicas:** se usan los rangos de documentación del RFC 5737.

## Limitaciones conocidas

- **Contenido técnico:** está revisado con base en estándares (RFC 826, 2131, 3021, 1918, 5737; IEEE 802.1Q) y documentación pública de Cisco, pero ningún instructor certificado lo ha revisado externamente.
- **Escenarios con guion:** los escenarios no se configuran libremente. Las decisiones sí se calculan, pero las PDU de cada paso están definidas en los datos (y validadas).
- **Protocolos no simulados:** STP, DTP, VTP, OSPF, el saludo de tres vías de TCP, el envejecimiento de entradas ni la renovación DHCP.
- **Calculadora:** trabaja con una sola subred; no divide bloques en varias subredes (VLSM).
- **Pruebas sin layout:** las pruebas de integración corren en jsdom, que no dibuja los nodos de React Flow. La interacción con el canvas se probó a mano en Chromium; falta probar en Firefox y Safari.
- **Tamaño del paquete:** el JavaScript pesa unos 183 KB gzip y no hay división de código.
- **Pantallas pequeñas:** las topologías anchas, como NAT con 7 equipos, se ven pequeñas en móvil y hay que hacer zoom.
- **Idioma:** solo español.

## Propuesta para la versión 0.2

1. **Modo "rompe la red":** activar fallos predefinidos (VLAN equivocada, ruta faltante, ACL de NAT incorrecta, VLAN nativa distinta) y ver cómo cambian las decisiones calculadas.
2. **PDU generadas por el motor:** generar las tramas a partir de la decisión de cada dispositivo, en lugar de escribirlas en el guion.
3. **Nuevos escenarios:**
   - Router-on-a-stick y SVI (inter-VLAN).
   - STP básico.
   - OSPF de área única (vecinos, DR/BDR, tabla resultante).
   - ACL estándar y extendidas.
   - IPv6 (EUI-64, SLAAC, NDP frente a ARP).
   - Saludo de tres vías de TCP.
4. **VLSM en la calculadora**, con ejercicios aleatorios y verificación de respuestas.
5. **CLI de solo lectura:** comandos `show` simulados sobre el snapshot (por ejemplo `show ip route`), sin emular IOS completo.
6. **Pruebas end-to-end** en navegador real (Playwright), auditoría con axe y división de código para cargar React Flow bajo demanda.
7. **Progreso local** por escenario, como paso previo a un backend con cuentas (Node.js/Express + MariaDB).
