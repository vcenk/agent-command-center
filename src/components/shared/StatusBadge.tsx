import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  | 'primary'
  | 'secondary';

export type ChannelType = 'web' | 'whatsapp' | 'sms' | 'phone' | 'email';
export type AgentStatus = 'live' | 'draft' | 'active' | 'completed' | 'escalated';

interface StatusBadgeProps {
  variant?: StatusVariant;
  channel?: ChannelType;
  status?: AgentStatus;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
  error: 'bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400',
  primary: 'bg-primary/10 text-primary border-primary/30',
  secondary: 'bg-secondary text-secondary-foreground border-border',
  default: 'bg-muted text-muted-foreground border-border',
};

const channelConfig: Record<ChannelType, { label: string; variant: StatusVariant }> = {
  web: { label: 'Web', variant: 'info' },
  whatsapp: { label: 'WhatsApp', variant: 'success' },
  sms: { label: 'SMS', variant: 'primary' },
  phone: { label: 'Phone', variant: 'warning' },
  email: { label: 'Email', variant: 'secondary' },
};

const statusConfig: Record<AgentStatus, { label: string; variant: StatusVariant }> = {
  live: { label: 'Live', variant: 'success' },
  draft: { label: 'Draft', variant: 'warning' },
  active: { label: 'Active', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  escalated: { label: 'Escalated', variant: 'error' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  channel,
  status,
  children,
  className,
}) => {
  // Determine the variant and label based on props
  let finalVariant: StatusVariant = variant || 'default';
  let label = children;

  if (channel && channelConfig[channel]) {
    finalVariant = channelConfig[channel].variant;
    label = label || channelConfig[channel].label;
  }

  if (status && statusConfig[status]) {
    finalVariant = statusConfig[status].variant;
    label = label || statusConfig[status].label;
  }

  return (
    <Badge
      variant="outline"
      className={cn(variantStyles[finalVariant], className)}
    >
      {label}
    </Badge>
  );
};

// Convenience components for common use cases
export const ChannelBadge: React.FC<{ channel: string | null; className?: string }> = ({
  channel,
  className
}) => {
  if (!channel || !channelConfig[channel as ChannelType]) {
    return <StatusBadge variant="default" className={className}>Unknown</StatusBadge>;
  }
  return <StatusBadge channel={channel as ChannelType} className={className} />;
};

export const AgentStatusBadge: React.FC<{ status: string | null; className?: string }> = ({
  status,
  className
}) => {
  if (!status || !statusConfig[status as AgentStatus]) {
    return <StatusBadge variant="default" className={className}>Unknown</StatusBadge>;
  }
  return <StatusBadge status={status as AgentStatus} className={className} />;
};

export const SessionStatusBadge: React.FC<{ status: string | null; className?: string }> = ({
  status,
  className
}) => {
  const statusMap: Record<string, AgentStatus> = {
    active: 'active',
    completed: 'completed',
    escalated: 'escalated',
  };

  const mappedStatus = status ? statusMap[status] : undefined;
  if (!mappedStatus) {
    return <StatusBadge variant="default" className={className}>{status || 'Unknown'}</StatusBadge>;
  }
  return <StatusBadge status={mappedStatus} className={className} />;
};

export default StatusBadge;
