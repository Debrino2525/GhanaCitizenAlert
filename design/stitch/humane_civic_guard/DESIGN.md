---
name: Humane Civic Guard
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#d0c6ab'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#999078'
  outline-variant: '#4d4632'
  surface-tint: '#ecc300'
  primary: '#fff0c9'
  on-primary: '#3b2f00'
  primary-container: '#fcd116'
  on-primary-container: '#6e5a00'
  inverse-primary: '#715c00'
  secondary: '#ffb3ad'
  on-secondary: '#68000a'
  secondary-container: '#a40217'
  on-secondary-container: '#ffaea8'
  tertiary: '#bfffdc'
  on-tertiary: '#003824'
  tertiary-container: '#5fedb0'
  on-tertiary-container: '#006947'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe17b'
  primary-fixed-dim: '#ecc300'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#554500'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ad'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930013'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.04em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a dignified, reliable, and approachable civic safety ecosystem tailored for everyday Ghanaian citizens. Rather than projecting an intimidating, militaristic, or high-tech surveillance aura, the experience conveys calm reassurance, neighborhood solidarity, and absolute dependability under duress. 

The aesthetic is built on warm modernism calibrated for deep night clarity: high-legibility dark surfaces, clear visual anchors, and cultural resonance. The signature Ghana national palette (Red, Gold, Green) is treated not as loud decoration, but as an understated 3px structural ribbon motif and functional color grammar. Every layout emphasizes directness, physical ergonomics for one-handed thumb reach during high-stress scenarios, and transparent status feedback.

## Colors

The palette operates under a strict role-based hierarchy to ensure instant recognition during critical incidents:

- **Canvas Base (`#070B13`):** Ultra-deep slate that reduces eye fatigue, preserves battery life on OLED displays, and provides maximum contrast for emergency indicators.
- **Card Surfaces (`#0F172A`) & Outlines (`#1E293B`):** Elevation is delineated through calm, blue-tinted dark slates and crisp border separations.
- **Ghana Gold (`#FCD116`):** The primary action accent. Reserved for constructive user actions, primary confirmations, and standard submissions. Primary gold buttons must always pair with deep contrast dark text (`#070B13`) to guarantee accessible contrast.
- **Emergency Red (`#EF4444`):** Strictly reserved for distress states, panic triggers, active hazards, and life-critical warnings. It is never used for trivial destructive confirmations.
- **Verification Green (`#10B981`):** Applied exclusively to safe resolutions, confirmed delivery receipts, and verified incident alerts.
- **Informational Blue (`#38BDF8`):** Dedicated to interactive hyperlinks, contextual tooltips, and non-emergency informational tags.
- **Content Text:** Primary text is set in `#E2E8F0` (near white) for maximum legibility; secondary supporting copy, helper text, and metadata sit at `#94A3B8`.

A 3-color linear micro-accent gradient—Ghana Red (`#EF4444`), Gold (`#FCD116`), and Green (`#10B981`)—is used as a subtle 3px structural cap atop key cards and modal sheets, grounding the application in national pride without visual clutter.

## Typography

Typography prioritizes rapid scanning and absolute clarity under challenging outdoor sunlight or nighttime low-brightness conditions:

- **Primary Interface (Plus Jakarta Sans):** Handles headlines, descriptions, button labels, and general copy. Its open counters and geometric humanism feel warm and approachable rather than bureaucratic. Body copy never drops below 14px (`body-md`), ensuring readability across all age groups.
- **Reference & Telemetry (JetBrains Mono):** Monospaced numerals and uppercase characters ensure zero ambiguity between numbers and letters (e.g., `0` vs `O`, `1` vs `I`). It is deployed strictly for tracking codes (e.g., `GH-2026-7K4QZ8M2`), GhanaPost GPS digital addresses, and geospatial coordinates.
- **Accessibility Floor:** The smallest allowable label size across the system is 12px with elevated weight (Medium/500) and generous line heights to prevent visual crowding.

## Layout & Spacing

The layout is built on a 4px/8px incremental grid with a fluid single-column structure on mobile devices, transitioning to a structured 4-column layout on compact screens and 8-to-12 columns on tablets.

- **Edge Margins:** Fixed 16px (`1rem`) outer canvas gutters ensure content does not touch device edges or become obscured by phone cases, expanding to 24px (`1.5rem`) on tablets.
- **Touch Target Integrity:** Every interactive trigger maintains an absolute minimum touch zone of 48×48px, padded internally when the visual asset is smaller.
- **Ergonomic Safe Zone:** Primary submission triggers, panic holds, and floating confirmation actions reside in the lower third of the screen ("thumb zone") to facilitate one-handed operation.
- **Component Padding Rhythm:** Cards use 16px internal padding for standard items and 20px–24px for critical incident summaries, preserving breathing room between dense report data.

## Elevation & Depth

Visual hierarchy relies on disciplined tonal stacking and sharp structural boundaries rather than heavy, indistinct drop shadows:

- **Base Layer (Level 0):** Canvas `#070B13`.
- **Card Surface (Level 1):** `#0F172A` with a continuous 1px stroke of `#1E293B`. Shadows are minimal: `0 2px 4px rgba(0, 0, 0, 0.4)`.
- **Elevated Modals & Action Sheets (Level 2):** Elevated surface `#1E293B` bounded by a 1px stroke of `#334155`, backed by a soft ambient shadow (`0 12px 32px rgba(0, 0, 0, 0.65)`).
- **Distress Elements:** Active emergency panels utilize a subtle outer glow tinted with Emergency Red (`0 0 20px rgba(239, 68, 68, 0.25)`) to communicate priority without vibrating aggressively against the dark background.
- **Ghana Ribbon Trim:** High-priority cards feature a top border accent composed of a seamless 3px horizontal gradient bar transitioning from `#EF4444` to `#FCD116` to `#10B981`.

## Shapes

The design system maintains a balanced, friendly, yet disciplined contour language using a base radius of 16px (`rounded-lg`):

- **Cards and Panels:** Set consistently to 16px (`1rem`) to project modern approachability while fitting neatly onto standard mobile viewports.
- **Buttons and Inputs:** Fixed at 12px (`0.75rem`) border radius, balancing tactile friendliness with structured discipline.
- **Pill Elements:** Filter chips, verification badges, and incident status tags use a full pill radius (`9999px`) to distinguish categorical metadata from actionable input surfaces.
- **Inner Nested Elements:** Secondary inner media thumbnails or embedded map snapshots within a card use a 10px radius to adhere to geometric nesting rules.

## Components

### Buttons
- **Primary Action (Ghana Gold):** Background `#FCD116`, text `#070B13` (bold, 16px). Height 52px (exceeding the 48px baseline). Hover/press state shifts to `#E5BD0E`. Focus ring: 2px `#FCD116` with a 2px dark offset.
- **Emergency SOS Distress:** Background `#EF4444`, text `#FFFFFF` (bold, 18px). Minimum height 56px. Requires a long-press interaction (2-second hold indicator ring) to prevent accidental triggers.
- **Secondary / Ghost:** Transparent background with 1px `#1E293B` outline, text `#E2E8F0`. Active state fills with `#1E293B`.

### Input Fields & Controls
- **Text Inputs:** Height 52px, surface `#0F172A`, border 1px `#1E293B`, border-radius 12px. Text is `#E2E8F0`, placeholder is `#64748B`. Focus transitions border to `#FCD116` with zero layout shift.
- **Checkboxes & Radios:** 24×24px visual boxes within a 48×48px tap envelope. Inactive border is `#475569`. Active state fills with `#FCD116` (checkmark in `#070B13`) or `#EF4444` for distress options.

### Chips & Status Badges
- **Status Pills:** Height 28px, full pill radius. Composed of an 8px circular status dot followed by uppercase monospaced text (`label-mono-sm`).
  - *Verified / Safe:* Background `rgba(16, 185, 129, 0.12)`, text `#10B981`, dot `#10B981`.
  - *Under Review / Pending:* Background `rgba(252, 209, 22, 0.12)`, text `#FCD116`, dot `#FCD116`.
  - *High Danger / Urgent:* Background `rgba(239, 68, 68, 0.15)`, text `#EF4444`, dot `#EF4444`.

### Incident & Tracking Cards
- **Structure:** Surface `#0F172A`, 1px outline `#1E293B`, 16px corner radius, 16px inner padding.
- **Header:** Contains the mono tracking code (e.g., `GH-2026-7K4QZ8M2`) in `#94A3B8` aligned with the status pill.
- **Ghana Ribbon Accent:** High-urgency and official broadcast cards apply the 3px tricolor top strip (`#EF4444` -> `#FCD116` -> `#10B981`) anchored to the top card boundary.

### Coordinate & Digital Address Lockup
- A dedicated card component displaying the citizen's current GhanaPost GPS address (e.g., `AK-039-5028`) and coordinates in JetBrains Mono (`label-mono-lg`), paired with an instant "Copy" or "Share" action for immediate verbal transmission to first responders.