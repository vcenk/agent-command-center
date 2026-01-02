import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeSources, auditLogs, usage } from '@/lib/mockDb';
import { KnowledgeSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Link as LinkIcon, Type, X, Upload, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const KnowledgeForm: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, user } = useAuth();

  const [type, setType] = useState<'PDF' | 'URL' | 'TEXT'>('TEXT');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!workspace) return null;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
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

    const newSource = knowledgeSources.create({
      workspaceId: workspace.id,
      name: name.trim(),
      type,
      url: type === 'URL' ? url : undefined,
      fileName: type === 'PDF' ? fileName : undefined,
      rawText: rawText.trim(),
      tags,
    });

    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'create',
      entityType: 'knowledge',
      entityId: newSource.id,
      before: null,
      after: newSource as unknown as Record<string, unknown>,
    });

    usage.increment(workspace.id, 'knowledgeUploads');

    toast.success('Knowledge source created');
    navigate('/dashboard/knowledge');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/knowledge')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Knowledge</h1>
          <p className="text-muted-foreground">
            Add a new knowledge source for your AI agents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type Selection */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Source Type</CardTitle>
              <CardDescription>Select the type of knowledge source</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="TEXT" className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="PDF" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF
                  </TabsTrigger>
                  <TabsTrigger value="URL" className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="TEXT" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Company FAQ"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="PDF" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Product Manual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PDF File (metadata only)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        {fileName ? (
                          <p className="text-sm text-foreground">{fileName}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Click to select a PDF file
                          </p>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Paste the extracted text content below
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="URL" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Support Documentation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Source URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/docs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Note: Paste the scraped text content below
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                {type === 'PDF' 
                  ? 'Paste the extracted text from your PDF'
                  : type === 'URL'
                  ? 'Paste the scraped content from the URL'
                  : 'Enter the text content'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste or type content here..."
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {rawText.length.toLocaleString()} characters
              </p>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Add tags for organization and filtering</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Knowledge'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/knowledge')} 
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Content will be chunked for retrieval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Type:</span>{' '}
                <span className="text-foreground">{type}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="text-foreground">{name || '—'}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Characters:</span>{' '}
                <span className="text-foreground">{rawText.length.toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Est. Chunks:</span>{' '}
                <span className="text-foreground">
                  {rawText.length > 0 ? Math.ceil(rawText.length / 1000) : 0}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Tags:</span>{' '}
                <span className="text-foreground">{tags.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeForm;
