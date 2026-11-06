import type { CcnaCategory } from '../engine/types/scenario';

/** Áreas del temario Cisco CCNA 200-301 usadas para agrupar escenarios. */
export const CCNA_CATEGORIES: CcnaCategory[] = [
  { id: 'fundamentos', label: 'Fundamentos de redes' },
  { id: 'acceso', label: 'Acceso a la red' },
  { id: 'conectividad-ip', label: 'Conectividad IP' },
  { id: 'servicios-ip', label: 'Servicios IP' },
];
