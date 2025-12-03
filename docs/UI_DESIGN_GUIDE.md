# xReceipt UI Design Guide

## Design System

### Colors
- **Primary**: Blue (#3B82F6, #2563EB)
- **Secondary**: Gray (#6B7280, #9CA3AF)
- **Success**: Green (#10B981)
- **Error**: Red (#EF4444)
- **Background**: Light Gray (#F9FAFB, #F3F4F6)

### Typography
- **Headings**: Bold, Dark Gray (#111827)
- **Body**: Regular, Medium Gray (#374151)
- **Small Text**: Light Gray (#6B7280)

### Spacing
- **Padding**: 4px, 8px, 12px, 16px, 24px, 32px
- **Gap**: 8px, 12px, 16px, 24px
- **Border Radius**: 8px (standard), 12px (large), 50% (circular)

---

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│  [Receipt Icon] xReceipt                                 │
│                 PWA Receipt Generator for Your Online Shop│
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Sticky header with shadow
- Receipt icon in gradient blue box
- Title and subtitle
- White background with bottom border

---

## Admin Management Page

### Header with Action Button
```
┌──────────────────────────────────────────────────────────┐
│  [Users Icon] Admin Management              [+ Add New]  │
│               Manage admins and their permissions         │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Icon with blue background
- Title and description
- "Add New Admin" button (blue, with icon)
- Responsive layout

---

### Empty State
```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│                    [Users Icon]                          │
│                   No admins yet                          │
│            Create your first admin to get started        │
│                                                           │
│              [+ Create First Admin]                      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Centered layout
- Large icon in blue circle
- Helpful message
- Call-to-action button

---

### Admin Table
```
┌──────────────────────────────────────────────────────────┐
│ Admin          │ Email              │ Phone │ Created │ A │
├──────────────────────────────────────────────────────────┤
│ [Avatar] John  │ john@example.com   │ +1... │ Dec 3  │ ✎ │
│ [Avatar] Sarah │ sarah@example.com  │ +1... │ Dec 2  │ ✎ │
│ [Avatar] Mike  │ mike@example.com   │ +1... │ Dec 1  │ ✎ │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Gradient header (gray)
- Circular avatars with initials or images
- Hover effect (light blue background)
- Edit and Delete buttons
- Responsive table

---

## Error State

### Database Setup Required
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ Setup Required                                         │
│ Database not set up yet. Please create the required      │
│ tables in Supabase.                                       │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Red left border
- Alert icon
- Bold title
- Helpful message

---

## Loading State

```
        ⟳ (spinning)
    Loading admins...
```

**Features:**
- Centered spinner
- Loading text
- Full height container

---

## Admin Form Modal

### Create Admin Form
```
┌─────────────────────────────────────────────────────────┐
│ Create New Admin                                    [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Basic Information                                        │
│                                                          │
│ Name *                    │ Email *                      │
│ [________________]        │ [________________]           │
│                                                          │
│ Phone                     │ Profile Image                │
│ [________________]        │ [Choose File]                │
│                                                          │
│ Permissions                                              │
│                                                          │
│ ┌─ Product Access ─────────────────────────────────┐   │
│ │ ☐ View Product Page                              │   │
│ │   ☐ Create Product                               │   │
│ │   Assign Products: [Multi-select dropdown]       │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Category Access ─────────────────────────────────┐   │
│ │ ☐ View Category                                   │   │
│ │   ☐ Create Category                               │   │
│ │   ☐ Assign Category                               │   │
│ │   Assign Categories: [Multi-select dropdown]      │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Receipt Access ──────────────────────────────────┐   │
│ │ ☐ View Receipt                                    │   │
│ │ ☐ Create Receipt                                  │   │
│ │ ☐ Assign Template                                 │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ Receipt Template Access ─────────────────────────┐   │
│ │ ☐ View Receipt Templates                          │   │
│ │   ☐ Create Receipt Template                       │   │
│ │   ☐ Assign Template                               │   │
│ │   Assign Templates: [Multi-select dropdown]       │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ [Cancel]                                    [Save Admin] │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Modal overlay with dark background
- Close button (X)
- Sticky header
- Scrollable content
- Permission groups with borders
- Conditional checkboxes
- Multi-select dropdowns
- Form actions at bottom

---

## Component Styling Details

### Buttons
- **Primary**: Blue background, white text, hover darker blue
- **Secondary**: Gray border, gray text, hover gray background
- **Icon Buttons**: Transparent, hover colored background

### Inputs
- **Text/Email/Tel**: Gray border, focus blue ring
- **File Input**: Gray border, focus blue ring
- **Checkboxes**: Blue when checked
- **Select/Multi-select**: Gray border, focus blue ring

### Cards/Containers
- **White background**
- **Gray border**
- **Rounded corners (8-12px)**
- **Shadow on hover**

### Avatars
- **Circular (50%)**
- **Gradient blue background for initials**
- **Ring border (2px blue)**
- **Size: 40px (table), 64px (modal)**

---

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Full-width buttons
- Stacked form fields
- Horizontal scroll for tables

### Tablet (768px - 1024px)
- Two column layout where applicable
- Adjusted padding
- Readable table

### Desktop (> 1024px)
- Full layout
- Optimal spacing
- Multi-column forms

---

## Accessibility

- **Color Contrast**: WCAG AA compliant
- **Focus States**: Visible blue ring
- **Semantic HTML**: Proper heading hierarchy
- **Icons**: Accompanied by text labels
- **Forms**: Proper labels and error messages

---

## Animation & Transitions

- **Hover**: 200ms ease transition
- **Loading**: Smooth spin animation
- **Modal**: Fade in/out
- **Buttons**: Color transition on hover

---

## Current Implementation Status

✅ **Completed:**
- Header with icon and branding
- Admin list table with styling
- Empty state with call-to-action
- Error state for database issues
- Loading spinner
- Responsive design
- Tailwind CSS styling
- Lucide React icons

🚧 **In Progress:**
- Admin form modal (AdminForm component)
- Permission group components
- Form validation

⏳ **Pending:**
- Radix UI Dialog integration
- Toast notifications
- Advanced form validation
- Accessibility testing

---

## Design Inspiration

- **Modern**: Clean, minimal design
- **Professional**: Suitable for business use
- **Accessible**: Easy to use for all users
- **Responsive**: Works on all devices
- **Consistent**: Unified color scheme and spacing

