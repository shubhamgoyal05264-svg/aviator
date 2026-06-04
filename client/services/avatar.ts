// Open-source, free avatar generation (DiceBear). Seeded by name so each
// player gets a consistent, unique character — no proprietary assets.
const STYLE = 'adventurer';

const PALETTE = ['e50539', '913ef8', '34b4ff', '28a909', 'ffc107', 'ff6b35', '16a3a3'];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `#${PALETTE[Math.abs(hash) % PALETTE.length]}`;
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(
    seed
  )}&radius=50&scale=90`;
}
