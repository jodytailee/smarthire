// Color de acento libre para plantillas de puesto (badges, botones y
// checkboxes del wizard público). Antes solo se podía elegir entre "rose" y
// "slate" (nombres de paleta de Tailwind); ahora es cualquier color, así que
// se guarda como hex y se aplica con estilos inline en vez de clases
// utilitarias de Tailwind (Tailwind no puede generar clases para un color
// arbitrario que solo se conoce en tiempo de ejecución).

export const DEFAULT_ACCENT = "#e11d48"; // equivalente a rose-600

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Compatibilidad con datos viejos que guardaron "rose"/"slate" en vez de hex.
const LEGACY: Record<string, string> = {
  rose: "#e11d48",
  slate: "#475569",
};

export function normalizeAccentColor(color?: string | null): string {
  if (!color) return DEFAULT_ACCENT;
  if (HEX_RE.test(color)) return color;
  return LEGACY[color] ?? DEFAULT_ACCENT;
}

// Fondo suave para badges/pills: el mismo color con ~10% de opacidad,
// aprovechando que #RRGGBBAA es un hex de 8 dígitos válido en CSS moderno.
export function accentSoftBg(color: string): string {
  return `${color}1a`;
}

export const ACCENT_PRESETS = [
  "#e11d48", // rose
  "#475569", // slate
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
];
