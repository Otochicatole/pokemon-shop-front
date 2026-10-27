export type CompanionType = 'electric' | 'fire' | 'water';

export interface Companion {
  id: 'charmander' | 'pikachu' | 'squirtle';
  name: string;
  type: CompanionType;
  typeLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  spriteUrl: string;
  bgColor: string;
  heroLine: string;
  message: string;
  detail: string;
}

export const companions: readonly Companion[] = [
  {
    id: 'charmander',
    name: 'CHARMANDER',
    type: 'fire',
    typeLabel: 'FUEGO',
    level: 18,
    hp: 48,
    maxHp: 48,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif',
    bgColor: '#AE252C',
    heroLine: 'Tu próxima llamarada.',
    message: 'quiere acompañarte.',
    detail: 'La llama de su cola ilumina el sendero.',
  },
  {
    id: 'pikachu',
    name: 'PIKACHU',
    type: 'electric',
    typeLabel: 'ELÉCTRICO',
    level: 18,
    hp: 48,
    maxHp: 48,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif',
    bgColor: '#F5C023',
    heroLine: 'Tu próximo rayo.',
    message: 'quiere acompañarte.',
    detail: 'Pikachu salió del pasto alto y parece amigable.',
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
    bgColor: '#8CC5CE',
    heroLine: 'Tu próxima burbuja.',
    message: 'quiere acompañarte.',
    detail: 'Squirtle espera junto a la cascada.',
  },
] as const;
