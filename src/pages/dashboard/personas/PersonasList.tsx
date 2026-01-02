import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { personas, auditLogs } from '@/lib/mockDb';
import { Persona } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const PersonasList: React.FC = () => {
  const { workspace, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [, forceUpdate] = useState(0);

  if (!workspace) return null;

  const workspacePersonas = personas.getByWorkspace(workspace.id);
  const filtered = workspacePersonas.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.roleTitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (persona: Persona) => {
    if (!hasPermission('write')) return;
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'delete',
      entityType: 'persona',
      entityId: persona.id,
      before: { id: persona.id, name: persona.name },
      after: null,
    });
    personas.delete(persona.id);
    toast({ title: 'Persona deleted' });
    forceUpdate(n => n + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personas</h1>
          <p className="text-muted-foreground">Define AI personalities and behaviors</p>
        </div>
        {hasPermission('write') && (
          <Button variant="glow" onClick={() => navigate('/dashboard/personas/new')}>
            <Plus className="w-4 h-4" />Create Persona
          </Button>
        )}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search personas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No personas found</h3>
            <p className="text-muted-foreground mb-6">{search ? 'Try adjusting your search' : 'Create your first persona'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="glass border-border/50 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/personas/${p.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-secondary"><Users className="w-6 h-6 text-primary" /></div>
                  {hasPermission('write') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/personas/${p.id}`); }}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p); }}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{p.roleTitle}</p>
                <Badge variant="outline" className="capitalize">{p.tone}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonasList;
