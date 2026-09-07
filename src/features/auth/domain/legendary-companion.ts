export type LegendaryCompanionType = 'psychic' | 'fire' | 'ice';

export interface LegendaryCompanion {
  id: 'mewtwo' | 'moltres' | 'articuno';
  name: string;
  type: LegendaryCompanionType;
  typeLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  spriteUrl: string;
  message: string;
  detail: string;
}

export const legendaryCompanions: readonly LegendaryCompanion[] = [
  {
    id: 'mewtwo', name: 'MEWTWO', type: 'psychic', typeLabel: 'PSÍQUICO', level: 70, hp: 212, maxHp: 212,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/150.gif',
    message: 'observa desde el vacío.', detail: 'Una energía psíquica atraviesa la cámara estelar.',
  },
  {
    id: 'moltres', name: 'MOLTRES', type: 'fire', typeLabel: 'FUEGO', level: 65, hp: 195, maxHp: 195,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/146.gif',
    message: 'enciende el horizonte.', detail: 'Sus llamas dibujan un nuevo camino para tu colección.',
  },
  {
    id: 'articuno', name: 'ARTICUNO', type: 'ice', typeLabel: 'HIELO', level: 65, hp: 195, maxHp: 195,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/144.gif',
    message: 'desciende entre cristales.', detail: 'El aire se vuelve frío cuando sus alas aparecen.',
  },
] as const;
