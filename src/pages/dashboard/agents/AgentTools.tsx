import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent } from '@/hooks/useAgents';
import {
  useAgentTools,
  useCreateAgentTool,
  useUpdateAgentTool,
  useDeleteAgentTool,
  useToggleAgentTool,
  AgentTool,
  TOOL_TYPE_INFO,
} from '@/hooks/useAgentTools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Wrench,
  Pencil,
  Trash2,
  ArrowLeft,
  Settings2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const AgentTools: React.FC = () => {
  const { id: agentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { data: agent, isLoading: agentLoading } = useAgent(agentId!);
  const { data: tools, isLoading: toolsLoading } = useAgentTools(agentId);

  const createTool = useCreateAgentTool();
  const updateTool = useUpdateAgentTool();
  const deleteTool = useDeleteAgentTool();
  const toggleTool = useToggleAgentTool();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<AgentTool | null>(null);
  const [deleteConfirmTool, setDeleteConfirmTool] = useState<AgentTool | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tool_type: 'webhook' as AgentTool['tool_type'],
    config: {} as Record<string, string>,
  });

  const isLoading = agentLoading || toolsLoading;
  const canEdit = hasPermission('write');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tool_type: 'webhook',
      config: {},
    });
  };

  const handleCreate = async () => {
    if (!agentId) return;

    try {
      await createTool.mutateAsync({
        agent_id: agentId,
        name: formData.name,
        description: formData.description,
        tool_type: formData.tool_type,
        parameters: { type: 'object', properties: {}, required: [] },
        config: formData.config,
        is_enabled: true,
        rate_limit: 0,
        timeout_seconds: 30,
      });
      toast.success('Tool created successfully');
      setShowCreateDialog(false);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create tool';
      toast.error(message);
    }
  };

  const handleUpdate = async () => {
    if (!editingTool) return;

    try {
      await updateTool.mutateAsync({
        id: editingTool.id,
        name: formData.name,
        description: formData.description,
        tool_type: formData.tool_type,
        config: formData.config,
      });
      toast.success('Tool updated successfully');
      setEditingTool(null);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update tool';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmTool || !agentId) return;

    try {
      await deleteTool.mutateAsync({ id: deleteConfirmTool.id, agentId });
      toast.success('Tool deleted successfully');
      setDeleteConfirmTool(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete tool';
      toast.error(message);
    }
  };

  const handleToggle = async (tool: AgentTool) => {
    try {
      await toggleTool.mutateAsync({ id: tool.id, is_enabled: !tool.is_enabled });
      toast.success(`Tool ${tool.is_enabled ? 'disabled' : 'enabled'}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle tool';
      toast.error(message);
    }
  };

  const openEditDialog = (tool: AgentTool) => {
    setFormData({
      name: tool.name,
      description: tool.description,
      tool_type: tool.tool_type,
      config: tool.config as Record<string, string>,
    });
    setEditingTool(tool);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/agents/${agentId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Tools - ${agent.name}`}
          description="Configure function calling tools for this agent"
          action={
            canEdit && (
              <Button variant="glow" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            )
          }
        />
      </div>

      {/* Tools List */}
      {!tools || tools.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Wrench}
              title="No tools configured"
              description="Add tools to enable your agent to perform actions like calling webhooks, booking appointments, or sending emails."
              action={canEdit ? {
                label: 'Add Tool',
                onClick: () => setShowCreateDialog(true),
                icon: Plus,
              } : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tools.map((tool) => (
            <Card key={tool.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-muted text-2xl">
                      {TOOL_TYPE_INFO[tool.tool_type]?.icon || '⚙️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{tool.name}</h3>
                        <StatusBadge variant={tool.is_enabled ? 'success' : 'secondary'}>
                          {tool.is_enabled ? 'Enabled' : 'Disabled'}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Settings2 className="w-3 h-3" />
                          {TOOL_TYPE_INFO[tool.tool_type]?.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {tool.timeout_seconds}s timeout
                        </span>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tool.is_enabled}
                        onCheckedChange={() => handleToggle(tool)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(tool)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteConfirmTool(tool)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingTool} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingTool(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTool ? 'Edit Tool' : 'Create New Tool'}</DialogTitle>
            <DialogDescription>
              Configure a tool that your agent can use during conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tool Name</Label>
              <Input
                id="name"
                placeholder="e.g., book_appointment"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Use snake_case (no spaces or special characters)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this tool does..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The AI will use this description to decide when to call the tool
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool_type">Tool Type</Label>
              <Select
                value={formData.tool_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tool_type: value as AgentTool['tool_type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TOOL_TYPE_INFO).map(([type, info]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.tool_type === 'webhook' && (
              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  type="url"
                  placeholder="https://api.example.com/webhook"
                  value={formData.config.url || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, url: e.target.value }
                  }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingTool(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={editingTool ? handleUpdate : handleCreate}
              disabled={!formData.name || !formData.description || createTool.isPending || updateTool.isPending}
            >
              {createTool.isPending || updateTool.isPending ? 'Saving...' : editingTool ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmTool}
        onOpenChange={(open) => !open && setDeleteConfirmTool(null)}
        title="Delete Tool"
        description={`Are you sure you want to delete "${deleteConfirmTool?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteTool.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AgentTools;
