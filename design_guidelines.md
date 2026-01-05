# Design Guidelines: Professional Real Estate CRM

## Design Approach

**System-Based Design: Material Design Inspired**
This enterprise CRM requires a robust, proven design system that prioritizes usability, data density, and professional workflows. Drawing from Material Design and modern SaaS applications like Linear, Notion, and professional dashboards, we'll create a clean, efficient interface optimized for productivity.

**Core Principles:**
- Information clarity over decoration
- Efficient workflows with minimal clicks
- Consistent patterns across all modules
- Professional, trustworthy aesthetic
- Responsive data density

## Layout System

**Sidebar + Content Architecture:**
- Fixed left sidebar: 280px width (w-70), dark neutral background
- Main content area: Flexible width with max-w-7xl container
- Top bar: 64px height (h-16) for breadcrumbs, search, user menu

**Spacing Scale:**
Primary units: 4, 6, 8, 12, 16 (p-4, gap-6, m-8, py-12, px-16)
- Component padding: p-6 or p-8
- Section spacing: py-8 or py-12
- Card gaps: gap-4 or gap-6
- Form field spacing: space-y-6

**Grid System:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width with horizontal scroll
- Forms: Two-column layout (lg:grid-cols-2) for efficiency
- Detail tabs: Full-width single column for focused content

## Typography

**Font Family:**
Primary: Inter or Roboto via Google Fonts (professional, highly legible)
Monospace: JetBrains Mono for data fields, IDs, technical info

**Hierarchy:**
- Page Titles: text-2xl or text-3xl, font-semibold
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base
- Labels: text-sm, font-medium, uppercase tracking-wide
- Metadata/Secondary: text-sm, reduced opacity
- Data Values: text-base or text-lg, font-medium (for emphasis on key numbers)

## Component Library

### Navigation
**Left Sidebar:**
- Logo/branding at top (h-16, matching top bar)
- Primary navigation items with icons (Heroicons)
- Active state: subtle highlight with left border accent
- Collapsible sections for sub-navigation
- User profile section at bottom

**Top Bar:**
- Breadcrumb navigation (text-sm)
- Global search with keyboard shortcut hint
- Quick actions dropdown
- Notifications icon with badge
- User avatar with dropdown menu

### Dashboard Components
**KPI Cards:**
- White background, rounded-lg, shadow-sm
- Large number display (text-3xl, font-bold)
- Label below (text-sm, uppercase)
- Trend indicator with small arrow icon
- Compact padding (p-6)

**Activity Lists:**
- Chronological timeline view with left accent line
- Avatar + name + action + timestamp
- Click to expand for details
- "Load more" pagination

**Charts:**
- Clean line/bar charts using Chart.js or Recharts
- Minimal grid lines
- Clear axis labels
- Tooltips on hover

### Data Tables
**Structure:**
- Sticky header row (font-medium, text-sm, uppercase)
- Alternating row backgrounds for readability
- Row hover state for interactivity
- Action buttons revealed on row hover
- Pagination controls at bottom
- Column sorting indicators
- Filters in top toolbar

**Density:**
- Comfortable: py-4 row height
- Compact option: py-2 for power users

### Forms
**Input Fields:**
- Clear labels above inputs (text-sm, font-medium)
- Input height: h-10 or h-11
- Border: border rounded-md
- Focus state: ring accent treatment
- Helper text below (text-xs)
- Validation messages in appropriate tone

**Field Groups:**
- Related fields grouped with subtle background (bg-gray-50)
- Use fieldset with legend for accessibility

**Smart Forms:**
- Inline AI suggestions for auto-complete
- Real-time validation feedback
- Save state indicators
- Auto-save with timestamp display

### Tab Navigation (Client/Property Details)
**Tab Bar:**
- Horizontal tabs below page header
- Active tab: bottom border accent (border-b-2)
- Tab labels: text-sm, font-medium
- Icon + text for primary tabs
- Smooth content transitions

**Tab Content:**
- Consistent padding (p-8)
- Organized sections within tabs
- Sticky sub-headers if scrollable content

### Cards
**Standard Card:**
- White background, rounded-lg, shadow-sm
- Header with title + action menu (text-lg, font-semibold)
- Body content with appropriate spacing
- Optional footer for metadata or actions

**Property Card (Grid View):**
- Image at top (aspect-ratio: 4/3)
- Compact info below: price (large), location, specs
- Status badge overlay on image
- Hover: subtle lift with increased shadow

**Client Card:**
- Avatar or initials circle
- Name + rating stars
- Key metadata (tipo_cliente, last contact)
- Quick action buttons

### Matching Interface
**Match Results:**
- Side-by-side comparison cards
- Match score prominently displayed (0-100)
- Highlight matching criteria in green
- Missing criteria in subtle red
- "Propose" button with confirmation

### Communication Timeline
**Message Thread:**
- Chat-like interface with timestamps
- Differentiate incoming/outgoing (alignment)
- Channel icons (WhatsApp, email, phone)
- AI-generated messages marked clearly
- Quick reply suggestions at bottom

### Modals & Overlays
**Dialog Structure:**
- Centered, max-width: max-w-2xl
- Header with title + close button
- Content area with appropriate padding
- Footer with action buttons (right-aligned)
- Backdrop blur

**Slide-over Panel:**
- Right-side panel for quick edits (w-96 or w-1/3)
- Similar structure to modals
- Smooth slide transition

### Buttons & Actions
**Primary Action:** Solid background, font-medium, px-4 py-2, rounded-md
**Secondary:** Border, transparent background
**Danger:** Red treatment for destructive actions
**Icon Buttons:** Square aspect ratio, p-2, hover background

### AI Coach Section
**Daily Briefing Card:**
- Prominent position on dashboard
- Motivational message at top (text-lg, italic)
- Task breakdown with time slots
- Progress indicators
- Collapsible detailed view

### Status & Badges
**Client/Property Status:**
- Small rounded-full badges
- Color-coded (active, pending, archived)
- Text size: text-xs, font-medium, uppercase

**Priority Indicators:**
- Traffic light system (red/yellow/green circles)
- Or star ratings (1-5)

## Images
No hero images - this is a productivity application. Use icons extensively for:
- Empty states (custom illustrations for "no clients yet", "no matches found")
- AI coach avatar/icon
- Property thumbnails (user-uploaded)
- Client avatars (initials fallback)

## Responsiveness
- Desktop-first design (primary use case)
- Tablet: Collapsible sidebar, adjusted data table columns
- Mobile: Bottom navigation, stacked layouts, simplified tables (card view)

**This design creates a professional, efficient workspace that handles complexity gracefully while maintaining clarity and usability throughout the entire CRM system.**