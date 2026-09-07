export type CompanionType = 'electric' | 'fire' | 'water';

export interface Companion {
  id: 'pikachu' | 'charmander' | 'squirtle';
  name: string;
  type: CompanionType;
  typeLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  spriteUrl: string;
  message: string;
  detail: string;
}

export const companions: readonly Companion[] = [
  {
    id: 'pikachu',
    name: 'PIKACHU',
    type: 'electric',
    typeLabel: 'ELÉCTRICO',
    level: 18,
    hp: 48,
    maxHp: 48,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif',
    message: 'quiere acompañarte.',
    detail: 'Pikachu salió del pasto alto y parece amigable.',
  },
  {
    id: 'charmander',
    name: 'CHARMANDER',
    type: 'fire',
    typeLabel: 'FUEGO',
    level: 18,
    hp: 48,
    maxHp: 48,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif',
    message: 'quiere acompañarte.',
    detail: 'La llama de su cola ilumina el sendero.',
  },
  {
    id: 'squirtle',
    name: 'SQUIRTLE',
    type: 'water',
    typeLabel: 'AGUA',
    level: 18,
    hp: 48,
    maxHp: 48,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/7.gif',
    message: 'quiere acompañarte.',
    detail: 'Squirtle espera junto a la cascada.',
  },
] as const;
