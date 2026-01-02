import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonas, useDeletePersona, PersonaRow } from '@/hooks/usePersonas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PersonasList: React.FC = () => {
  const { workspace, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: personas = [], isLoading } = usePersonas();
  const deletePersona = useDeletePersona();

  if (!workspace) return null;

  const filtered = personas.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role_title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (persona: PersonaRow) => {
    if (!hasPermission('write')) return;
    deletePersona.mutate(persona.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

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
            {hasPermission('write') && !search && (
              <Button variant="outline" onClick={() => navigate('/dashboard/personas/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Persona
              </Button>
            )}
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
                <p className="text-sm text-muted-foreground mb-3">{p.role_title}</p>
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
