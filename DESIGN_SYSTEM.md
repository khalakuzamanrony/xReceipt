# xReceipt Design System

## 🎨 Color Palette

### Primary Colors
- **Blue 600**: `#2563eb` - Primary action color
- **Blue 700**: `#1d4ed8` - Hover state
- **Blue 800**: `#1e40af` - Active state
- **Blue 500**: `#3b82f6` - Focus rings

### Semantic Colors
- **Success**: Green 600 (`#16a34a`)
- **Warning**: Yellow 600 (`#ca8a04`)
- **Error**: Red 600 (`#dc2626`)
- **Info**: Blue 600 (`#2563eb`)

### Neutral Colors
- **White**: `#ffffff` - Backgrounds
- **Gray 50**: `#f9fafb` - Light backgrounds
- **Gray 100**: `#f3f4f6` - Secondary backgrounds
- **Gray 200**: `#e5e7eb` - Borders, dividers
- **Gray 300**: `#d1d5db` - Input borders
- **Gray 400**: `#9ca3af` - Disabled states
- **Gray 600**: `#4b5563` - Secondary text
- **Gray 700**: `#374151` - Body text
- **Gray 900**: `#111827` - Headings, primary text

## 📐 Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Font Sizes
- **Heading 1**: 32px (2xl) - Page titles
- **Heading 2**: 24px (2xl) - Card titles, section headers
- **Heading 3**: 20px (xl) - Subsection headers
- **Body**: 16px (base) - Regular text
- **Small**: 14px (sm) - Secondary text, labels
- **Tiny**: 12px (xs) - Captions, metadata

### Font Weights
- **Bold**: 700 - Headings, important text
- **Semibold**: 600 - Labels, emphasis
- **Medium**: 500 - (Not used, use semibold instead)
- **Regular**: 400 - Body text

### Line Heights
- Headings: 1.2 (tight)
- Body: 1.5 (normal)
- Small text: 1.4 (normal)

## 🧩 Component Specifications

### Buttons

#### Default Button
```
Background: Blue 600
Text: White
Padding: 10px 16px (h-10 px-4)
Border Radius: 8px (rounded-lg)
Font Weight: Semibold
Shadow: md (0 4px 6px -1px rgba(0, 0, 0, 0.1))
Hover: Blue 700 + lg shadow
Active: Blue 800
Focus: Ring 2 Blue 500 + offset 2
```

#### Outline Button
```
Background: White
Border: 2px Gray 300
Text: Gray 900
Padding: 10px 16px (h-10 px-4)
Border Radius: 8px (rounded-lg)
Hover: Gray 50 background
Active: Gray 100 background
```

#### Ghost Button
```
Background: Transparent
Text: Gray 700
Padding: 10px 16px (h-10 px-4)
Hover: Gray 100 background
Active: Gray 200 background
```

#### Destructive Button
```
Background: Red 600
Text: White
Padding: 10px 16px (h-10 px-4)
Hover: Red 700
Active: Red 800
```

### Input Fields

```
Background: White
Border: 1px Gray 300
Text: Gray 900
Placeholder: Gray 400
Padding: 8px 16px (px-4 py-2)
Height: 40px (h-10)
Border Radius: 8px (rounded-lg)
Font Size: 16px (base)
Focus: Ring 2 Blue 500 + offset 2
Disabled: Gray 50 background + opacity 50
Transition: All 150ms
```

### Labels

```
Font Size: 14px (sm)
Font Weight: Semibold
Color: Gray 900
Margin Bottom: 8px
```

### Cards

```
Background: White
Border: 1px Gray 200
Border Radius: 12px (rounded-xl)
Shadow: sm (0 1px 2px 0 rgba(0, 0, 0, 0.05))
Hover: md shadow (0 4px 6px -1px rgba(0, 0, 0, 0.1))
Padding: 24px (p-6)
Transition: All 150ms
```

### Dialogs (Modals)

```
Background: White
Border: 1px Gray 300
Border Radius: 12px (rounded-xl)
Shadow: 2xl (0 25px 50px -12px rgba(0, 0, 0, 0.25))
Padding: 24px (p-6)
Max Width: 448px (max-w-lg)
Overlay: Black 80% opacity
Title: 20px, Bold, Gray 900
Description: 14px, Gray 600
```

### Checkboxes

```
Size: 20px (h-5 w-5)
Border: 2px Gray 300
Border Radius: 6px (rounded-md)
Background: White
Checked Background: Blue 600
Checked Border: Blue 600
Check Icon: White, 16px
Hover: Gray 400 border
Focus: Ring 2 Blue 500 + offset 2
Transition: All 150ms
```

## 🎯 Spacing System

All spacing uses Tailwind's 4px base unit:

- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 12px (0.75rem)
- **lg**: 16px (1rem)
- **xl**: 24px (1.5rem)
- **2xl**: 32px (2rem)
- **3xl**: 48px (3rem)
- **4xl**: 64px (4rem)

### Common Spacing Patterns

**Page Layout**
- Top padding: 32px (py-8)
- Side padding: 32px (px-8) on desktop, 16px (px-4) on mobile
- Section gap: 24px (gap-6)

**Cards**
- Padding: 24px (p-6)
- Gap between elements: 16px (gap-4)

**Forms**
- Field gap: 16px (gap-4)
- Label margin: 8px (mb-2)

**Lists**
- Item gap: 12px (gap-3)
- Divider: 1px Gray 200

## 🔲 Border Radius

- **sm**: 4px - Small elements
- **md**: 6px - Checkboxes, small buttons
- **lg**: 8px - Buttons, inputs
- **xl**: 12px - Cards, dialogs
- **2xl**: 16px - Large cards

## 💫 Shadows

```
sm:   0 1px 2px 0 rgba(0, 0, 0, 0.05)
md:   0 4px 6px -1px rgba(0, 0, 0, 0.1)
lg:   0 10px 15px -3px rgba(0, 0, 0, 0.1)
2xl:  0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

## 🎬 Transitions & Animations

### Duration
- **Fast**: 150ms - Hover states, simple transitions
- **Normal**: 200ms - Modal animations, page transitions
- **Slow**: 300ms - Complex animations

### Easing
- **Linear**: Uniform speed
- **Ease-in-out**: Default for most animations

### Common Animations
- Button hover: 150ms background color
- Modal open: 200ms zoom + fade
- Loading spinner: Infinite 1s rotation

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (xl, 2xl)

### Layout Patterns
- **Mobile**: Single column, full width
- **Tablet**: 2 columns, 16px padding
- **Desktop**: 3-4 columns, 32px padding

## ✅ Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text)
- Focus indicators are always visible (Blue 500 ring)
- Disabled states are clearly indicated

### Interactive Elements
- Minimum touch target: 44px × 44px
- Focus ring: 2px Blue 500 with 2px offset
- Hover states clearly indicate interactivity

### Forms
- All inputs have associated labels
- Error messages are clear and visible
- Required fields are marked with *

## 🎨 Usage Examples

### Form Group
```jsx
<div className="space-y-2">
  <Label htmlFor="name">Name *</Label>
  <Input
    id="name"
    type="text"
    placeholder="Enter name"
  />
</div>
```

### Card with Content
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Modal Dialog
```jsx
<Dialog open={true} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Button Variants
```jsx
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>
```

## 🔄 Consistency Checklist

- [ ] All text is readable (sufficient contrast)
- [ ] All interactive elements are 44px+ touch targets
- [ ] All modals have bright white backgrounds
- [ ] All form labels are visible and bold
- [ ] All buttons have consistent styling
- [ ] All cards have consistent shadows and borders
- [ ] All spacing follows the 4px grid
- [ ] All colors use the defined palette
- [ ] All focus states are visible
- [ ] All hover states are clear

---

**Last Updated:** Dec 4, 2025
**Version:** 1.0.0
