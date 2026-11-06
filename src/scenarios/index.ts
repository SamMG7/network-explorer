import type { CcnaCategoryId, Difficulty, Scenario } from '../engine/types/scenario';
import { CCNA_CATEGORIES } from '../content/categories';
import { validateScenario } from '../engine/simulation/validate';
import { osiScenario } from './osi/osiScenario';
import { subnettingScenario } from './subnetting/subnettingScenario';
import { arpScenario } from './arp/arpScenario';
import { vlanScenario } from './vlan/vlanScenario';
import { routingScenario } from './routing/routingScenario';
import { dhcpNatScenario } from './dhcp-nat/dhcpNatScenario';

/**
 * Registro de escenarios. Para agregar uno: crea su archivo de datos e
 * inclúyelo aquí. El motor, el inspector y la interfaz no cambian.
 */
export const SCENARIOS: Scenario[] = [osiScenario, arpScenario, subnettingScenario, vlanScenario, routingScenario, dhcpNatScenario];

if (import.meta.env.DEV) {
  const problems = SCENARIOS.flatMap(validateScenario);
  if (problems.length > 0) console.warn('Escenarios con problemas de integridad:\n' + problems.join('\n'));
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function haystack(s: Scenario): string {
  const category = CCNA_CATEGORIES.find((c) => c.id === s.category)?.label ?? '';
  const devices = s.kind === 'topology' ? s.tracks.flatMap((t) => t.devices.map((d) => d.hostname)) : [];
  const protocols = s.kind === 'topology' ? s.tracks.flatMap((t) => t.steps.map((st) => st.protocol)) : ['IPv4', 'CIDR', 'subnetting'];
  return normalizeText([s.title, s.summary, category, ...s.examTopics, ...devices, ...protocols].join(' '));
}

export function filterScenarios(
  scenarios: Scenario[],
  query: string,
  category: CcnaCategoryId | 'todas',
  difficulty: Difficulty | 'todas',
): Scenario[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  return scenarios.filter((s) => {
    if (category !== 'todas' && s.category !== category) return false;
    if (difficulty !== 'todas' && s.difficulty !== difficulty) return false;
    if (terms.length === 0) return true;
    const h = haystack(s);
    return terms.every((t) => h.includes(t));
  });
}

export function stepCount(s: Scenario): number {
  return s.kind === 'topology' ? s.tracks.reduce((n, t) => n + t.steps.length, 0) : 8;
}
