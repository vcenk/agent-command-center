import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, useUpdateAgent } from '@/hooks/useAgents';
import { usePersona } from '@/hooks/usePersonas';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import {
  Bot,
  Rocket,
  MessageSquare,
  Phone,
  Mail,
  BookOpen,
  Zap,
  Send,
  Loader2,
  FileText,
  AlertTriangle,
  Code,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { name: string; content: string }[];
}

const AgentDetail: React.FC = () => {
  const { id } = useParams();
  const { workspace, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: agent, isLoading: agentLoading } = useAgent(id);
  const { data: persona } = usePersona(agent?.persona_id || undefined);
  const { data: allKnowledgeSources } = useKnowledgeSources();
  const updateAgent = useUpdateAgent();

  const knowledge = allKnowledgeSources?.filter(k => 
    agent?.knowledge_source_ids?.includes(k.id)
  ) || [];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (agentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10" />
          <Skeleton className="w-14 h-14 rounded-lg" />
          <div>
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  if (!agent || !workspace) {
    return (
      <div className="text-center py-16">
        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Agent not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/agents')}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const handlePublish = () => {
    if (!hasPermission('write')) return;
    
    updateAgent.mutate(
      { id: agent.id, status: 'live' },
      {
        onSuccess: () => {
          toast({
            title: 'Agent published!',
            description: `${agent.name} is now live and ready to handle interactions.`,
          });
        },
      }
    );
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI response with RAG
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    let responseContent = '';
    const sources: { name: string; content: string }[] = [];

    if (knowledge.length > 0) {
      // Simple keyword match for demo
      const matchingSource = knowledge.find(k => 
        k.raw_text?.toLowerCase().includes(chatInput.toLowerCase().split(' ')[0])
      );
      if (matchingSource) {
        responseContent = `Based on "${matchingSource.name}":\n\n${matchingSource.raw_text?.slice(0, 200)}...\n\nIs there anything specific you'd like to know more about?`;
        sources.push({ name: matchingSource.name, content: matchingSource.raw_text?.slice(0, 100) + '...' || '' });
      } else {
        responseContent = "I have access to some knowledge sources, but I couldn't find specific information about that. Could you rephrase your question?";
      }
    } else if (persona) {
      responseContent = persona.greeting_script || `Hello! I'm here to help. How can I assist you today?`;
    } else {
      responseContent = "I'm here to help! However, I don't have any specific knowledge sources configured yet. Please add some knowledge to my configuration for better responses.";
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: responseContent,
      sources: sources.length > 0 ? sources : undefined,
    };

    setChatMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Agents', href: '/dashboard/agents' },
          { label: agent.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${agent.status === 'live' ? 'bg-success/10' : 'bg-secondary'}`}>
            <Bot className={`w-8 h-8 ${agent.status === 'live' ? 'text-success' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <Badge
                variant={agent.status === 'live' ? 'default' : 'secondary'}
                className={agent.status === 'live' ? 'bg-success text-success-foreground' : ''}
              >
                {agent.status === 'live' ? 'Live' : 'Draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground capitalize">{agent.business_domain}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('write') && (
            <Button variant="outline" onClick={() => navigate(`/dashboard/agents/${id}/install`)}>
              <Code className="w-4 h-4 mr-2" />
              Install Web Chat
            </Button>
          )}
          {hasPermission('write') && agent.status === 'draft' && (
            <Button variant="glow" onClick={handlePublish} disabled={updateAgent.isPending}>
              {updateAgent.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Publish Agent
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Persona</p>
                  <p className="font-medium">{persona?.name || 'None assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Goals</p>
                  <p className="font-medium">{agent.goals || 'No goals defined'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(agent.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">0 min</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Enabled Channels</CardTitle>
              <CardDescription>Communication channels this agent can use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'webChat', name: 'Web Chat', icon: MessageSquare },
                  { key: 'phone', name: 'Phone', icon: Phone },
                  { key: 'sms', name: 'SMS', icon: Mail },
                  { key: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
                ].map(channel => {
                  const channels = agent.channels as { webChat?: boolean; phone?: boolean; sms?: boolean; whatsapp?: boolean };
                  const isEnabled = channels[channel.key as keyof typeof channels] ?? false;
                  return (
                    <div
                      key={channel.key}
                      className={`p-4 rounded-lg border ${
                        isEnabled
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-muted/20'
                      }`}
                    >
                      <channel.icon className={`w-6 h-6 mb-2 ${
                        isEnabled ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Knowledge Sources</CardTitle>
              <CardDescription>Information available to this agent</CardDescription>
            </CardHeader>
            <CardContent>
              {knowledge.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No knowledge sources connected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledge.map(k => (
                    <div key={k.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{k.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {k.type}
                        </p>
                      </div>
                      <Badge variant="outline">{k.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Allowed Actions</CardTitle>
              <CardDescription>What this agent can do during conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {(!agent.allowed_actions || agent.allowed_actions.length === 0) ? (
                <div className="text-center py-8">
                  <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No actions configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agent.allowed_actions.map(action => (
                    <div key={action} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                      <Zap className="w-5 h-5 text-primary" />
                      <p className="font-medium">{action}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing">
          <Card className="glass border-border/50 h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle>Simulate Conversation</CardTitle>
              <CardDescription>Test your agent's responses</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>Send a message to test the agent</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Sources used:
                            </p>
                            {msg.sources.map((s, j) => (
                              <Badge key={j} variant="outline" className="mr-1 mb-1 text-xs">
                                {s.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {knowledge.length === 0 && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <p className="text-sm text-warning">No knowledge sources - responses may be limited</p>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isTyping}
                />
                <Button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentDetail;