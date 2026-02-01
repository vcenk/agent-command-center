/**
 * Channel Configuration Constants
 *
 * Contains metadata for supported communication channels.
 */

export type ChannelType = 'web' | 'phone' | 'sms' | 'whatsapp' | 'email';

export interface ChannelInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const CHANNELS: Record<ChannelType, ChannelInfo> = {
  web: {
    label: 'Web Chat',
    description: 'Embeddable website chat widget',
    icon: '💬',
    color: 'blue',
  },
  phone: {
    label: 'Phone',
    description: 'Voice calls with AI agent',
    icon: '📞',
    color: 'green',
  },
  sms: {
    label: 'SMS',
    description: 'Text message conversations',
    icon: '📱',
    color: 'purple',
  },
  whatsapp: {
    label: 'WhatsApp',
    description: 'WhatsApp Business integration',
    icon: '📲',
    color: 'emerald',
  },
  email: {
    label: 'Email',
    description: 'Email response automation',
    icon: '📧',
    color: 'orange',
  },
};

export const CHANNEL_OPTIONS = Object.entries(CHANNELS).map(([value, info]) => ({
  value: value as ChannelType,
  label: info.label,
  description: info.description,
  icon: info.icon,
  color: info.color,
}));
