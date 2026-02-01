import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Bot,
  Users,
  BookOpen,
  Plug,
  Phone,
  Settings,
  FileText,
  CreditCard,
  ChevronRight,
  MessageSquare,
  Radio,
  LayoutTemplate,
  Inbox,
  UserCheck,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: 'read' | 'write' | 'admin' | 'billing';
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    name: 'Agents',
    items: [
      { name: 'Templates', href: '/dashboard/templates', icon: LayoutTemplate },
      { name: 'My Agents', href: '/dashboard/agents', icon: Bot },
      { name: 'Personas', href: '/dashboard/personas', icon: Users },
      { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
    ],
  },
  {
    name: 'Conversations',
    items: [
      { name: 'Sessions', href: '/dashboard/sessions', icon: Inbox },
      { name: 'Leads', href: '/dashboard/leads', icon: UserCheck },
      { name: 'Calls', href: '/dashboard/calls', icon: Phone },
      { name: 'Test Chat', href: '/dashboard/test-chat', icon: MessageSquare },
    ],
  },
  {
    name: 'Configuration',
    items: [
      { name: 'Channels', href: '/dashboard/channels', icon: Radio },
      { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    ],
  },
  {
    name: 'Settings',
    items: [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: FileText },
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCard, permission: 'billing' },
    ],
  },
];

export const MobileNav: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const { hasPermission } = useAuth();

  // Filter items based on permissions
  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission)),
  })).filter(group => group.items.length > 0);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-gradient">Agent Cockpit</span>
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-6">
            {filteredGroups.map((group) => (
              <div key={group.name}>
                <h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.name}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {isActive && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileNav;
