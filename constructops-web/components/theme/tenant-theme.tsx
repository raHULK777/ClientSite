import { evaluatePalette, type TenantPalette } from "@constructops/shared";
import type { CSSProperties, ReactNode } from "react";

export function tenantThemeStyle(palette: TenantPalette): CSSProperties {
  const { foreground } = evaluatePalette(palette);
  return {
    "--brand-primary": palette.primary,
    "--brand-secondary": palette.secondary,
    "--brand-bg": palette.background,
    "--brand-surface": palette.surface,
    "--brand-ink": foreground.primary,
    "--brand-secondary-ink": foreground.secondary,
    "--brand-bg-ink": foreground.background,
    "--brand-surface-ink": foreground.surface,
  } as CSSProperties;
}

export function TenantTheme({
  palette,
  children,
  className,
}: {
  palette: TenantPalette;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div style={tenantThemeStyle(palette)} data-tenant-theme="" className={className}>
      {children}
    </div>
  );
}
