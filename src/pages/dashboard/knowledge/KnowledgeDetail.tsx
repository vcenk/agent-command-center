import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeSources, auditLogs, retrieveChunks } from '@/lib/mockDb';
import { KnowledgeSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  Link as LinkIcon, 
  Type, 
  X, 
  Search,
  Trash2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

const KnowledgeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { workspace, user, hasPermission } = useAuth();

  const [source, setSource] = useState<KnowledgeSource | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);

  const canEdit = hasPermission('write');

  useEffect(() => {
    if (id) {
      const found = knowledgeSources.getById(id);
      if (found) {
        setSource(found);
        setName(found.name);
        setUrl(found.url || '');
        setRawText(found.rawText);
        setTags(found.tags);
      }
    }
  }, [id]);

  if (!workspace || !source) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Knowledge source not found</p>
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!rawText.trim()) {
      toast.error('Please enter content');
      return;
    }

    setIsSaving(true);

    const before = { ...source };
    const updated = knowledgeSources.update(source.id, {
      name: name.trim(),
      url: source.type === 'URL' ? url : undefined,
      rawText: rawText.trim(),
      tags,
    });

    if (updated) {
      auditLogs.create({
        workspaceId: workspace.id,
        actorEmail: user?.email || '',
        actionType: 'update',
        entityType: 'knowledge',
        entityId: source.id,
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      setSource(updated);
      toast.success('Knowledge source updated');
    }
    
    setIsSaving(false);
  };

  const handleDelete = () => {
    if (!hasPermission('write')) {
      toast.error('You do not have permission to delete');
      return;
    }

    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'delete',
      entityType: 'knowledge',
      entityId: source.id,
      before: source as unknown as Record<string, unknown>,
      after: null,
    });

    knowledgeSources.delete(source.id);
    toast.success('Knowledge source deleted');
    navigate('/dashboard/knowledge');
  };

  const handleTestRetrieval = () => {
    if (!testQuery.trim()) {
      toast.error('Please enter a query');
      return;
    }

    const results = retrieveChunks(testQuery, [source.id], 3);
    setTestResults(results);
    
    if (results.length === 0) {
      toast.info('No matching chunks found');
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/knowledge')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{source.name}</h1>
              <Badge variant="secondary" className="gap-1">
                {getTypeIcon(source.type)}
                {source.type}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {source.chunks.length} chunks · Created {new Date(source.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="chunks">Chunks ({source.chunks.length})</TabsTrigger>
          <TabsTrigger value="retrieval">Test Retrieval</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Basic Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  {source.type === 'URL' && (
                    <div className="space-y-2">
                      <Label htmlFor="url">Source URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                  {source.type === 'PDF' && source.fileName && (
                    <div className="space-y-2">
                      <Label>Original File</Label>
                      <p className="text-sm text-muted-foreground">{source.fileName}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>{rawText.length.toLocaleString()} characters</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    disabled={!canEdit}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              {canEdit && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canEdit && (
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add tag..."
                    />
                  )}
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {tag}
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-foreground">{source.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Characters</span>
                    <span className="text-foreground">{source.rawText.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chunks</span>
                    <span className="text-foreground">{source.chunks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-foreground">
                      {new Date(source.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-foreground">
                      {new Date(source.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Chunks Tab */}
        <TabsContent value="chunks" className="space-y-4">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Content Chunks</CardTitle>
              <CardDescription>
                Content is split into ~1000 character chunks for retrieval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {source.chunks.map((chunk, i) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Chunk {i + 1}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {chunk.content.length} chars
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-mono whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retrieval Tab */}
        <TabsContent value="retrieval" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Test Retrieval</CardTitle>
              <CardDescription>
                Test keyword-based retrieval to see which chunks match a query
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestRetrieval()}
                    placeholder="Enter a test query..."
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleTestRetrieval}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {testResults.length > 0 && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Retrieved Chunks</CardTitle>
                <CardDescription>
                  Top {testResults.length} matching chunks (keyword scoring)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.map((chunk, i) => (
                    <div
                      key={chunk.id}
                      className="p-4 rounded-lg bg-success/5 border border-success/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-success/10 text-success border-success/20">
                          Match #{i + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Chunk {chunk.index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-mono whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {testQuery && testResults.length === 0 && (
            <Card className="glass border-border/50">
              <CardContent className="py-8 text-center">
                <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No matching chunks found</p>
                <p className="text-sm text-muted-foreground">
                  Try different keywords from the content
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeDetail;
