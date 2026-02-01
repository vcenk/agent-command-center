import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCalls } from '@/hooks/useCalls';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Phone, Filter, Play, PhoneForwarded } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const getCallStatusBadge = (status: string) => {
  switch (status) {
    case 'ringing':
      return <StatusBadge variant="warning">Ringing</StatusBadge>;
    case 'in-progress':
      return <StatusBadge variant="info">In Progress</StatusBadge>;
    case 'completed':
      return <StatusBadge variant="success">Completed</StatusBadge>;
    case 'failed':
      return <StatusBadge variant="error">Failed</StatusBadge>;
    case 'no-answer':
      return <StatusBadge variant="secondary">No Answer</StatusBadge>;
    case 'busy':
      return <StatusBadge variant="secondary">Busy</StatusBadge>;
    case 'transferred':
      return <StatusBadge variant="primary">Transferred</StatusBadge>;
    case 'voicemail':
      return <StatusBadge variant="default">Voicemail</StatusBadge>;
    default:
      return <StatusBadge variant="default">{status}</StatusBadge>;
  }
};

const CallsList: React.FC = () => {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: agents } = useAgents();
  const { data: calls, isLoading } = useCalls({
    agentId: agentFilter,
    status: statusFilter,
  });

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calls</h1>
          <p className="text-muted-foreground">View and manage voice call sessions</p>
        </div>
      </div>

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
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ringing">Ringing</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call History
          </CardTitle>
          <CardDescription>
            {calls?.length || 0} call{calls?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading calls...</div>
          ) : !calls || calls.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No calls recorded"
              description="Call history will appear here once your agents handle phone interactions. Configure a phone channel to get started."
              action={{
                label: 'Configure Channels',
                onClick: () => navigate('/dashboard/channels'),
                variant: 'outline',
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/calls/${call.id}`)}
                  >
                    <TableCell className="font-medium">
                      {call.agents?.name || 'Unknown Agent'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {call.from_number}
                    </TableCell>
                    <TableCell>{getCallStatusBadge(call.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDuration(call.duration)}
                    </TableCell>
                    <TableCell>
                      {call.recording_url ? (
                        <Play className="w-4 h-4 text-primary" />
                      ) : call.status === 'transferred' ? (
                        <PhoneForwarded className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {call.started_at
                        ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true })
                        : call.created_at
                          ? formatDistanceToNow(new Date(call.created_at), { addSuffix: true })
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

export default CallsList;
