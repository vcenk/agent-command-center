import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useChatSession, useUpdateChatSession } from '@/hooks/useChatSessions';
import { useLeadBySession } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Bot, Clock, MessageSquare, ExternalLink, Save, Mail, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useChatSession(id);
  const { data: lead } = useLeadBySession(session?.id);
  const updateSession = useUpdateChatSession();
  const [internalNote, setInternalNote] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);

  // Load internal note once session is fetched
  React.useEffect(() => {
    if (session && !noteLoaded) {
      setInternalNote(session.internal_note || '');
      setNoteLoaded(true);
    }
  }, [session, noteLoaded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/sessions')}>
          Back to Sessions
        </Button>
      </div>
    );
  }

  const messages = Array.isArray(session.messages) ? session.messages : [];

  const toggleStatus = () => {
    const newStatus = session.status === 'active' ? 'closed' : 'active';
    updateSession.mutate({ id: session.id, updates: { status: newStatus } });
  };

  const saveInternalNote = () => {
    updateSession.mutate({ id: session.id, updates: { internal_note: internalNote } });
  };

  const getChannelBadge = (channel: string | null) => {
    const channelName = channel || 'web';
    const colors: Record<string, string> = {
      web: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      whatsapp: 'bg-green-500/20 text-green-400 border-green-500/30',
      sms: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      phone: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return (
      <Badge variant="outline" className={colors[channelName] || ''}>
        {channelName.charAt(0).toUpperCase() + channelName.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Sessions', href: '/dashboard/sessions' },
          { label: `Session ${session.session_id.substring(0, 8)}...` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Session Details</h1>
          <p className="text-muted-foreground text-sm">
            {session.agents?.name || 'Unknown Agent'} · {session.session_id.substring(0, 8)}...
          </p>
        </div>
        <Button
          variant={session.status === 'active' ? 'outline' : 'default'}
          onClick={toggleStatus}
          disabled={updateSession.isPending}
        >
          {session.status === 'active' ? 'Mark Closed' : 'Reopen'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Transcript */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages in this session
                </div>
              ) : (
                messages.map((msg: { role: string; content: string }, index: number) => (
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
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Info Panel */}
        <div className="space-y-4">
          {/* Session Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agent</span>
                <Link
                  to={`/dashboard/agents/${session.agent_id}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Bot className="w-3 h-3" />
                  {(session as { agents?: { name?: string } }).agents?.name || 'Unknown'}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Channel</span>
                {getChannelBadge(session.channel)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                  {session.status === 'active' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Messages</span>
                <span className="text-sm">{messages.length}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Created
                </div>
                <p className="text-sm">
                  {session.created_at ? format(new Date(session.created_at), 'PPp') : '—'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Last Updated
                </div>
                <p className="text-sm">
                  {session.updated_at ? format(new Date(session.updated_at), 'PPp') : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lead Info Card */}
          {(session.lead_captured || lead) && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Lead Captured
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead?.name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{lead.name}</span>
                  </div>
                )}
                {lead?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{lead.email}</span>
                  </div>
                )}
                {lead?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{lead.phone}</span>
                  </div>
                )}
                <Link
                  to={`/dashboard/leads?session=${session.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                >
                  View in Leads
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Internal Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add internal notes about this session..."
                rows={4}
              />
              <Button
                size="sm"
                onClick={saveInternalNote}
                disabled={updateSession.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
