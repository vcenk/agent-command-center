/**
 * Business Domain Configuration
 *
 * Contains metadata about supported business domains for agents.
 */

export type BusinessDomain =
  | 'healthcare'
  | 'retail'
  | 'finance'
  | 'realestate'
  | 'hospitality'
  | 'other';

export interface DomainInfo {
  label: string;
  description: string;
  icon: string;
}

export const BUSINESS_DOMAINS: Record<BusinessDomain, DomainInfo> = {
  healthcare: {
    label: 'Healthcare',
    description: 'Medical offices, clinics, dental practices',
    icon: '🏥',
  },
  retail: {
    label: 'Retail',
    description: 'E-commerce, stores, consumer goods',
    icon: '🛍️',
  },
  finance: {
    label: 'Finance',
    description: 'Banking, insurance, investments',
    icon: '💰',
  },
  realestate: {
    label: 'Real Estate',
    description: 'Property management, sales, rentals',
    icon: '🏠',
  },
  hospitality: {
    label: 'Hospitality',
    description: 'Hotels, restaurants, travel',
    icon: '🏨',
  },
  other: {
    label: 'Other',
    description: 'Custom business type',
    icon: '📋',
  },
};

export const DOMAIN_OPTIONS = Object.entries(BUSINESS_DOMAINS).map(([value, info]) => ({
  value: value as BusinessDomain,
  label: info.label,
  description: info.description,
  icon: info.icon,
}));
