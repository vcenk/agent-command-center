# Components

## Overview

AgentCenter uses a component-based architecture with React and shadcn/ui. Components are organized into layout, shared, and UI categories.

## Component Categories

```
src/components/
├── layout/      # Page layout components
├── shared/      # Reusable business components
├── ui/          # shadcn/ui primitives
└── RouteGuard.tsx
```

---

## Layout Components

### DashboardLayout

**File:** `src/components/layout/DashboardLayout.tsx`

Main dashboard wrapper with sidebar and top bar.

```tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Used in App.tsx routing
<Route element={<DashboardLayout />}>
  <Route path="overview" element={<Overview />} />
</Route>
```

**Structure:**
- Sidebar (left navigation)
- TopBar (header)
- Main content area (Outlet)

### Sidebar

**File:** `src/components/layout/Sidebar.tsx`

Navigation sidebar with workspace switcher.

**Features:**
- Workspace selector dropdown
- Navigation menu groups
- Collapsible on mobile
- Active route highlighting

**Menu Sections:**
- Dashboard (Overview, Analytics)
- Agents (List, Templates)
- Resources (Personas, Knowledge)
- Conversations (Sessions, Leads, Calls)
- Settings (Channels, Billing, Settings)

### TopBar

**File:** `src/components/layout/TopBar.tsx`

Top header bar.

**Features:**
- Breadcrumbs
- Search (optional)
- User menu dropdown
- Notifications

### NavLink

**File:** `src/components/layout/NavLink.tsx`

Styled navigation link component.

```tsx
import { NavLink } from '@/components/layout/NavLink';

<NavLink to="/dashboard/agents" icon={Bot}>
  Agents
</NavLink>
```

---

## Shared Components

### Breadcrumbs

**File:** `src/components/shared/Breadcrumbs.tsx`

Navigation breadcrumbs based on current route.

```tsx
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

<Breadcrumbs items={[
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agents', href: '/dashboard/agents' },
  { label: 'Edit Agent' }
]} />
```

### PageHeader

**File:** `src/components/shared/PageHeader.tsx`

Page title with optional description and actions.

```tsx
import { PageHeader } from '@/components/shared/PageHeader';

<PageHeader
  title="Agents"
  description="Manage your AI agents"
  actions={
    <Button onClick={handleCreate}>Create Agent</Button>
  }
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| title | string | Page title |
| description | string | Optional description |
| actions | ReactNode | Action buttons |

### ConfirmDialog

**File:** `src/components/shared/ConfirmDialog.tsx`

Confirmation modal for destructive actions.

```tsx
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

<ConfirmDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Delete Agent"
  description="Are you sure? This action cannot be undone."
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| open | boolean | Dialog visibility |
| onOpenChange | function | Visibility handler |
| title | string | Dialog title |
| description | string | Confirmation message |
| confirmText | string | Confirm button text |
| variant | string | Button variant |
| onConfirm | function | Confirm handler |

---

## Route Guard

**File:** `src/components/RouteGuard.tsx`

Protects routes requiring authentication.

```tsx
import { RouteGuard } from '@/components/RouteGuard';

<Route element={<RouteGuard requireAuth requireWorkspace />}>
  <Route path="dashboard/*" element={<Dashboard />} />
</Route>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| requireAuth | boolean | Require authentication |
| requireWorkspace | boolean | Require workspace selection |
| minRole | AppRole | Minimum required role |

---

## UI Components (shadcn/ui)

### Form Components

| Component | File | Description |
|-----------|------|-------------|
| Button | `ui/button.tsx` | Buttons with variants |
| Input | `ui/input.tsx` | Text input |
| Textarea | `ui/textarea.tsx` | Multi-line input |
| Select | `ui/select.tsx` | Dropdown select |
| Checkbox | `ui/checkbox.tsx` | Checkbox input |
| RadioGroup | `ui/radio-group.tsx` | Radio buttons |
| Switch | `ui/switch.tsx` | Toggle switch |
| Slider | `ui/slider.tsx` | Range slider |
| Form | `ui/form.tsx` | Form with validation |

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| Card | `ui/card.tsx` | Content card |
| Separator | `ui/separator.tsx` | Visual divider |
| Accordion | `ui/accordion.tsx` | Collapsible sections |
| Tabs | `ui/tabs.tsx` | Tab navigation |
| ScrollArea | `ui/scroll-area.tsx` | Scrollable container |
| Resizable | `ui/resizable.tsx` | Resizable panels |

### Modal Components

| Component | File | Description |
|-----------|------|-------------|
| Dialog | `ui/dialog.tsx` | Modal dialog |
| AlertDialog | `ui/alert-dialog.tsx` | Alert modal |
| Drawer | `ui/drawer.tsx` | Slide-out drawer |
| Popover | `ui/popover.tsx` | Popover tooltip |
| HoverCard | `ui/hover-card.tsx` | Hover tooltip |
| Sheet | `ui/sheet.tsx` | Side sheet |

### Navigation Components

| Component | File | Description |
|-----------|------|-------------|
| DropdownMenu | `ui/dropdown-menu.tsx` | Dropdown menu |
| ContextMenu | `ui/context-menu.tsx` | Right-click menu |
| NavigationMenu | `ui/navigation-menu.tsx` | Nav menu |
| Menubar | `ui/menubar.tsx` | Menu bar |
| Breadcrumb | `ui/breadcrumb.tsx` | Breadcrumb nav |
| Pagination | `ui/pagination.tsx` | Page navigation |
| Command | `ui/command.tsx` | Command palette |

### Data Display

| Component | File | Description |
|-----------|------|-------------|
| Table | `ui/table.tsx` | Data table |
| Badge | `ui/badge.tsx` | Status badge |
| Avatar | `ui/avatar.tsx` | User avatar |
| Progress | `ui/progress.tsx` | Progress bar |
| Chart | `ui/chart.tsx` | Charts (Recharts) |
| Skeleton | `ui/skeleton.tsx` | Loading skeleton |
| Calendar | `ui/calendar.tsx` | Date calendar |

### Feedback Components

| Component | File | Description |
|-----------|------|-------------|
| Toast | `ui/toast.tsx` | Toast notification |
| Sonner | `ui/sonner.tsx` | Sonner toasts |
| Tooltip | `ui/tooltip.tsx` | Tooltip |
| Alert | `ui/alert.tsx` | Alert message |

### Utility Components

| Component | File | Description |
|-----------|------|-------------|
| AspectRatio | `ui/aspect-ratio.tsx` | Aspect ratio |
| Collapsible | `ui/collapsible.tsx` | Collapsible |
| Label | `ui/label.tsx` | Form label |
| InputOTP | `ui/input-otp.tsx` | OTP input |
| Carousel | `ui/carousel.tsx` | Image carousel |

---

## Usage Examples

### Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Data Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function AgentTable({ agents }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell>{agent.name}</TableCell>
            <TableCell>
              <Badge variant={agent.status === 'live' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Dialog Modal

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function DeleteDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Agent</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Styling

Components use Tailwind CSS with CSS variables for theming:

```css
/* src/index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

---

## See Also

- [HOOKS.md](./HOOKS.md) - Hooks used by components
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Component architecture
