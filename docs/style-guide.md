# Website Styling Rules —  Deep Green Theme

Use this file as the global design direction for the website. The visual style should feel like a professional B2B software company: clear, calm, reliable, structured, and easy to scan. The design is inspired by the Q3 website style: practical business software, clean sections, strong call-to-actions, rounded cards, simple icons, and a focus on clarity over decoration.

The main brand color for this project is **deep green**.

---

## 1. Brand feeling

The website should feel:

- Professional, trustworthy, and practical.
- Modern, but not flashy.
- Clear and structured, with plenty of whitespace.
- Friendly enough for small businesses, but still serious enough for B2B software.
- Focused on helping the visitor quickly understand what the product does.

Avoid:

- Overly playful gradients.
- Neon colors.
- Complex animations.
- Crowded layouts.
- Generic SaaS purple/blue styling.

---

## 2. Color palette

Use deep green as the primary color.

```css
:root {
  --color-primary: #385344;        /* Deep green */
  --color-primary-dark: #24382D;   /* Dark forest green */
  --color-primary-light: #EAF1ED;  /* Soft green background */

  --color-secondary: #20342A;      /* Deep green-gray text */
  --color-accent: #6F927D;         /* Muted sage accent */

  --color-background: #FFFFFF;
  --color-background-soft: #F6F8F5;
  --color-background-muted: #E9EFEA;

  --color-text: #1F2933;
  --color-text-muted: #667085;
  --color-border: #D6E0D9;

  --color-success: #3F6B4F;
  --color-warning: #D39B2A;
  --color-danger: #B54747;
}
```

### Color usage

- Use `--color-primary` for main buttons, active states, links, icons, highlights, and important UI accents.
- Use `--color-primary-dark` for hover states and dark hero elements.
- Use `--color-primary-light` for soft section backgrounds and feature cards.
- Use white backgrounds for most content sections.
- Use muted green-gray backgrounds to separate large blocks.
- Do not use bright blue or purple unless required by a third-party integration.

---

## 3. Typography

Use a clean sans-serif font stack.

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Heading style

Headings should be bold, clear, and compact.

```css
h1 {
  font-size: clamp(2.4rem, 5vw, 4.5rem);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.04em;
}

h2 {
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.12;
  font-weight: 750;
  letter-spacing: -0.03em;
}

h3 {
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 700;
}
```

### Body text

```css
body {
  font-size: 16px;
  line-height: 1.65;
  color: var(--color-text);
}

p {
  color: var(--color-text-muted);
}
```

Keep text direct and benefit-focused. Prefer short paragraphs.

---

## 4. Layout principles

Use a clean B2B landing-page structure.

### Page width

```css
.container {
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}
```

### Section spacing

```css
section {
  padding-block: clamp(64px, 8vw, 112px);
}
```

### Grid style

Use simple responsive grids:

```css
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 48px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Header / navigation

The header should be simple, sticky, and business-like.

### Header rules

- White background.
- Thin bottom border.
- Logo on the left.
- Navigation links centered or right-aligned.
- Primary CTA button on the right.
- Mobile menu should be clean and full-width.

```css
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}
```

Navigation labels should be short:

- Waarom wij
- Functionaliteiten
- Sectoren
- Prijzen
- Contact

---

## 6. Hero section

The hero should immediately explain the product and show a clear CTA.

### Hero layout

Use a two-column layout on desktop:

- Left: headline, paragraph, CTA buttons, trust points.
- Right: screenshot, dashboard mockup, card stack, or product visual.

On mobile, stack content vertically.

### Hero style

```css
.hero {
  background:
    radial-gradient(circle at top right, rgba(56, 83, 68, 0.18), transparent 34%),
    linear-gradient(180deg, #FFFFFF 0%, #F6F8F5 100%);
}
```

### Hero content pattern

Use this structure:

```txt
Eyebrow: Praktische software voor [doelgroep]
H1: Krijg grip op [belangrijk probleem]
Paragraph: Leg in 1–2 zinnen uit wat de software doet en waarom het handig is.
CTA 1: Plan een demo
CTA 2: Bekijk functies
Trust points: Snel starten · Eenvoudig beheer · Duidelijke rapportages
```

---

## 7. Buttons

Buttons should be rounded, solid, and clear.

```css
.button-primary {
  background: var(--color-primary);
  color: #FFFFFF;
  border-radius: 999px;
  padding: 12px 22px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(36, 56, 45, 0.18);
}

.button-primary:hover {
  background: var(--color-primary-dark);
}

.button-secondary {
  background: #FFFFFF;
  color: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 12px 22px;
  font-weight: 700;
}

.button-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}
```

Button text should be action-based:

- Plan een demo
- Neem contact op
- Bekijk mogelijkheden
- Start gratis
- Vraag offerte aan

---

## 8. Cards

Use cards for features, benefits, sectors, pricing, and steps.

```css
.card {
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 16px 40px rgba(31, 41, 51, 0.06);
}

.card-soft {
  background: var(--color-primary-light);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 28px;
}
```

### Card rules

- Use one small icon at the top.
- Use a short heading.
- Use a short paragraph.
- Optionally include a small list with checkmarks.
- Keep cards visually consistent.

---

## 9. Icons

Use simple line icons.

Icon style:

```css
.icon-box {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}
```

Preferred icon themes:

- Checklists
- Planning
- QR/barcode scan
- Reports
- Users/roles
- Documents
- Maintenance/tools
- Notifications

---

## 10. Feature sections

Feature sections should be practical and concrete.

Use this pattern:

```txt
Small label: Functionaliteiten
Heading: Alles wat u nodig heeft om overzicht te houden
Paragraph: Korte uitleg.
Feature grid: 6 cards max.
```

Good feature examples:

- Werkorders beheren
- Planning inzichtelijk maken
- Meldingen eenvoudig opvolgen
- Documenten en foto’s bewaren
- Rollen en autorisaties instellen
- Rapportages bekijken

---

## 11. Lists and checkmarks

Use clean checkmark lists instead of long paragraphs.

```css
.check-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.check-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.check-list li::before {
  content: "✓";
  color: var(--color-primary-dark);
  font-weight: 800;
}
```

---

## 12. Forms

Forms should be simple and spacious.

```css
.input,
.textarea,
.select {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 12px 14px;
  background: #FFFFFF;
  color: var(--color-text);
}

.input:focus,
.textarea:focus,
.select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(56, 83, 68, 0.14);
}
```

Labels should be clear and business-like.

Use form sections for:

- Name
- Company
- Email
- Phone
- Message

---

## 13. Footer

The footer should be dark deep green/green-gray.

```css
.footer {
  background: #1D2C24;
  color: #FFFFFF;
  padding-block: 56px;
}

.footer a {
  color: rgba(255, 255, 255, 0.78);
}

.footer a:hover {
  color: #FFFFFF;
}
```

Footer columns:

- Product
- Sectoren
- Bedrijf
- Support
- Contact

---

## 14. Visual style

Use visuals that support the software/product story.

Preferred visuals:

- Dashboard screenshots.
- Planning screens.
- Work order cards.
- Simple abstract UI mockups.
- Photos of practical business environments only when relevant.

Avoid:

- Generic stock photos of people smiling at laptops.
- Heavy 3D illustrations.
- Complex decorative shapes.

---

## 15. Motion and interaction

Keep motion subtle.

Use:

- Smooth hover states.
- Small card lift on hover.
- Gentle fade-in on scroll.
- Button color transitions.

Avoid:

- Bouncy animations.
- Fast transitions.
- Large parallax effects.

```css
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 48px rgba(31, 41, 51, 0.09);
}

.card,
.button-primary,
.button-secondary {
  transition: all 180ms ease;
}
```

---

## 16. Tone of voice

Write in clear Dutch unless the page is explicitly English.

Tone:

- Direct.
- Helpful.
- Practical.
- No buzzwords.
- No exaggerated marketing claims.

Use phrases like:

- “Krijg grip op...”
- “Eenvoudig beheren...”
- “Alles overzichtelijk op één plek.”
- “Snel inzicht in...”
- “Maak werkprocessen duidelijker.”

Avoid phrases like:

- “Revolutionair”
- “Game-changing”
- “Next-gen”
- “AI-powered” unless truly relevant

---

## 17. Component rules

### Section header component

Every major section should start with:

```txt
Eyebrow label
Large heading
Short paragraph
```

Example:

```txt
Functionaliteiten
Werk slimmer met duidelijke processen
Beheer meldingen, werkorders, documenten en planning vanuit één overzichtelijke omgeving.
```

### CTA block component

Use a CTA block near the bottom of important pages.

```css
.cta-block {
  background: var(--color-primary);
  color: #FFFFFF;
  border-radius: 32px;
  padding: clamp(32px, 6vw, 64px);
}
```

CTA block text:

```txt
Klaar om meer overzicht te krijgen?
Plan een korte demo en ontdek wat de software voor uw organisatie kan doen.
```

---

## 18. Tailwind theme suggestion

Use this as the Tailwind color setup.

```ts
colors: {
  green: {
    50: '#F6F8F5',
    100: '#EAF1ED',
    200: '#D6E0D9',
    300: '#ADC4B6',
    400: '#6F927D',
    500: '#385344',
    600: '#30483B',
    700: '#24382D',
    800: '#20342A',
    900: '#1D2C24',
  }
}
```

Recommended Tailwind classes:

```txt
Primary button: bg-green-500 hover:bg-green-700 text-white rounded-full shadow-lg
Secondary button: bg-white border border-green-200 text-green-900 rounded-full
Soft section: bg-green-50
Soft card: bg-green-100 border border-green-200 rounded-3xl
Text: text-slate-900
Muted text: text-slate-500
Footer: bg-green-900 text-white
```

---

## 19. Example landing page structure

Use this order for homepage pages:

1. Header
2. Hero with product visual
3. Logo/trust strip or short proof section
4. Problem section
5. Feature grid
6. Product screenshot section
7. Sector/use-case section
8. Step-by-step process
9. Pricing or demo CTA
10. FAQ
11. Final CTA
12. Footer

---

## 20. Final design instruction for AI

When generating any new page, component, or section:

1. Use the deep green palette.
2. Keep the layout spacious and structured.
3. Use rounded cards, simple icons, and clear CTA buttons.
4. Write concise Dutch B2B copy.
5. Make every section useful and easy to scan.
6. Prioritize clarity over decoration.
7. Ensure the design works well on mobile.
8. Keep the style consistent across the whole website.
