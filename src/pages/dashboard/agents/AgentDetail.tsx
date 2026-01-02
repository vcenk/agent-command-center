import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { agents, personas, knowledgeSources, auditLogs, retrieveChunks, callSessions } from '@/lib/mockDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Bot,
  Rocket,
  MessageSquare,
  Phone,
  Mail,
  Settings,
  BookOpen,
  Zap,
  Send,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { name: string; content: string }[];
}

const AgentDetail: React.FC = () => {
  const { id } = useParams();
  const { workspace, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const agent = id ? agents.getById(id) : null;
  const persona = agent?.personaId ? personas.getById(agent.personaId) : null;
  const knowledge = agent ? agent.knowledgeSourceIds.map(kid => knowledgeSources.getById(kid)).filter(Boolean) : [];
  const agentCalls = agent ? callSessions.getByAgent(agent.id) : [];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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
    
    agents.update(agent.id, { status: 'live' });
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user?.email || '',
      actionType: 'publish',
      entityType: 'agent',
      entityId: agent.id,
      before: { status: 'draft' },
      after: { status: 'live' },
    });
    toast({
      title: 'Agent published!',
      description: `${agent.name} is now live and ready to handle interactions.`,
    });
    navigate('/dashboard/agents');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI response with RAG
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Get relevant chunks if agent has knowledge
    const chunks = agent.knowledgeSourceIds.length > 0
      ? retrieveChunks(chatInput, agent.knowledgeSourceIds, 2)
      : [];

    let responseContent = '';
    const sources: { name: string; content: string }[] = [];

    if (chunks.length > 0) {
      // Build response from chunks
      const chunkInfo = chunks.map(c => c.content).join('\n\n');
      responseContent = `Based on the available information:\n\n${chunks[0].content.slice(0, 200)}...\n\nIs there anything specific you'd like to know more about?`;
      chunks.forEach(c => {
        sources.push({ name: c.sourceName, content: c.content.slice(0, 100) + '...' });
      });
    } else if (persona) {
      // Use persona greeting/style
      responseContent = persona.greetingScript || `Hello! I'm here to help. ${persona.styleNotes ? `I'll be ${persona.tone} and ${persona.styleNotes.slice(0, 50)}...` : 'How can I assist you today?'}`;
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/agents')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
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
            <p className="text-muted-foreground capitalize">{agent.businessDomain}</p>
          </div>
        </div>
        {hasPermission('write') && agent.status === 'draft' && (
          <Button variant="glow" onClick={handlePublish}>
            <Rocket className="w-4 h-4 mr-2" />
            Publish Agent
          </Button>
        )}
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
                  <p className="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
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
                  <p className="text-2xl font-bold">{agentCalls.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">
                    {agentCalls.length > 0 
                      ? Math.round(agentCalls.reduce((a, c) => a + c.durationSec, 0) / agentCalls.length / 60)
                      : 0} min
                  </p>
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
                ].map(channel => (
                  <div
                    key={channel.key}
                    className={`p-4 rounded-lg border ${
                      agent.channels[channel.key as keyof typeof agent.channels]
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <channel.icon className={`w-6 h-6 mb-2 ${
                      agent.channels[channel.key as keyof typeof agent.channels]
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`} />
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.channels[channel.key as keyof typeof agent.channels] ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                ))}
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
                  {knowledge.map(k => k && (
                    <div key={k.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{k.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {k.type} · {k.chunks.length} chunks
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
              {agent.allowedActions.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No actions configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agent.allowedActions.map(action => (
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
