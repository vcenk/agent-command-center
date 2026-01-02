import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Search,
  ChevronDown,
  LogOut,
  User,
  Building2,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
}

export const TopBar: React.FC = () => {
  const { user, workspace, logout, switchWorkspace, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);

  // Fetch workspaces user has access to
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('workspaces')
        .select('id, name');

      if (data) {
        setAllWorkspaces(data);
      }
    };

    fetchWorkspaces();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Workspace Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{workspace?.name || 'Select Workspace'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allWorkspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className={ws.id === workspace?.id ? 'bg-secondary' : ''}
            >
              <Building2 className="w-4 h-4 mr-2" />
              {ws.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-8">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents, personas, calls..."
                className="pl-10 bg-secondary/50 border-transparent focus:border-border"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(e.target.value.length > 1);
                }}
                onFocus={() => searchQuery.length > 1 && setSearchOpen(true)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="center">
            <Command>
              <CommandList>
                <CommandEmpty>No results found. Search will be available after data migration.</CommandEmpty>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm">{user?.email}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user?.email}</span>
              <span className="text-xs font-normal text-muted-foreground capitalize">
                {userRole?.toLowerCase() || 'User'}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};