import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Radio,
  LayoutTemplate,
  Inbox,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Helper to check if any item in a group is active
const isGroupActive = (items: NavItem[], pathname: string): boolean => {
  return items.some(item =>
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );
};

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Agents: true,
    Conversations: true,
    Configuration: true,
    Settings: true,
  });
  const location = useLocation();
  const { hasPermission } = useAuth();

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Filter items based on permissions
  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission)),
  })).filter(group => group.items.length > 0);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground text-gradient">
                Agent Cockpit
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-4 px-2">
          {filteredGroups.map((group) => {
            const groupActive = isGroupActive(group.items, location.pathname);
            const isOpen = openGroups[group.name];
            const isSingleItem = group.items.length === 1;

            // For single-item groups (like Overview), render directly without collapsible
            if (isSingleItem) {
              const item = group.items[0];
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              // When collapsed, wrap in tooltip
              if (collapsed) {
                return (
                  <div key={group.name}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center justify-center p-2 rounded-md transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className={cn(
                            'w-5 h-5',
                            isActive && 'text-primary'
                          )} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <div key={group.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive && 'text-primary'
                    )} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                    )}
                  </Link>
                </div>
              );
            }

            // For multi-item groups, use collapsible
            return (
              <Collapsible
                key={group.name}
                open={collapsed ? false : isOpen}
                onOpenChange={() => !collapsed && toggleGroup(group.name)}
              >
                {/* Group Header */}
                {!collapsed && (
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    <span className={cn(groupActive && 'text-primary')}>{group.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                )}

                <CollapsibleContent className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200',
                          !collapsed && 'ml-2',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isActive && 'text-primary'
                        )} />
                        {!collapsed && (
                          <span className="text-sm">{item.name}</span>
                        )}
                        {isActive && !collapsed && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>

                {/* Show icons only when collapsed - with tooltips */}
                {collapsed && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href ||
                        (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                      return (
                        <Tooltip key={item.name} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.href}
                              className={cn(
                                'flex items-center justify-center p-2 rounded-md transition-all duration-200',
                                isActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                              )}
                            >
                              <item.icon className={cn(
                                'w-5 h-5',
                                isActive && 'text-primary'
                              )} />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.name}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </Collapsible>
            );
          })}
        </div>
      </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full h-9"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
};
