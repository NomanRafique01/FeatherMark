# Featherdown — Design Tokens

**Theme:** Warm Editorial + Forest Green
**Philosophy:** A quiet, distraction-free writing environment. Warm paper, deep ink, muted forest-green accent — not another developer IDE.

---

## 1. Core Colour Tokens

### Light Theme

| Token              | Hex       | Usage              |
|---------------------|-----------|---------------------|
| `--app-bg`          | `#F5F3ED` | Main background     |
| `--sidebar-bg`      | `#EFEEE7` | Outline/sidebar     |
| `--editor-bg`       | `#FFFFFF` | Editor surface      |
| `--preview-bg`      | `#FAF9F5` | Preview surface     |
| `--surface-hover`   | `#EAE9E1` | Hover states        |
| `--surface-active`  | `#E2E4D9` | Selected items      |
| `--border`          | `#E4E2D9` | Dividers            |
| `--border-strong`   | `#D4D3C8` | Strong borders      |
| `--text-primary`    | `#292D26` | Main text           |
| `--text-secondary`  | `#73766B` | Secondary text      |
| `--text-muted`      | `#A0A195` | Muted labels        |
| `--accent`          | `#587858` | Primary accent      |
| `--accent-hover`    | `#466747` | Accent hover         |
| `--accent-soft`     | `#E6EDE4` | Accent backgrounds  |
| `--success`         | `#648665` | Saved/success        |
| `--warning`         | `#B68A48` | Unsaved/warnings     |
| `--danger`          | `#B85C52` | Errors/delete        |

### Dark Theme

| Token              | Hex       | Usage              |
|---------------------|-----------|---------------------|
| `--app-bg`          | `#20231F` | Main background     |
| `--sidebar-bg`      | `#242821` | Sidebar             |
| `--editor-bg`       | `#292D28` | Editor surface      |
| `--preview-bg`      | `#252923` | Preview surface     |
| `--surface-hover`   | `#32372F` | Hover states        |
| `--surface-active`  | `#394237` | Selected items      |
| `--border`          | `#393E36` | Dividers            |
| `--border-strong`   | `#4A5046` | Strong borders      |
| `--text-primary`    | `#E8E8DE` | Main text           |
| `--text-secondary`  | `#B5B8AD` | Secondary text      |
| `--text-muted`      | `#858A7D` | Muted labels        |
| `--accent`          | `#A0BC98` | Primary accent      |
| `--accent-hover`    | `#B5CBAE` | Accent hover         |
| `--accent-soft`     | `#354538` | Accent backgrounds  |
| `--success`         | `#A0BC98` | Saved/success        |
| `--warning`         | `#D2AA70` | Unsaved/warnings     |
| `--danger`          | `#D98278` | Errors/delete        |

---

## 2. Markdown Syntax Colours

Syntax highlighting stays subtle — the editor should not look like VS Code.

| Element          | Light     | Dark      |
|-------------------|-----------|-----------|
| Headings          | `#466747` | `#A7C6A3` |
| Bold              | `#292D26` | `#E8E8DE` |
| Italic            | `#787A68` | `#B8BBA9` |
| Links             | `#537B91` | `#91B9CD` |
| Inline code       | `#A15F43` | `#D6A184` |
| Code blocks       | `#526C59` | `#A5BEA0` |
| Blockquotes       | `#858A7D` | `#92998C` |
| Lists             | `#587858` | `#A0BC98` |
| Horizontal rules  | `#D4D3C8` | `#4A5046` |

---

## 3. Interface-Specific Tokens

| Component              | Light     | Dark      |
|--------------------------|-----------|-----------|
| Active tab background    | `#FFFFFF` | `#292D28` |
| Inactive tab              | `#EFEEE7` | `#242821` |
| Active tab indicator      | `#587858` | `#A0BC98` |
| Unsaved indicator         | `#B68A48` | `#D2AA70` |
| Toolbar icon              | `#73766B` | `#92978B` |
| Toolbar hover             | `#EAE9E1` | `#32372F` |
| Selection                 | `#DCE8D8` | `#435441` |
| Cursor                    | `#587858` | `#A0BC98` |
| Search highlight          | `#F1DDAE` | `#665638` |
| Focus mode background     | `#FAF9F5` | `#252923` |

---

## 4. Design Rules

- **Accent:** Forest green only — no competing accent colours.
- **Background:** Warm off-white, never pure white.
- **Dark mode:** Charcoal with a subtle green undertone, never pure black.
- **Borders:** Low contrast, thin (1px).
- **Buttons:** Mostly transparent/ghost; reserve solid green for primary actions.
- **Typography:** UI font — Inter or system UI. Editor font — JetBrains Mono.
- **Preview typography:** Optional serif for rendered headings/body; editor stays monospace.
- **Animations:** Subtle, 120–160ms transitions. No glow or gradients.

---

## 5. CSS Variables (drop-in)

```css
:root {
  color-scheme: light;

  --app-bg: #F5F3ED;
  --sidebar-bg: #EFEEE7;
  --editor-bg: #FFFFFF;
  --preview-bg: #FAF9F5;

  --surface-hover: #EAE9E1;
  --surface-active: #E2E4D9;

  --border: #E4E2D9;
  --border-strong: #D4D3C8;

  --text-primary: #292D26;
  --text-secondary: #73766B;
  --text-muted: #A0A195;

  --accent: #587858;
  --accent-hover: #466747;
  --accent-soft: #E6EDE4;

  --success: #648665;
  --warning: #B68A48;
  --danger: #B85C52;
}

[data-theme="dark"] {
  color-scheme: dark;

  --app-bg: #20231F;
  --sidebar-bg: #242821;
  --editor-bg: #292D28;
  --preview-bg: #252923;

  --surface-hover: #32372F;
  --surface-active: #394237;

  --border: #393E36;
  --border-strong: #4A5046;

  --text-primary: #E8E8DE;
  --text-secondary: #B5B8AD;
  --text-muted: #858A7D;

  --accent: #A0BC98;
  --accent-hover: #B5CBAE;
  --accent-soft: #354538;

  --success: #A0BC98;
  --warning: #D2AA70;
  --danger: #D98278;
}
```

Place this file as `renderer/tokens.css` and import it before `style.css` in every component.
