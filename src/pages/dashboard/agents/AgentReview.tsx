import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAgent, useUpdateAgent } from '@/hooks/useAgents';
import { usePersona } from '@/hooks/usePersonas';
import { useKnowledgeSource, useKnowledgeChunks } from '@/hooks/useKnowledgeSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Edit,
  MessageSquare,
  Rocket,
  AlertTriangle,
  User,
  BookOpen,
  Radio,
  ArrowLeft,
} from 'lucide-react';

const channelLabels: Record<string, string> = {
  webChat: 'Web Chat',
  phone: 'Phone',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const AgentReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: agent, isLoading: agentLoading } = useAgent(id);
  const { data: persona, isLoading: personaLoading } = usePersona(agent?.persona_id ?? undefined);
  const knowledgeSourceId = agent?.knowledge_source_ids?.[0];
  const { data: knowledgeSource, isLoading: knowledgeLoading } = useKnowledgeSource(knowledgeSourceId);
  const { data: chunks } = useKnowledgeChunks(knowledgeSourceId);
  
  const updateAgent = useUpdateAgent();

  const isLoading = agentLoading || personaLoading || knowledgeLoading;

  const handlePublish = async () => {
    if (!agent) return;
    
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        status: 'live',
      });
      
      toast({
        title: 'Agent Published',
        description: `${agent.name} is now live and ready to use.`,
      });
      
      navigate('/dashboard/agents');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to publish agent.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Agent not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/agents')}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const enabledChannels = agent.channels 
    ? Object.entries(agent.channels).filter(([_, enabled]) => enabled).map(([key]) => key)
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/agents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            <Badge variant={agent.status === 'live' ? 'default' : 'secondary'}>
              {agent.status === 'live' ? 'Live' : 'Draft'}
            </Badge>
          </div>
          <p className="text-muted-foreground">Review your agent configuration before publishing</p>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          We recommend testing your agent in the console before publishing to ensure it behaves as expected.
        </AlertDescription>
      </Alert>

      {/* Persona Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Persona</CardTitle>
            {persona && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
          {persona && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/personas/${persona.id}/edit`}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {persona ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{persona.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>{' '}
                  <span className="font-medium">{persona.role_title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tone:</span>{' '}
                  <Badge variant="outline" className="capitalize">{persona.tone}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Fallback:</span>{' '}
                  <Badge variant="outline" className="capitalize">{persona.fallback_policy}</Badge>
                </div>
              </div>
              {persona.style_notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Style Notes:</span>
                  <p className="mt-1 text-foreground">{persona.style_notes}</p>
                </div>
              )}
              {persona.do_not_do && persona.do_not_do.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Guardrails ({persona.do_not_do.length}):</span>
                  <ul className="mt-1 list-disc list-inside text-foreground">
                    {persona.do_not_do.slice(0, 2).map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                    {persona.do_not_do.length > 2 && (
                      <li className="text-muted-foreground">+{persona.do_not_do.length - 2} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No persona linked</p>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Base Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Knowledge Base</CardTitle>
            {knowledgeSource && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
          {knowledgeSource && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/knowledge/${knowledgeSource.id}`}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {knowledgeSource ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{knowledgeSource.name}</span>
                <Badge variant="outline">{chunks?.length || 0} chunks</Badge>
              </div>
              {chunks && chunks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Preview:</span>
                  {chunks.slice(0, 2).map((chunk, i) => (
                    <div key={chunk.id} className="text-sm p-2 bg-muted/50 rounded-md">
                      <span className="text-muted-foreground">#{i + 1}:</span>{' '}
                      {chunk.content.slice(0, 150)}
                      {chunk.content.length > 150 && '...'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No knowledge base linked</p>
          )}
        </CardContent>
      </Card>

      {/* Channels Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Channels</CardTitle>
            {enabledChannels.length > 0 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/channels">
              <Edit className="h-3 w-3 mr-1" />
              Configure
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {enabledChannels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {enabledChannels.map((channel) => (
                <Badge key={channel} variant="default">
                  {channelLabels[channel] || channel}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No channels enabled</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button variant="outline" asChild>
          <Link to={`/dashboard/test-chat?agent=${agent.id}`}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Test in Console
          </Link>
        </Button>
        <Button 
          onClick={handlePublish} 
          disabled={updateAgent.isPending || agent.status === 'live'}
        >
          <Rocket className="h-4 w-4 mr-2" />
          {updateAgent.isPending ? 'Publishing...' : agent.status === 'live' ? 'Already Live' : 'Publish Agent'}
        </Button>
      </div>
    </div>
  );
};

export default AgentReview;
