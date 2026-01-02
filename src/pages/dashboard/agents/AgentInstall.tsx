import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgent } from '@/hooks/useAgents';
import { useWidgetConfig, useCreateWidgetConfig, useUpdateWidgetConfig } from '@/hooks/useWidgetConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Copy, Check, Plus, X, Globe, Paintbrush, Code, HelpCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = 'https://ehvcrdooykxmcpcopuxz.supabase.co';
const WIDGET_URL = `${window.location.origin}/widget.js`;

const AgentInstall = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading: agentLoading } = useAgent(id);
  const { data: config, isLoading: configLoading } = useWidgetConfig(id);
  const createConfig = useCreateWidgetConfig();
  const updateConfig = useUpdateWidgetConfig();

  const [copied, setCopied] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [launcherLabel, setLauncherLabel] = useState('Chat with us');
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [enabled, setEnabled] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);

  // Initialize form state from config
  useEffect(() => {
    if (config) {
      setPosition(config.position as 'bottom-right' | 'bottom-left');
      setLauncherLabel(config.launcher_label);
      setPrimaryColor(config.primary_color);
      setEnabled(config.enabled);
      setDomains(config.allowed_domains || []);
    }
  }, [config]);

  // Create config if it doesn't exist
  useEffect(() => {
    if (!configLoading && !config && id) {
      createConfig.mutate(id);
    }
  }, [configLoading, config, id]);

  const embedSnippet = `<script src="${WIDGET_URL}" data-agent="${id}"></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const addDomain = (domain: string) => {
    const cleaned = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleaned) return;
    if (domains.includes(cleaned)) {
      toast.error('Domain already added');
      return;
    }
    const newDomains = [...domains, cleaned];
    setDomains(newDomains);
    setNewDomain('');
    
    if (config?.id) {
      updateConfig.mutate({ id: config.id, updates: { allowed_domains: newDomains } });
    }
  };

  const removeDomain = (domain: string) => {
    const newDomains = domains.filter(d => d !== domain);
    setDomains(newDomains);
    
    if (config?.id) {
      updateConfig.mutate({ id: config.id, updates: { allowed_domains: newDomains } });
    }
  };

  const addLocalhost = () => addDomain('localhost');
  const addCurrentDomain = () => addDomain(window.location.hostname);

  const saveAppearance = () => {
    if (config?.id) {
      updateConfig.mutate({
        id: config.id,
        updates: {
          position,
          launcher_label: launcherLabel.slice(0, 24),
          primary_color: primaryColor,
          enabled,
        },
      });
    }
  };

  if (agentLoading || configLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/agents')}>
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/agents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Install Web Chat</h1>
          <p className="text-muted-foreground">
            {agent.name}
            {agent.status === 'draft' && (
              <Badge variant="secondary" className="ml-2">Draft</Badge>
            )}
          </p>
        </div>
        {agent.status === 'draft' && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            Publish agent to enable widget
          </Badge>
        )}
      </div>

      {/* A) Install Snippet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Install Snippet
          </CardTitle>
          <CardDescription>
            Add this code before the closing &lt;/body&gt; tag on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {embedSnippet}
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={copySnippet}
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            The widget will automatically load and display a chat bubble on your page.
          </p>
        </CardContent>
      </Card>

      {/* B) Allowed Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Allowed Domains
          </CardTitle>
          <CardDescription>
            The widget will only work on these domains. Add localhost for testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDomain(newDomain)}
            />
            <Button onClick={() => addDomain(newDomain)} disabled={!newDomain.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addLocalhost}>
              Add localhost
            </Button>
            <Button variant="outline" size="sm" onClick={addCurrentDomain}>
              Add current domain
            </Button>
          </div>

          {domains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <Badge key={domain} variant="secondary" className="px-3 py-1 text-sm">
                  {domain}
                  <button
                    onClick={() => removeDomain(domain)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No domains added. Widget will work on any domain (not recommended for production).
            </p>
          )}
        </CardContent>
      </Card>

      {/* C) Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the chat widget looks on your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Widget Enabled</Label>
              <p className="text-sm text-muted-foreground">Show the chat widget on your site</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <div className="flex gap-2">
              <Button
                variant={position === 'bottom-right' ? 'default' : 'outline'}
                onClick={() => setPosition('bottom-right')}
              >
                Bottom Right
              </Button>
              <Button
                variant={position === 'bottom-left' ? 'default' : 'outline'}
                onClick={() => setPosition('bottom-left')}
              >
                Bottom Left
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Launcher Label</Label>
            <Input
              value={launcherLabel}
              onChange={(e) => setLauncherLabel(e.target.value)}
              maxLength={24}
              placeholder="Chat with us"
            />
            <p className="text-xs text-muted-foreground">{launcherLabel.length}/24 characters</p>
          </div>

          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#111827"
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={saveAppearance} disabled={updateConfig.isPending}>
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* D) Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            How to Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Add your domain to the allowlist</span> — Include "localhost" for local testing
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Paste the snippet</span> into your website's HTML, before the &lt;/body&gt; tag
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Open your website</span> and confirm the chat bubble appears
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Start a chat</span> and verify it logs under{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/dashboard/sessions')}>
                Sessions
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </li>
          </ol>

          {agent.status === 'draft' && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400">
                <strong>Note:</strong> The widget won't work until you publish this agent.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentInstall;
