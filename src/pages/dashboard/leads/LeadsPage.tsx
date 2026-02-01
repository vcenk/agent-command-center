import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Copy, Download, Mail, ExternalLink, Search } from 'lucide-react';
import { useLeads, LeadFilters } from '@/hooks/useLeads';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { ChannelBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { toast } from 'sonner';

const LeadsPage = () => {
  const navigate = useNavigate();
  const [agentFilter, setAgentFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [searchQuery, setSearchQuery] = useState('');

  const filters: LeadFilters = {
    agentId: agentFilter,
    channel: channelFilter,
    dateRange,
    search: searchQuery || undefined,
  };

  const { data: leads, isLoading } = useLeads(filters);
  const { data: agents } = useAgents();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };

  const exportCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const headers = ['Created', 'Agent', 'Channel', 'Name', 'Email', 'Phone', 'Source'];
    const rows = leads.map(lead => [
      format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm'),
      lead.agents?.name || 'Unknown',
      lead.channel || 'web',
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.source || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };

  // Calculate active filter count for filter indicator
  const activeFilterCount = [
    agentFilter !== 'all',
    channelFilter !== 'all',
    dateRange !== 'all',
    searchQuery.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Captured contact information from chat sessions"
        action={
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <FilterBar
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setSearchQuery('');
          setAgentFilter('all');
          setChannelFilter('all');
          setDateRange('30');
        }}
      >
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, phone, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents?.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="web">Web</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7' | '30' | '90' | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            {leads?.length || 0} lead{leads?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leads?.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No leads captured yet"
              description="Leads will appear here when visitors share their contact info through your chat agents."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.agents?.name || 'Unknown'}
                    </TableCell>
                    <TableCell><ChannelBadge channel={lead.channel} /></TableCell>
                    <TableCell>{lead.name || '-'}</TableCell>
                    <TableCell>
                      {lead.email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lead.email}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(lead.email!, 'Email');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lead.phone}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(lead.phone!, 'Phone');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lead.session_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => navigate(`/dashboard/sessions/${lead.session_id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      ) : '-'}
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

export default LeadsPage;