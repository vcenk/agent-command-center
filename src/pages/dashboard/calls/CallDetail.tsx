import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { callSessions, agents, personas } from '@/lib/mockDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Bot,
  AlertTriangle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

const CallDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace } = useAuth();

  if (!workspace || !id) return null;

  const call = callSessions.getById(id);

  if (!call || call.workspaceId !== workspace.id) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Phone className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Call not found</h2>
        <p className="text-muted-foreground mb-4">The call you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/dashboard/calls')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Calls
        </Button>
      </div>
    );
  }

  const agent = agents.getById(call.agentId);
  const persona = agent?.personaId ? personas.getById(agent.personaId) : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/20 text-success border-success/30';
      case 'missed': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'transferred': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEscalationColor = (escalation: string) => {
    switch (escalation) {
      case 'transferred': return 'bg-warning/20 text-warning border-warning/30';
      case 'notified': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted/50 text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/calls')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
            <Badge variant="outline" className={getStatusColor(call.status)}>
              {call.status}
            </Badge>
            {call.escalation !== 'none' && (
              <Badge variant="outline" className={getEscalationColor(call.escalation)}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                {call.escalation}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {format(new Date(call.startTime), 'EEEE, MMMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Info */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="w-5 h-5 text-primary" />
              Call Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {call.direction === 'inbound' ? (
                <PhoneIncoming className="w-5 h-5 text-success" />
              ) : (
                <PhoneOutgoing className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Direction</p>
                <p className="font-medium text-foreground capitalize">{call.direction}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">From</p>
              <p className="font-medium text-foreground">{call.from}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">To</p>
              <p className="font-medium text-foreground">{call.to}</p>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium text-foreground">{formatDuration(call.durationSec)}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Agent</p>
              <p className="font-medium text-foreground">{call.agentName}</p>
              {persona && (
                <p className="text-sm text-muted-foreground">Persona: {persona.name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card className="glass border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Transcript
            </CardTitle>
            <CardDescription>
              Full conversation transcript with {call.transcript.length} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {call.transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${entry.speaker === 'agent' ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${entry.speaker === 'agent' ? 'bg-primary/20' : 'bg-secondary'}
                    `}>
                      {entry.speaker === 'agent' ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className={`
                      max-w-[80%] rounded-lg p-3
                      ${entry.speaker === 'agent' 
                        ? 'bg-primary/10 text-foreground' 
                        : 'bg-secondary text-foreground'}
                    `}>
                      <p className="text-sm">{entry.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            AI Summary
          </CardTitle>
          <CardDescription>
            Automatically generated summary of the call
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-foreground leading-relaxed">{call.summary}</p>
          </div>

          {call.escalation !== 'none' && (
            <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Escalation: {call.escalation}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {call.escalation === 'transferred' 
                      ? 'This call was transferred to a human agent for further assistance.'
                      : 'The team was notified about this call for follow-up.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallDetail;