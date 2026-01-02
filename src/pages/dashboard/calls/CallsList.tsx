import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { callSessions, agents, personas, knowledgeSources, auditLogs, usage as usageDb, retrieveChunks } from '@/lib/mockDb';
import { CallSession, TranscriptEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Clock,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const CallsList: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  if (!workspace || !user) return null;

  const workspaceAgents = agents.getByWorkspace(workspace.id);
  const workspaceCalls = callSessions.getByWorkspace(workspace.id);

  const filteredCalls = useMemo(() => {
    return workspaceCalls
      .filter(call => {
        const matchesSearch = search === '' ||
          call.from.toLowerCase().includes(search.toLowerCase()) ||
          call.to.toLowerCase().includes(search.toLowerCase()) ||
          call.agentName.toLowerCase().includes(search.toLowerCase()) ||
          call.summary.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
        const matchesDirection = directionFilter === 'all' || call.direction === directionFilter;
        const matchesAgent = agentFilter === 'all' || call.agentId === agentFilter;
        
        return matchesSearch && matchesStatus && matchesDirection && matchesAgent;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [workspaceCalls, search, statusFilter, directionFilter, agentFilter]);

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

  const generateSampleConversation = (agent: typeof workspaceAgents[0], persona: ReturnType<typeof personas.getById>) => {
    const userQuestions = [
      "Hi, I need some help.",
      "Can you tell me more about your services?",
      "What are your hours of operation?",
      "How do I schedule an appointment?",
      "Thank you, that's very helpful!",
    ];

    const transcript: TranscriptEntry[] = [];
    let timestamp = 0;

    // Agent greeting
    transcript.push({
      speaker: 'agent',
      text: persona?.greetingScript || `Hello! This is ${agent.name}, how can I help you today?`,
      timestamp: formatTimestamp(timestamp),
    });
    timestamp += 8;

    // First user question
    transcript.push({
      speaker: 'user',
      text: userQuestions[0],
      timestamp: formatTimestamp(timestamp),
    });
    timestamp += 5;

    // Agent response using knowledge
    const knowledgeIds = agent.knowledgeSourceIds || [];
    if (knowledgeIds.length > 0) {
      const chunks = retrieveChunks("services hours appointment", knowledgeIds, 2);
      const knowledgeResponse = chunks.length > 0 
        ? `Based on our information: ${chunks[0].content.slice(0, 150)}...`
        : "I'd be happy to help you with that. Let me provide some information.";
      
      transcript.push({
        speaker: 'agent',
        text: knowledgeResponse,
        timestamp: formatTimestamp(timestamp),
      });
      timestamp += 15;
    } else {
      transcript.push({
        speaker: 'agent',
        text: "I'd be happy to assist you. What specifically would you like to know?",
        timestamp: formatTimestamp(timestamp),
      });
      timestamp += 10;
    }

    // More Q&A
    transcript.push({
      speaker: 'user',
      text: userQuestions[3],
      timestamp: formatTimestamp(timestamp),
    });
    timestamp += 6;

    const toneResponses: Record<string, string> = {
      professional: "Certainly. To schedule an appointment, I can assist you right now. What date and time works best for you?",
      friendly: "Of course! I'd love to help you schedule that. When would be a good time for you?",
      casual: "Sure thing! Let's get you set up. What day works for you?",
      formal: "I would be pleased to assist with scheduling. Please indicate your preferred date and time.",
    };

    transcript.push({
      speaker: 'agent',
      text: toneResponses[persona?.tone || 'professional'],
      timestamp: formatTimestamp(timestamp),
    });
    timestamp += 12;

    transcript.push({
      speaker: 'user',
      text: userQuestions[4],
      timestamp: formatTimestamp(timestamp),
    });
    timestamp += 4;

    transcript.push({
      speaker: 'agent',
      text: "You're welcome! Is there anything else I can help you with today?",
      timestamp: formatTimestamp(timestamp),
    });

    return { transcript, durationSec: timestamp + 8 };
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSimulateCall = () => {
    if (workspaceAgents.length === 0) {
      toast({
        title: 'No agents available',
        description: 'Please create an agent first to simulate calls.',
        variant: 'destructive',
      });
      return;
    }

    // Pick a random live agent, or any agent if none are live
    const liveAgents = workspaceAgents.filter(a => a.status === 'live');
    const agentPool = liveAgents.length > 0 ? liveAgents : workspaceAgents;
    const selectedAgent = agentPool[Math.floor(Math.random() * agentPool.length)];
    const persona = selectedAgent.personaId ? personas.getById(selectedAgent.personaId) : null;

    const { transcript, durationSec } = generateSampleConversation(selectedAgent, persona);

    const directions: Array<'inbound' | 'outbound'> = ['inbound', 'outbound'];
    const statuses: Array<'completed' | 'missed' | 'transferred'> = ['completed', 'completed', 'completed', 'transferred'];
    
    const phoneNumbers = [
      '+1 (555) 123-4567',
      '+1 (555) 234-5678',
      '+1 (555) 345-6789',
      '+1 (555) 456-7890',
      '+1 (555) 567-8901',
    ];

    const direction = directions[Math.floor(Math.random() * directions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const fromNumber = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];

    const newCall = callSessions.create({
      workspaceId: workspace.id,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      direction,
      from: direction === 'inbound' ? fromNumber : '+1 (555) 888-9999',
      to: direction === 'inbound' ? '+1 (555) 888-9999' : fromNumber,
      startTime: new Date().toISOString(),
      durationSec,
      status,
      transcript,
      summary: `Simulated ${direction} call handled by ${selectedAgent.name}. ${status === 'transferred' ? 'Call was transferred to a human agent.' : 'Call completed successfully.'}`,
      escalation: status === 'transferred' ? 'transferred' : 'none',
      createdAt: new Date().toISOString(),
    });

    // Update usage
    usageDb.increment(workspace.id, 'callMinutes', Math.ceil(durationSec / 60));

    // Log audit event
    auditLogs.create({
      workspaceId: workspace.id,
      actorEmail: user.email,
      actionType: 'execute',
      entityType: 'call',
      entityId: newCall.id,
      before: null,
      after: { 
        event: 'call_simulated',
        agentId: selectedAgent.id,
        callId: newCall.id,
      },
    });

    toast({
      title: 'Call simulated',
      description: `Created a ${direction} call with ${selectedAgent.name}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calls</h1>
          <p className="text-muted-foreground">View and manage call sessions</p>
        </div>
        <Button onClick={handleSimulateCall} className="gap-2">
          <Play className="w-4 h-4" />
          Simulate Call
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {workspaceAgents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      {filteredCalls.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Phone className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calls found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {workspaceCalls.length === 0 
                ? "No calls have been recorded yet. Simulate a call to get started."
                : "No calls match your current filters."}
            </p>
            {workspaceCalls.length === 0 && (
              <Button onClick={handleSimulateCall} className="gap-2">
                <Play className="w-4 h-4" />
                Simulate Call
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>From / To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow 
                    key={call.id}
                    className="cursor-pointer hover:bg-secondary/50"
                    onClick={() => navigate(`/dashboard/calls/${call.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {call.direction === 'inbound' ? (
                          <PhoneIncoming className="w-4 h-4 text-success" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-primary" />
                        )}
                        <span className="capitalize">{call.direction}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{call.agentName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-foreground">{call.from}</div>
                        <div className="text-muted-foreground text-xs">→ {call.to}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(call.durationSec)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(call.startTime), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CallsList;