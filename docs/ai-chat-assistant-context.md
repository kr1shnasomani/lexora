# AI Chat Assistant UI — Design & Implementation Context

> Attach this file when prompting an LLM to build the chat assistant component. It captures visual design language, interaction patterns, layout variants, and engineering requirements derived from the reference screenshots.

---

## 1. Overview

Build an **AI chat assistant widget** that lives inside a dark-themed intelligence/analytics dashboard. The assistant exists in two modes:

| Mode | Trigger | Description |
|------|---------|-------------|
| **Floating Widget** | Default / minimized | Small FAB button (bottom-right corner), bot icon |
| **Inline Panel** | Expanded / docked | Full panel docked to the right side of the dashboard, or as a modal overlay |
| **Full Modal** | Maximize action | Centered modal with side context panel |

---

## 2. Visual Design Language

### 2.1 Color Palette

```css
/* Backgrounds */
--bg-base:        #0d0d0f;   /* page background */
--bg-surface:     #161618;   /* card / panel surface */
--bg-elevated:    #1e1e22;   /* message bubbles, inputs */
--bg-overlay:     rgba(22, 22, 24, 0.97); /* modal backdrop blur */

/* Brand / Accent */
--accent-primary: #e8354a;   /* red — CTAs, active states, bot avatar */
--accent-glow:    rgba(232, 53, 74, 0.15); /* subtle red ambient glow */

/* Text */
--text-primary:   #f0f0f2;
--text-secondary: #8a8a9a;
--text-muted:     #55555f;
--text-highlight: #ff6b7a;   /* inline code / entity highlights in AI messages */

/* Status */
--status-critical: #e8354a;
--status-warning:  #f59e0b;
--status-ok:       #22c55e;
--status-online:   #22c55e;

/* Borders */
--border-subtle:  rgba(255,255,255,0.06);
--border-active:  rgba(232, 53, 74, 0.4);
```

### 2.2 Typography

```css
font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;

/* Scale */
--text-xs:   11px / 1.4  — timestamps, labels, badges
--text-sm:   13px / 1.5  — metadata, secondary text
--text-base: 14px / 1.6  — message body, UI text
--text-lg:   16px / 1.5  — panel headings
--text-xl:   20px+       — dashboard headings (outside chat scope)

font-weight-normal: 400
font-weight-medium: 500
font-weight-semibold: 600
font-weight-bold: 700
```

### 2.3 Spacing & Radii

```css
--radius-sm:  6px    /* tags, badges */
--radius-md:  10px   /* message bubbles, inputs */
--radius-lg:  14px   /* panels, cards */
--radius-xl:  20px   /* modal container */
--radius-full: 9999px /* FAB, avatar, pills */

/* Spacing scale: 4, 8, 12, 16, 20, 24, 32px */
```

### 2.4 Shadows & Depth

```css
--shadow-panel: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
--shadow-fab:   0 8px 32px rgba(232, 53, 74, 0.4);
--shadow-msg:   0 2px 8px rgba(0,0,0,0.3);
```

---

## 3. Component Architecture

```
ChatAssistant/
├── FABButton              ← floating trigger (minimized state)
├── ChatPanel              ← main container (two layout variants)
│   ├── PanelHeader        ← bot identity + controls
│   ├── MessageList        ← scrollable conversation thread
│   │   ├── DateDivider
│   │   ├── UserMessage
│   │   ├── AssistantMessage
│   │   │   ├── MessageText (with inline highlights)
│   │   │   ├── BulletList
│   │   │   └── ActionButtons
│   │   └── TypingIndicator
│   ├── InputBar           ← text input + mic + send
│   └── InputFooter        ← disclaimer text
└── ContextPanel           ← right sidebar (modal variant only)
    ├── ContextHeader
    ├── MetricChart (Risk Score)
    ├── MetricChart (Velocity)
    ├── RelatedEntities
    └── TelemetryButton
```

---

## 4. Layout Variants

### 4.1 Floating Widget (Minimized)

- Fixed position: `bottom: 28px; right: 28px`
- **FAB button**: 56×56px circle, `--accent-primary` background
- Bot icon (white, 24px) centered
- Optional: small notification dot (top-right of FAB) for unread messages
- On click → animate to **Inline Panel** or **Full Modal**

### 4.2 Inline Panel (Docked to dashboard)

Dimensions: ~340px wide, full dashboard height  
Position: right side of layout, pushes content left OR overlays

```
┌──────────────────┐
│  PanelHeader     │  ← 60px tall
├──────────────────┤
│                  │
│  MessageList     │  ← flex-1, scrollable
│                  │
├──────────────────┤
│  InputBar        │  ← 56px tall
├──────────────────┤
│  InputFooter     │  ← 28px
└──────────────────┘
```

Header contains: bot avatar (32px, red bg), name + status dot, minimize `—` and expand `↗` icon buttons.

### 4.3 Full Modal (Expanded)

Centered modal, max 760px wide, ~660px tall  
Two-column layout:

```
┌─────────────────────────────────┬──────────────────┐
│  PanelHeader (spans full width) │                  │
├─────────────────────────────────┤  ContextPanel    │
│  MessageList                    │  (220px fixed)   │
│                                 │                  │
├─────────────────────────────────┤                  │
│  InputBar                       │                  │
├─────────────────────────────────┤                  │
│  InputFooter                    │                  │
└─────────────────────────────────┴──────────────────┘
```

Header controls: history icon, settings gear icon, close `×` icon  
Session ID displayed below name in muted text: `SESSION ID: LX-XXXX`

---

## 5. Component Specifications

### 5.1 PanelHeader

```
[BotAvatar 32px] [Name bold 14px]           [history] [settings] [close]
                 [session-id muted 11px]
```

- Background: `--bg-surface` with bottom border `--border-subtle`
- Bot avatar: red rounded square (8px radius), white bot/shield icon
- Controls: icon buttons 32×32px, `--text-secondary` color, hover → `--text-primary`
- Status indicator (inline variant): green dot 8px + "Online" text in `--status-online`

### 5.2 MessageList

- Background: `--bg-surface`
- Padding: 16px horizontal, 12px vertical
- Messages are separated by natural spacing (12–16px gap)
- **Date/time divider**: centered, small muted text, e.g. `Today, 10:43 AM`
- Auto-scroll to bottom on new message
- Custom scrollbar: 4px wide, `--bg-elevated` track, `--border-active` thumb

### 5.3 UserMessage Bubble

```css
.user-message {
  align-self: flex-end;
  background: linear-gradient(135deg, #c0283b, #e8354a);
  color: #fff;
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  max-width: 75%;
  font-size: 14px;
  line-height: 1.5;
}
```

- User avatar: 32px circle, `--bg-elevated`, initials (e.g. "JD"), positioned to the right of bubble outside
- Timestamp (below, right-aligned): `--text-muted`, 11px — e.g. `Read 10:44 AM`

### 5.4 AssistantMessage Bubble

```css
.assistant-message {
  align-self: flex-start;
  background: #1e1e24;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px 16px 16px 16px;
  padding: 14px 16px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.6;
}
```

- Bot avatar (32px) sits to the left, outside the bubble
- **Inline highlights**: entity names, IPs, code → `color: --text-highlight` (red-pink), optionally `background: rgba(232,53,74,0.1)` with 4px radius
- **Bullet list**: custom red dot (`--accent-primary`), 6px, line-height 1.6
- **Bold text**: `font-weight: 700`, white
- Footer below bubble: `--text-muted` 11px — version + timestamp e.g. `Lexora Core v2.4 • 10:43 AM`

### 5.5 AssistantMessage Action Buttons

Appear at the bottom of assistant message bubbles for actionable responses:

```
[🔍 Analyze Cluster]  [Isolate Subnet]
```

- Primary action: `background: --accent-primary`, white text, left icon, 8px radius, 10px 16px padding
- Secondary action: `background: transparent`, `border: 1px solid --border-subtle`, muted text — hover → border brightens
- Font: 13px, 500 weight
- Gap: 8px between buttons

### 5.6 Typing Indicator

Three animated dots inside an assistant bubble:
```css
/* Three dots, each 8px circle, --text-secondary color */
/* Animate: scale + opacity pulse, staggered 0.15s delay each */
animation: pulse 1.2s ease-in-out infinite;
```

### 5.7 InputBar

```
[+ icon] [──── input field ────────────────] [🎤] [▶ send]
```

```css
.input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: --bg-elevated;
  border: 1px solid --border-subtle;
  border-radius: 12px;
  margin: 10px 12px;
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: --text-primary;
  font-size: 14px;
  placeholder-color: --text-muted;
}

.send-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: --accent-primary;
  color: white;
  display: grid; place-items: center;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.send-btn:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(232,53,74,0.5); }
```

- `+` icon: attach/expand actions
- Mic icon: `--text-secondary`, activates voice input
- On focus: outer container border → `--border-active`

### 5.8 InputFooter

```
Lexora Intelligence can make mistakes. Verify critical alerts.
```
- Centered, `--text-muted`, 11px, padding-bottom 10px

### 5.9 ContextPanel (Modal variant only)

Right sidebar, 220px wide, `border-left: 1px solid --border-subtle`

**Header:**
```
CONTEXT                    (all-caps, 11px, muted, letter-spacing 0.08em)
● Active Threat             (red dot + label, 13px bold white)
```

**Metric Row:**
```
Risk Score Trend            High (92)   ← label left, value right in --accent-primary
[bar chart sparkline]                   ← 6–8 bars, red gradient, last 2 full red
```

**Velocity Row:**
```
Velocity (req/s)            1,240       ← orange value
[bar chart sparkline]                   ← orange/amber bars
```

**Related Entities (tags):**
```
[#medical-equip] [#botnet-sig]
[Region-US-E]
```
Tag style: `background: rgba(255,255,255,0.06)`, `border: 1px solid --border-subtle`, 6px radius, 11px text

**Bottom CTA:**
```
[Full Telemetry Report]     ← full-width outlined button, 13px, --text-secondary
```

---

## 6. Animations & Transitions

| Element | Animation |
|---------|-----------|
| FAB → Panel open | Scale from 0.85 + opacity 0→1, 280ms cubic-bezier(0.34,1.56,0.64,1) |
| Panel → Modal expand | Width/height morph + position transition, 320ms ease |
| New message appear | Slide up 8px + opacity 0→1, 200ms ease-out |
| Typing indicator dots | Staggered pulse, 1.2s infinite |
| Send button hover | Scale 1.08 + glow, 150ms |
| Input focus | Border color transition, 150ms |
| Context panel charts | Bar height animate in on load, staggered 50ms per bar |

---

## 7. Interaction Behaviors

- **Auto-scroll**: MessageList scrolls to bottom on new message; user can scroll up to read history (scroll-to-bottom button appears when not at bottom)
- **Keyboard**: `Enter` sends message; `Shift+Enter` = newline; `Escape` minimizes/closes
- **Loading state**: Send button shows spinner; input disabled while AI is responding
- **Error state**: Toast notification at top of panel — red background, `×` dismiss
- **Empty state**: Centered illustration/icon + prompt suggestions (3–4 chips)
- **Message actions** (hover on message): copy, regenerate, thumbs up/down — appear as subtle icon row above message
- **Voice input**: mic button toggles recording mode — pulsing red ring around mic icon

---

## 8. Accessibility

- All icon buttons: `aria-label` required
- Chat region: `role="log"`, `aria-live="polite"` for screen readers
- Input: `aria-label="Type your message"`, `aria-describedby` → footer disclaimer
- Sufficient contrast: all text meets WCAG AA minimum
- Focus ring: visible 2px ring in `--accent-primary` on keyboard focus
- Reduced motion: respect `prefers-reduced-motion` — disable slide/scale animations, keep opacity only

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `> 1024px` | Full modal with ContextPanel sidebar |
| `768–1024px` | Modal without ContextPanel (hidden or tabbed) |
| `< 768px` | Full-screen overlay takeover; InputBar fixed to bottom |

---

## 10. Tech Stack Recommendations

```
Framework:     React 18+ or Vanilla JS (Web Components for portability)
Styling:       Tailwind CSS (JIT) or CSS Modules with CSS custom properties
Animation:     Framer Motion (React) or CSS keyframes
Icons:         Lucide React / Heroicons
Charts (ctx):  Recharts sparklines or custom SVG bars
State:         Zustand or React Context for chat history + panel state
Streaming:     EventSource / fetch with ReadableStream for token streaming
```

### Key implementation notes

1. **Token streaming**: Render AI response character-by-character using `ReadableStream`. Update the last message in state progressively.
2. **Message schema**:
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // raw text or markdown
  timestamp: Date;
  actions?: ActionButton[];  // optional CTA buttons
  metadata?: string;         // "Lexora Core v2.4 • 10:43 AM"
}

interface ActionButton {
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
}
```
3. **Markdown rendering**: Parse `**bold**`, `- bullets`, inline `code` with custom renderers that apply the brand highlight color.
4. **Panel state machine**: `minimized → inline → modal → minimized` with clean transitions.
5. **Persist history**: Store messages in `localStorage` keyed by session ID; clear on explicit "new session" action.

---

## 11. Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|---------|
| Use the red accent sparingly — only for primary actions, highlights, critical status | Make everything red — it loses meaning |
| Keep message bubbles high-contrast against dark surface | Use pure black `#000` backgrounds — too harsh |
| Animate subtly and fast (<300ms) | Use slow, elaborate animations that feel sluggish |
| Show typing indicator immediately when request is sent | Leave a blank waiting state with no feedback |
| Truncate long entity strings with `…` and tooltip | Let long strings break layout |
| Use `backdrop-filter: blur` on modal overlay | Use opaque overlays that hide context |
| Left-align assistant messages, right-align user messages | Center all messages — it feels un-chat-like |
| Include session metadata / version info subtly below messages | Clutter the message with meta information |

---

*Reference design: Lexora Intelligence Dashboard — AI Assistant Component. Dark theme, high-density data environment, enterprise security context.*
