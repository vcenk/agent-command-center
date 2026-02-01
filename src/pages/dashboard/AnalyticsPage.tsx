import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { secureApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquare,
  Users,
  Clock,
  Bot,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalyticsData {
  overview: {
    total_conversations: number;
    conversation_growth: number;
    total_leads: number;
    conversion_rate: number;
    avg_duration_minutes: number;
    avg_messages_per_session: number;
    active_agents: number;
    total_messages: number;
  };
  channel_breakdown: Array<{
    channel: string;
    count: number;
    percentage: number;
  }>;
  agent_performance: Array<{
    id: string;
    name: string;
    status: string;
    conversations: number;
    leads_captured: number;
    conversion_rate: number;
  }>;
  trend_data: Array<{
    date: string;
    conversations: number;
    leads: number;
  }>;
  recent_conversations: Array<{
    id: string;
    agent_id: string;
    agent_name: string;
    channel: string;
    status: string;
    message_count: number;
    lead_captured: boolean;
    started_at: string;
  }>;
  period: string;
}

const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const { isAuthenticated, workspace } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', period, workspace?.id],
    queryFn: () => secureApi.get<AnalyticsData>(`/analytics?period=${period}`),
    enabled: isAuthenticated && !!workspace?.id,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const overview = analytics?.overview;
  const growthPositive = (overview?.conversation_growth || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Monitor your AI agents' performance</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{overview?.total_conversations.toLocaleString()}</span>
              <div className={`flex items-center text-sm ${growthPositive ? 'text-green-600' : 'text-red-600'}`}>
                {growthPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(overview?.conversation_growth || 0)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs previous period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads Captured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{overview?.total_leads.toLocaleString()}</span>
              <Badge variant="secondary">{overview?.conversion_rate}% rate</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">from conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg. Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{overview?.avg_duration_minutes || 0}</span>
              <span className="text-muted-foreground">min</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{overview?.avg_messages_per_session} messages/session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{overview?.active_agents}</span>
              <Badge variant="outline" className="text-green-600">Live</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview?.total_messages.toLocaleString()} total messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversation Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversation Trend
            </CardTitle>
            <CardDescription>Daily conversations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {analytics?.trend_data.slice(-14).map((day, i) => {
                const maxConversations = Math.max(...(analytics?.trend_data.map(d => d.conversations) || [1]))
                const height = maxConversations > 0 ? (day.conversations / maxConversations) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.conversations} conversations`}
                    />
                    {i % 2 === 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(day.date).getDate()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Channel Breakdown
            </CardTitle>
            <CardDescription>Where conversations are happening</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.channel_breakdown.map((channel) => (
                <div key={channel.channel} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{channel.channel}</span>
                    <span className="text-muted-foreground">
                      {channel.count} ({channel.percentage}%)
                    </span>
                  </div>
                  <Progress value={channel.percentage} className="h-2" />
                </div>
              ))}
              {(!analytics?.channel_breakdown || analytics.channel_breakdown.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No channel data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
          <CardDescription>How each agent is performing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.agent_performance.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Link
                      to={`/dashboard/agents/${agent.id}`}
                      className="font-medium hover:underline"
                    >
                      {agent.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.status === 'live' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{agent.conversations}</TableCell>
                  <TableCell className="text-right">{agent.leads_captured}</TableCell>
                  <TableCell className="text-right">
                    <span className={agent.conversion_rate > 10 ? 'text-green-600' : ''}>
                      {agent.conversion_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!analytics?.agent_performance || analytics.agent_performance.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No agents yet. <Link to="/dashboard/agents/new" className="text-primary hover:underline">Create one</Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>Latest chat sessions</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/sessions">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.recent_conversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    <Link
                      to={`/dashboard/sessions/${conv.id}`}
                      className="font-medium hover:underline"
                    >
                      {conv.agent_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {conv.channel}
                    </Badge>
                  </TableCell>
                  <TableCell>{conv.message_count}</TableCell>
                  <TableCell>
                    {conv.lead_captured ? (
                      <Badge variant="default" className="bg-green-600">Captured</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(conv.started_at)} {formatTime(conv.started_at)}
                  </TableCell>
                </TableRow>
              ))}
              {(!analytics?.recent_conversations || analytics.recent_conversations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No conversations yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
