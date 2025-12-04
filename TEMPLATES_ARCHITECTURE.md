# Receipt Template System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    xReceipt Application                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   App.tsx        │
                    │  (Main Router)   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  TemplateList    │
                    │  (Main Page)     │
                    └──────────────────┘
                         │         │
              ┌──────────┘         └──────────┐
              ▼                                ▼
    ┌──────────────────────┐      ┌──────────────────────┐
    │ ReceiptTemplateBuilder│     │ Template Management  │
    │  (NEW COMPONENT)     │     │  (Existing)          │
    └──────────────────────┘     └──────────────────────┘
              │                           │
              ├─ Template Presets         ├─ Create
              │  ├─ Minimal              │  ├─ Edit
              │  ├─ Professional         │  └─ Delete
              │  ├─ Modern               │
              │  └─ Compact              │
              │                          │
              ├─ Preview Modal           │
              │                          │
              └─ Creation Form           │
                                         │
                    ┌────────────────────┘
                    ▼
        ┌──────────────────────────┐
        │  templateService         │
        │  (Service Layer)         │
        └──────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │  Supabase Database       │
        │  receipt_templates table │
        └──────────────────────────┘
```

---

## Component Hierarchy

```
TemplateList
├── Header
│   ├── Title & Description
│   └── Action Buttons
│       ├── Template Builder Button (NEW)
│       └── Add Template Button
│
├── ReceiptTemplateBuilder (NEW)
│   ├── Header
│   ├── Template Grid
│   │   └── Template Cards (4 presets)
│   │       ├── Preview Button
│   │       └── Use Template Button
│   │
│   ├── Preview Modal
│   │   ├── iframe (HTML Preview)
│   │   ├── Copy HTML Button
│   │   └── Use Template Button
│   │
│   └── Creation Form Modal
│       ├── Template Name Input
│       ├── Description Input
│       ├── Variables Info Box
│       └── Create Button
│
└── Template Management (existing)
    ├── Search Bar
    ├── Template Cards
    │   ├── Edit Button
    │   └── Delete Button
    └── Form Modal (for editing)
```

---

## Data Flow Diagram

### Creating a Template from Preset

```
┌─────────────────────────────────────────────────────────────┐
│ User navigates to Templates page                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Template Builder" button                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ReceiptTemplateBuilder component renders                     │
│ Shows 4 template preset cards                               │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ User clicks      │  │ User clicks      │
        │ "Preview"       │  │ "Use Template"   │
        └──────────────────┘  └──────────────────┘
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Preview Modal    │  │ Creation Form    │
        │ shows iframe     │  │ Modal opens      │
        └──────────────────┘  └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │ User enters:     │
                    │         │ - Template name  │
                    │         │ - Description    │
                    │         └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │ User clicks      │
                    │         │ "Create Template"│
                    │         └──────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ templateService      │
                    │ .createTemplate()    │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Supabase Insert      │
                    │ receipt_templates    │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Template Saved       │
                    │ Success Message      │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Return to Template   │
                    │ List view            │
                    └──────────────────────┘
```

---

## State Management

### TemplateList Component State

```typescript
// Template management
const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null)

// UI states
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [searchTerm, setSearchTerm] = useState('')
const [showForm, setShowForm] = useState(false)
const [showBuilder, setShowBuilder] = useState(false)  // NEW

// Form data
const [formData, setFormData] = useState({
  name: '',
  description: '',
  template_html: '',
})
```

### ReceiptTemplateBuilder Component State

```typescript
// Template selection
const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null)

// UI states
const [showPreview, setShowPreview] = useState(false)
const [showForm, setShowForm] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Form data
const [customName, setCustomName] = useState('')
const [customDescription, setCustomDescription] = useState('')
```

---

## Template Variable Substitution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Receipt Creation with Template                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ User selects template from dropdown                          │
│ Template HTML loaded from database                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ User fills receipt data:                                     │
│ - Customer name                                              │
│ - Customer email                                             │
│ - Items list                                                 │
│ - Total amount                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Template variables replaced with actual data:                │
│ {{CUSTOMER_NAME}} → "John Doe"                              │
│ {{CUSTOMER_EMAIL}} → "john@example.com"                     │
│ {{ITEMS}} → "<item>...</item>"                              │
│ {{TOTAL}} → "$100.00"                                       │
│ {{DATE}} → "Dec 4, 2024"                                    │
│ {{RECEIPT_ID}} → "REC-2024-001"                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Final HTML rendered with actual data                         │
│ Ready for preview, print, or send                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### receipt_templates table

```sql
CREATE TABLE receipt_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_html TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Template Record Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Professional Invoice",
  "description": "Business-grade invoice template",
  "template_html": "<!DOCTYPE html>...",
  "created_by": "user-id-123",
  "created_at": "2024-12-04T20:00:00Z",
  "updated_at": "2024-12-04T20:00:00Z"
}
```

---

## Service Layer

### templateService Methods

```typescript
// Get all templates
getAllTemplates(): Promise<ReceiptTemplate[]>

// Get single template
getTemplateById(id: string): Promise<ReceiptTemplate | null>

// Create new template
createTemplate(template: TemplateData): Promise<ReceiptTemplate>

// Update existing template
updateTemplate(id: string, updates: Partial<ReceiptTemplate>): Promise<ReceiptTemplate>

// Delete template
deleteTemplate(id: string): Promise<void>
```

---

## User Interaction Flows

### Flow 1: Quick Template Creation

```
User → Templates Page → Template Builder → Select Preset → 
Preview → Enter Name → Create → Success → Back to List
```

### Flow 2: Custom Template Creation

```
User → Templates Page → Add Template → Enter HTML → 
Create → Success → Back to List
```

### Flow 3: Template Editing

```
User → Templates Page → Click Edit → Modify HTML → 
Update → Success → Back to List
```

### Flow 4: Using Template in Receipt

```
User → Receipts Page → Create Receipt → Select Template → 
Fill Data → Preview → Send/Print
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User action triggered                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Try-Catch Block  │
                    └──────────────────┘
                         │         │
              ┌──────────┘         └──────────┐
              ▼                                ▼
        ┌──────────────┐          ┌──────────────────┐
        │ Success      │          │ Error Caught     │
        │ - Update UI  │          │ - Set error msg  │
        │ - Show data  │          │ - Display alert  │
        │ - Clear form │          │ - Log to console │
        └──────────────┘          └──────────────────┘
```

---

## Performance Considerations

### Optimization Strategies

1. **Component Memoization**
   - Template cards are stateless
   - Preview modal uses iframe for isolation

2. **Data Fetching**
   - Templates loaded once on mount
   - Cached in component state
   - Refresh on create/update/delete

3. **Rendering**
   - Conditional rendering for modals
   - Grid layout for templates
   - Lazy loading of previews

4. **HTML Preview**
   - iframe prevents style conflicts
   - Isolated from main document
   - Safe HTML rendering

---

## Security Considerations

### Input Validation
- Template name required
- HTML content validated
- XSS protection via iframe

### Database Security
- Supabase RLS policies
- User authentication required
- Data isolation per user

### HTML Handling
- HTML stored as-is in database
- Rendered in isolated iframe
- No script execution in preview

---

## Integration Points

### With Existing System

```
ReceiptTemplateBuilder
        ↓
templateService (existing)
        ↓
Supabase (existing)
        ↓
ReceiptList (existing)
        ↓
Receipt Creation (existing)
```

### With Future Features

- Template categories
- Template sharing
- Template versioning
- Template analytics
- Template marketplace

---

## Summary

The receipt template system is built with:
- ✅ Clean component architecture
- ✅ Clear data flow
- ✅ Proper error handling
- ✅ Secure HTML handling
- ✅ Scalable design
- ✅ Integration with existing system

This architecture allows for easy maintenance, testing, and future enhancements.
