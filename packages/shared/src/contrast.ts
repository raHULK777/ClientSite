export type Rgb = { r: number; g: number; b: number };

export type TenantPalette = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
};

export type ContrastCheck = {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  pass: boolean;
};

export type PaletteEvaluation = {
  ok: boolean;
  checks: ContrastCheck[];
  foreground: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
  };
};

const INK = "#15202B";
const WHITE = "#FFFFFF";

export function parseHex(input: string): Rgb | null {
  const value = input.trim().replace(/^#/, "");
  if (value.length === 3) {
    const expanded = value
      .split("")
      .map((char) => char + char)
      .join("");
    return parseHex(expanded);
  }
  if (value.length !== 6 || !/^[0-9a-f]{6}$/i.test(value)) {
    return null;
  }
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) {
    throw new Error(`Invalid hex color: ${!fg ? foreground : background}`);
  }
  const light = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

export function pickForeground(background: string, candidates: string[] = [WHITE, INK]): string {
  let best = candidates[0] ?? WHITE;
  let bestRatio = 0;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}

function check(
  name: string,
  foreground: string,
  background: string,
  required: number,
): ContrastCheck {
  const ratio = contrastRatio(foreground, background);
  return {
    name,
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    required,
    pass: ratio >= required,
  };
}

export function evaluatePalette(palette: TenantPalette): PaletteEvaluation {
  const foreground = {
    primary: pickForeground(palette.primary),
    secondary: pickForeground(palette.secondary),
    background: pickForeground(palette.background),
    surface: pickForeground(palette.surface),
  };

  const checks = [
    check("Body text on page paper", INK, palette.background, 4.5),
    check("Body text on raised surface", INK, palette.surface, 4.5),
    check("Button text on primary", foreground.primary, palette.primary, 4.5),
    check("Text on secondary", foreground.secondary, palette.secondary, 4.5),
    check("Secondary as a text mark on paper", palette.secondary, palette.background, 4.5),
    check("Primary as a large graphic on paper", palette.primary, palette.background, 3),
  ];

  return {
    ok: checks.every((item) => item.pass),
    checks,
    foreground,
  };
}
