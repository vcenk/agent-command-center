import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeSources, auditLogs } from '@/lib/mockDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  FileText, 
  Link as LinkIcon, 
  Type, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

const KnowledgeList: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, user, hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  if (!workspace) return null;

  const allKnowledge = knowledgeSources.getByWorkspace(workspace.id);
  
  const filteredKnowledge = allKnowledge.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase()) ||
                          k.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || k.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const canEdit = hasPermission('write');

  const handleDelete = (id: string, name: string) => {
    if (!hasPermission('write')) {
      toast.error('You do not have permission to delete knowledge sources');
      return;
    }

    const source = knowledgeSources.getById(id);
    knowledgeSources.delete(id);
    
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'delete',
      entityType: 'knowledge',
      entityId: id,
      before: source as unknown as Record<string, unknown>,
      after: null,
    });

    toast.success(`Deleted "${name}"`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-4 h-4" />;
      case 'URL':
        return <LinkIcon className="w-4 h-4" />;
      case 'TEXT':
        return <Type className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PDF':
        return 'bg-destructive/10 text-destructive';
      case 'URL':
        return 'bg-primary/10 text-primary';
      case 'TEXT':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage knowledge sources for your AI agents
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => navigate('/dashboard/knowledge/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Knowledge
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="URL">URL</SelectItem>
            <SelectItem value="TEXT">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filteredKnowledge.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No knowledge sources</h3>
            <p className="text-muted-foreground text-center mb-6">
              {search || typeFilter !== 'all' 
                ? 'No sources match your filters. Try adjusting your search.'
                : 'Add your first knowledge source to power your AI agents.'}
            </p>
            {canEdit && !search && typeFilter === 'all' && (
              <Button onClick={() => navigate('/dashboard/knowledge/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Knowledge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredKnowledge.map((source) => (
            <Card 
              key={source.id} 
              className="glass border-border/50 hover:border-border transition-all cursor-pointer"
              onClick={() => navigate(`/dashboard/knowledge/${source.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${getTypeColor(source.type)}`}>
                      {getTypeIcon(source.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate">{source.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {source.chunks.length} chunks · {source.rawText.length.toLocaleString()} chars
                      </p>
                      {source.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {source.tags.slice(0, 5).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {source.tags.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{source.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(source.type)}>{source.type}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/knowledge/${source.id}`);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(source.id, source.name);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeList;
