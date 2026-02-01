import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCall } from '@/hooks/useCalls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  ArrowLeft,
  Phone,
  Bot,
  Clock,
  ExternalLink,
  PhoneForwarded,
  Mic,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    case 'transferred':
      return <StatusBadge variant="primary">Transferred</StatusBadge>;
    default:
      return <StatusBadge variant="default">{status}</StatusBadge>;
  }
};

const CallDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: call, isLoading } = useCall(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading call...</div>
      </div>
    );
  }

  if (!call) {
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

  const transcript = Array.isArray(call.transcript) ? call.transcript : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Calls', href: '/dashboard/calls' },
          { label: `Call from ${call.from_number}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
          <p className="text-muted-foreground text-sm">
            {call.agents?.name || 'Unknown Agent'} · {call.from_number}
          </p>
        </div>
        {getCallStatusBadge(call.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mic className="w-5 h-5" />
                Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transcript available for this call
                </div>
              ) : (
                transcript.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-70">
                          {msg.role === 'user' ? 'Caller' : 'Agent'}
                        </span>
                        {msg.timestamp && (
                          <span className="text-xs opacity-50">
                            {format(new Date(msg.timestamp), 'h:mm:ss a')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Call Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agent</span>
                <Link
                  to={`/dashboard/agents/${call.agent_id}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Bot className="w-3 h-3" />
                  {call.agents?.name || 'Unknown'}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Direction</span>
                <div className="flex items-center gap-1 text-sm">
                  {call.direction === 'inbound' ? (
                    <PhoneIncoming className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <PhoneOutgoing className="w-3 h-3 text-muted-foreground" />
                  )}
                  {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm font-mono">{call.from_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-mono">{call.to_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getCallStatusBadge(call.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm">{formatDuration(call.duration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Messages</span>
                <span className="text-sm">{transcript.length}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Started
                </div>
                <p className="text-sm">
                  {call.started_at ? format(new Date(call.started_at), 'PPp') : '—'}
                </p>
              </div>
              {call.ended_at && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    Ended
                  </div>
                  <p className="text-sm">
                    {format(new Date(call.ended_at), 'PPp')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recording Card */}
          {call.recording_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio
                  controls
                  className="w-full"
                  src={call.recording_url}
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
                {call.recording_duration && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Duration: {formatDuration(call.recording_duration)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transfer Info Card */}
          {call.transferred_to && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PhoneForwarded className="w-4 h-4" />
                  Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Transferred to</span>
                  <p className="text-sm font-mono">{call.transferred_to}</p>
                </div>
                {call.transfer_reason && (
                  <div>
                    <span className="text-sm text-muted-foreground">Reason</span>
                    <p className="text-sm">{call.transfer_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetail;
