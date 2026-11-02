---
name: ConstructOps
description: "Tenant-branded contractor workspace built like a contractor's job set: paper ground, ink rules, ruled schedules, and revision marks reserved for change."
colors:
  paper: "#f8f9f9"
  paper-sunk: "#edf0f1"
  paper-raised: "#ffffff"
  ink: "#15202b"
  ink-soft: "#3e4a55"
  muted: "#5c6a76"
  line: "#c9d0d5"
  line-strong: "#8b97a1"
  revision: "#b3261e"
  focus: "#15202b"
  brand-primary: "#15202b"
  brand-secondary: "#b3261e"
  brand-bg: "#f8f9f9"
  brand-surface: "#ffffff"
  brand-ink: "#ffffff"
typography:
  display:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(2.6rem, 7vw, 5.25rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  data:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0em"
  stencil:
    fontFamily: "Saira Stencil, Impact, Haettenschweiler, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  none: "0px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  button-revision:
    backgroundColor: "{colors.revision}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  badge-approved:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  data-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "16px 12px"
  schedule:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  stamp:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.revision}"
    typography: "{typography.stencil}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
---

# ConstructOps design system

## Overview

**Creative North Star: "The Job Set"**

ConstructOps surfaces are built like a contractor's plan set: a cool paper sheet, a visible drafting grid, ruled schedules, a title block that carries the tenant's identity, and revision marks reserved for change. The product is a quiet instrument; the tenant is the author. ConstructOps never puts its own identity on a tenant surface.

This is a working document, not a brochure. The landing page lets a visitor's answers draft an itemized quote on the spot. The app compresses projects, money, and approvals into dense, legible schedules. The portal gives one client their job, its change orders, and a stamped signed record. Across all three, the material is paper, ink, and type; the hierarchy comes from rules and scale, not decoration.

**Key characteristics:**

- Cool paper ground, white working sheets, near-black ink.
- Square corners and hard 1px rules. The only curve is a radio indicator.
- Archivo drives hierarchy; Saira Stencil appears only on sheet numbers and stamps.
- Tenant color enters through computed brand variables, never through product chrome.
- Revision red and the stamp are scarce, meaningful signals.
- Motion behaves like drafting: rows appear, dimension lines draw, a stamp lands.

## Colors

The system is a paper-and-ink world. Neutrals carry almost every surface; tenant brand color is an accent applied to actions and title blocks, not a wash.

- **Job-Set Ink** (`#15202b`): primary type, rules, focus rings, and the default primary action.
- **Soft Ink** (`#3e4a55`): body copy on paper.
- **Muted Slate** (`#5c6a76`): labels, metadata, secondary copy.
- **Cool Paper** (`#f8f9f9`): page ground.
- **Sunk Paper** (`#edf0f1`): wells, selected rows, schedule heads.
- **Sheet White** (`#ffffff`): cards, forms, tables, raised sheets.
- **Hairline** (`#c9d0d5`): separators and schedule rules.
- **Control Line** (`#8b97a1`): control borders and dotted schedule rules.
- **Revision Red** (`#b3261e`): change marks, rejection, destructive actions, and the stamp.

Tenant variables `brand-primary`, `brand-secondary`, `brand-bg`, and `brand-surface` are data. The theme computes `brand-ink`, `brand-secondary-ink`, `brand-bg-ink`, and `brand-surface-ink` so every tenant color remains readable. The default product palette is ink primary, revision secondary, paper background, white surface.

### Named Rules

**The Tenant Ink Rule.** Tenant color is data, not product identity. Product chrome stays paper and ink; tenant color appears only through `brand-*` variables on actions and title blocks. Santos navy and orange do not become ConstructOps colors.

**The Revision Rarity Rule.** Revision red means change or danger. It is not an accent for emphasis, decoration, or ordinary links. If nothing changed, nothing should be red.

**The Computed Foreground Rule.** Never hand-pick a foreground on a tenant color. Foregrounds come from the contrast policy: 4.5:1 for body text, 3:1 for large text and graphics. A tenant palette that fails is rejected or warned in `/system`, not silently corrected.

## Typography

**Display Font:** Archivo variable, width axis 62–125, with Arial Narrow, Arial, and sans-serif fallbacks.

**Body Font:** Archivo at normal width, 400 weight.

**Label Font:** Archivo at 112% width, 600 weight, uppercase, 11px, 0.12em tracking.

**Stencil Font:** Saira Stencil, 400 weight, with Impact and Haettenschweiler fallbacks. Used only for stamps and sheet/project numbers.

Archivo supplies three voices through width and weight: a 125%-wide 800 display for the plan-set title, a 112% 700 heading for sections, and a normal-width 400 for reading. Saira Stencil is a marking tool, not a text face.

### Hierarchy

- **Display** (800, `clamp(2.6rem, 7vw, 5.25rem)`, 0.92 line-height, -0.03em tracking, uppercase): the page title on the landing and auth surfaces. One per page.
- **Title** (800, `clamp(1.9rem, 4vw, 3rem)`, 1 line-height, -0.02em tracking): major section and workspace page titles.
- **Heading** (700, 1.25rem, 1.2 line-height, -0.01em tracking): card and subsection headings.
- **Body** (400, 1rem, 1.6 line-height): prose, constrained to roughly 42–46 characters in hero copy and 65–75 characters in long copy.
- **Label** (600, 0.6875rem, uppercase, 0.12em tracking): field labels, table heads, badges, nav metadata.
- **Data** (400, 1rem, tabular numerals): money, percentages, dimensions, and estimates.
- **Stencil** (400, 0.6875rem, uppercase in context): stamps and plan-sheet identifiers only.

### Named Rules

**The Tabular Rule.** Any number a reader might compare uses tabular numerals and the data treatment. Money is right-aligned in schedules.

**The Two-Family Rule.** Archivo and Saira Stencil only. No third family; no monospace as body copy.

## Layout

The landing page is a 1400px composition with 16px mobile and 24px tablet gutters. The login surface is capped at 1152px. The client portal is capped at 896px. The workspace uses a 240px sticky rail at 1024px and wider, with 16px, 24px, and 32px content padding as space allows. Below 1024px the rail becomes a 280px drawer.

Breakpoints are 640px, 768px, and 1024px. Two-column compositions collapse to one column below 1024px; dense schedule rows collapse to stacked label/value groups below 640px. Page headers use a 2px ink bottom rule and a label-plus-title stack. Sheets use a 1px ink border; internal divisions use 1px hairlines or dotted control lines.

Density is deliberate. Interactive targets are at least 44px. Schedule cells use roughly 10px vertical and 12px horizontal padding. Wide schedules scroll inside their sheet rather than widening the document. The landing's drafting grid is 22px with a 1px line at 5.5% ink; the fine variant is 11px at 4%.

### Named Rules

**The Sheet Rule.** Content sits on a sheet, and a sheet has edges. Do not float text on unbounded gradient fields or let a table escape its border.

**The One-Scroll Rule.** The document scrolls vertically; a dense table may scroll horizontally inside its own sheet. The page itself never gains a horizontal scrollbar.

## Elevation & Depth

Depth is structural, not atmospheric. Most surfaces are flat paper separated by 1px ink rules. White sheets sit directly on the paper ground. A single soft sheet shadow may separate a floating sheet from the page: `0 24px 60px -40px rgba(21, 32, 43, 0.45)`. Offset hard shadows (`4px 4px 0 0`) are reserved for deliberately physical moments, such as a primary marketing card, and use ink or revision red.

### Named Rules

**The Flat-by-Default Rule.** If a surface can be understood from its border and paper tone, it gets no shadow. Blurred shadows are not a hierarchy tool.

**The Hard-Offset Rule.** A hard offset shadow must be earned by a single physical object on a marketing surface. It never appears on ordinary app cards, inputs, or tables.

## Shapes

The shape language is the square. Cards, inputs, buttons, badges, dialogs, schedules, and sheets have a 0px radius. Circles appear only where the control's meaning requires one: the 20px radio indicator with its 10px dot. Borders are 1px for structure, 2px for page rules and emphasis, and dashed for revision clouds.

### Named Rules

**The Square-Sheet Rule.** No rounded cards, pill buttons, or soft input corners. If a container feels too plain, add a rule or change the type scale, not a radius.

**The One-Circle Rule.** The only circular geometry is the radio indicator. Avatars, badges, and status dots stay square.

## Components

The component vocabulary lives in `constructops-web/components/ui`: button, input, textarea, field, badge, checkbox, radio group, select, dialog, tabs, tooltip, popover, progress, toast, data card, schedule, stamp, and sheet. `components/shell` supplies `BrandShell`; `components/theme` supplies `TenantTheme`; `components/system` supplies the interactive state sheet at `/system`.

- **Buttons.** Primary uses tenant primary with computed ink, 48px height, 20px horizontal padding, semibold body text, and `brightness(0.95)` on hover. Secondary is a 44px white sheet with a 1px ink border and uppercase label. Revision is a 48px revision-red action with white text. Ghost has no border until hover. Press feedback is `scale(0.97)`.
- **Inputs and fields.** 44px height, white ground, 1px ink border, 12px horizontal padding. Focus is a 2px ink ring with a 2px paper offset. Errors use revision red for border and message; hints use muted slate. Labels sit above the control in label type.
- **Badges.** Four status variants: draft (control line, paper, muted), pending (revision border and text), approved (ink fill, paper text), rejected (revision fill, white text). Badges are square, 10px uppercase labels with 4px/8px padding.
- **Data cards.** White sheet, 1px ink border, dotted 1px control-line header rule, muted label, semibold data value at `clamp(1.5rem, 3vw, 2rem)`, and a hairline footer for context.
- **Schedules.** White sheet with 1px ink border and a 2px ink header rule. Rows use dotted control-line rules; numbers are right-aligned and tabular; the header uses muted label type.
- **Stamps.** A 2px revision-red border, revision-red stencil text, 4px/10px padding, and a -4deg rotation. The stamp lands; it does not float or bounce.
- **Progress.** A 1px control-line border around a sunk-paper track with an ink or brand primary indicator. It is a measured bar, not a glowing progress ring.
- **Tabs.** A 2px ink bottom rule with muted label triggers; the active trigger is ink with a 2px ink indicator.
- **Dialogs.** White sheet, 2px ink border, no radius, hard edge, and a paper backdrop. Headers use title type; actions align right.
- **Navigation.** The workspace rail is paper ground with a 2px ink right rule, label-type items at 44px minimum height, and a 2px ink active marker. The mobile drawer is 280px wide and reaches full viewport height.

### Named Rules

**The Control Contract.** Every control is at least 44px tall, has a visible 2px ink focus ring with a 2px paper offset, and uses the same press treatment. No custom control may opt out.

**The Status-Only Badge Rule.** Badges communicate state, not decoration. If an item has no state, it gets no badge.

## Do's and Don'ts

### Do

- Do ground every page on cool paper and place working content on white sheets.
- Do use one display title per page, followed by a label that names the surface.
- Do use 1px ink rules and dotted control-line rules to structure dense information.
- Do reserve revision red and the stamp for actual change, rejection, or destruction.
- Do compute tenant foregrounds with the contrast policy and show the result in `/system`.
- Do keep numbers tabular, money right-aligned, and comparisons scannable.
- Do let wide schedules scroll inside their sheet while the document stays vertically honest.
- Do move with transform and opacity only; respect `prefers-reduced-motion` with instant states.

### Don't

- Don't round cards, buttons, inputs, or badges. The radio indicator is the only circle.
- Don't add blueprint texture, torn paper, tape, fake photography, or decorative gradients. The drafting grid is the only pattern.
- Don't use revision red as a decorative accent or to emphasize ordinary copy.
- Don't put ConstructOps branding on a tenant surface; the tenant is the author.
- Don't stack blurred shadows or use elevation to fake hierarchy that rules can provide.
- Don't introduce a third type family, script face, or monospace body copy.
- Don't use pill-shaped status chips or circular avatars.
- Don't let a table widen the page or hide its overflow without an affordance.
