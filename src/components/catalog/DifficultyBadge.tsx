import type { Difficulty } from '../../engine/types/scenario';

const COLOR: Record<Difficulty, string> = {
  básico: 'var(--ok)',
  intermedio: 'var(--orange)',
  avanzado: 'var(--deny)',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize"
      style={{ color: COLOR[difficulty], borderColor: `color-mix(in srgb, ${COLOR[difficulty]} 60%, transparent)` }}
    >
      <span className="sr-only">Dificultad: </span>
      {difficulty}
    </span>
  );
}
