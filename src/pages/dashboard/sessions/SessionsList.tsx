import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ChannelBadge, StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { MessageSquare, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SessionsList: React.FC = () => {
  const navigate = useNavigate();
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const { data: agents } = useAgents();
  const { data: sessions, isLoading } = useChatSessions({
    agentId: agentFilter,
    status: statusFilter,
    channel: channelFilter,
  });

  // Helper to get session status display
  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <StatusBadge variant="success">Open</StatusBadge>;
      case 'closed':
        return <StatusBadge variant="secondary">Closed</StatusBadge>;
      case 'escalated':
        return <StatusBadge variant="error">Escalated</StatusBadge>;
      default:
        return <StatusBadge variant="default">{status}</StatusBadge>;
    }
  };

  const truncateMessage = (message: string | null, maxLength = 60) => {
    if (!message) return '—';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="View and manage chat conversations"
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </CardTitle>
          <CardDescription>
            {sessions?.length || 0} session{sessions?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
          ) : !sessions || sessions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No sessions found"
              description="Chat sessions will appear here when users interact with your agents."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="w-[300px]">Last Message</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                  >
                    <TableCell className="font-medium">
                      {session.agents?.name || 'Unknown Agent'}
                    </TableCell>
                    <TableCell><ChannelBadge channel={session.channel} /></TableCell>
                    <TableCell>{getSessionStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.lead_captured ? (
                        <StatusBadge variant="warning">Lead</StatusBadge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {truncateMessage(session.last_message)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {session.updated_at
                        ? formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionsList;
