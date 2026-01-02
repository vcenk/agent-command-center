import { 
  workspaces, users, personas, agents, knowledgeSources, 
  callSessions, integrations, auditLogs, generateId 
} from './mockDb';

export const seedDemoData = (workspaceId: string, userEmail: string) => {
  // Create sample personas
  const persona1 = personas.create({
    workspaceId,
    name: 'Sarah - Dental Receptionist',
    roleTitle: 'Dental Receptionist',
    tone: 'friendly',
    styleNotes: 'Warm and welcoming, always uses patient\'s name. Speaks clearly and at a moderate pace.',
    doNotDo: [
      'Never provide medical advice',
      'Never share other patient information',
      'Never argue with callers',
      'Never use medical jargon',
    ],
    greetingScript: 'Thank you for calling Bright Smile Dental! This is Sarah, how may I help you today?',
    fallbackPolicy: 'escalate',
    escalationRules: 'If caller is upset or has an emergency, transfer immediately to office manager.',
  });

  const persona2 = personas.create({
    workspaceId,
    name: 'Alex - Real Estate Assistant',
    roleTitle: 'Real Estate Virtual Assistant',
    tone: 'professional',
    styleNotes: 'Knowledgeable about properties, enthusiastic but not pushy. Provides detailed information.',
    doNotDo: [
      'Never guarantee property availability',
      'Never discuss pricing without authorization',
      'Never make promises about closing dates',
    ],
    greetingScript: 'Hello! Thank you for reaching out to Premium Properties. I\'m Alex, your virtual assistant. How can I help you find your perfect home today?',
    fallbackPolicy: 'retry',
    escalationRules: 'Escalate to a human agent for pricing negotiations or complex inquiries.',
  });

  // Create sample knowledge sources
  const knowledge1 = knowledgeSources.create({
    workspaceId,
    name: 'Dental Office FAQ',
    type: 'TEXT',
    rawText: `
      Our office hours are Monday through Friday, 8:00 AM to 5:00 PM.
      We are closed on weekends and major holidays.
      
      Insurance: We accept most major dental insurance plans including Delta Dental, Cigna, MetLife, and Aetna.
      Please bring your insurance card to your first appointment.
      
      New Patient Information:
      - Please arrive 15 minutes early to complete paperwork
      - Bring a valid ID and insurance card
      - We accept cash, credit cards, and CareCredit
      
      Emergency Care:
      For dental emergencies during office hours, call our main line.
      For after-hours emergencies, call our emergency line at 555-DENTAL-ER.
      
      Services Offered:
      - General dentistry and cleanings
      - Cosmetic dentistry
      - Orthodontics
      - Pediatric dentistry
      - Emergency dental care
    `,
    tags: ['dental', 'faq', 'insurance'],
  });

  const knowledge2 = knowledgeSources.create({
    workspaceId,
    name: 'Property Listings - Downtown',
    type: 'TEXT',
    rawText: `
      DOWNTOWN PROPERTIES AVAILABLE:
      
      1. Skyline Apartments - Unit 2401
      - 2 bed, 2 bath, 1,200 sqft
      - Modern finishes, city views
      - Pet friendly
      - Rent: $2,800/month
      - Available: Immediate
      
      2. Harbor View Condos - Unit 510
      - 3 bed, 2.5 bath, 1,800 sqft
      - Waterfront location
      - Includes parking
      - Rent: $4,200/month
      - Available: Feb 1st
      
      3. The Metropolitan - Unit 1205
      - 1 bed, 1 bath, 750 sqft
      - Walkable to transit
      - In-unit laundry
      - Rent: $1,950/month
      - Available: Immediate
      
      AMENITIES: All downtown properties include 24/7 concierge, fitness center, and rooftop access.
    `,
    tags: ['real-estate', 'downtown', 'rentals'],
  });

  // Create sample agents
  const agent1 = agents.create({
    workspaceId,
    name: 'Dental Office Agent',
    businessDomain: 'healthcare',
    personaId: persona1.id,
    channels: { webChat: true, phone: true, sms: true, whatsapp: false },
    goals: 'Schedule appointments, answer FAQs about insurance and services, handle basic inquiries.',
    allowedActions: ['Book appointment (Calendly)', 'Send confirmation email'],
    knowledgeSourceIds: [knowledge1.id],
    status: 'live',
  });

  const agent2 = agents.create({
    workspaceId,
    name: 'Property Inquiry Bot',
    businessDomain: 'realestate',
    personaId: persona2.id,
    channels: { webChat: true, phone: false, sms: true, whatsapp: true },
    goals: 'Qualify leads, provide property information, schedule viewings.',
    allowedActions: ['Book appointment (Calendly)', 'Send webhook (POST)'],
    knowledgeSourceIds: [knowledge2.id],
    status: 'draft',
  });

  // Create sample call sessions with realistic transcripts
  const sampleCallData = [
    {
      direction: 'inbound' as const,
      from: '+1 (555) 123-4567',
      to: '+1 (555) 888-9999',
      durationSec: 245,
      status: 'completed' as const,
      transcript: [
        { speaker: 'agent' as const, text: "Good morning! Thank you for calling Bright Smile Dental. This is Sarah, how may I assist you today?", timestamp: '00:00' },
        { speaker: 'user' as const, text: "Hi, I'd like to schedule a cleaning appointment.", timestamp: '00:08' },
        { speaker: 'agent' as const, text: "Of course! I'd be happy to help you with that. Are you a new patient or an existing patient with us?", timestamp: '00:15' },
        { speaker: 'user' as const, text: "I'm a new patient.", timestamp: '00:22' },
        { speaker: 'agent' as const, text: "Perfect. I have availability next Tuesday at 9:00 AM or Thursday at 10:30 AM. Which works better for you?", timestamp: '00:28' },
        { speaker: 'user' as const, text: "Tuesday at 9 sounds good.", timestamp: '00:38' },
        { speaker: 'agent' as const, text: "Excellent! I've scheduled you for Tuesday, January 14th at 9:00 AM for a new patient cleaning. Please arrive 15 minutes early. Is there anything else I can help with?", timestamp: '00:45' },
        { speaker: 'user' as const, text: "No, that's all. Thank you!", timestamp: '01:02' },
        { speaker: 'agent' as const, text: "You're welcome! We look forward to seeing you Tuesday. Have a great day!", timestamp: '01:08' },
      ],
      summary: 'New patient scheduled for cleaning appointment on Tuesday at 9:00 AM. Caller was reminded to arrive early and bring ID and insurance card.',
      escalation: 'none' as const,
    },
    {
      direction: 'inbound' as const,
      from: '+1 (555) 234-5678',
      to: '+1 (555) 888-9999',
      durationSec: 180,
      status: 'completed' as const,
      transcript: [
        { speaker: 'agent' as const, text: "Hello! Thank you for reaching out to Premium Properties. I'm Alex, how can I help you find your perfect home today?", timestamp: '00:00' },
        { speaker: 'user' as const, text: "I'm looking for a 2-bedroom apartment downtown.", timestamp: '00:12' },
        { speaker: 'agent' as const, text: "Great choice! Downtown has some wonderful options. Do you have a budget in mind?", timestamp: '00:20' },
        { speaker: 'user' as const, text: "Around $3,000 per month.", timestamp: '00:28' },
        { speaker: 'agent' as const, text: "Perfect. I have a lovely 2 bed, 2 bath at Skyline Apartments available immediately. It's 1,200 square feet with modern finishes and amazing city views. Listed at $2,800 per month. Would you like to schedule a viewing?", timestamp: '00:35' },
        { speaker: 'user' as const, text: "That sounds great! Can I see it this weekend?", timestamp: '00:55' },
        { speaker: 'agent' as const, text: "Absolutely! I have Saturday at 2:00 PM or Sunday at 11:00 AM available. Which works better?", timestamp: '01:02' },
        { speaker: 'user' as const, text: "Saturday at 2 works.", timestamp: '01:12' },
        { speaker: 'agent' as const, text: "Wonderful! I've scheduled your viewing for Saturday at 2:00 PM. I'll send you a confirmation with the address. Is there anything else?", timestamp: '01:18' },
        { speaker: 'user' as const, text: "No, I think that covers it. Thanks!", timestamp: '01:35' },
      ],
      summary: 'Prospective tenant scheduled viewing for Skyline Apartments 2BR unit on Saturday at 2:00 PM. Budget $3,000/month, interested in downtown area.',
      escalation: 'none' as const,
    },
    {
      direction: 'inbound' as const,
      from: '+1 (555) 345-6789',
      to: '+1 (555) 888-9999',
      durationSec: 320,
      status: 'transferred' as const,
      transcript: [
        { speaker: 'agent' as const, text: "Thank you for calling Bright Smile Dental! This is Sarah, how may I help you today?", timestamp: '00:00' },
        { speaker: 'user' as const, text: "I'm having severe tooth pain and I think it's an emergency.", timestamp: '00:10' },
        { speaker: 'agent' as const, text: "I'm so sorry to hear you're in pain. Let me help you right away. Can you describe the pain? Is it a sharp pain or more of a throbbing sensation?", timestamp: '00:18' },
        { speaker: 'user' as const, text: "It's throbbing and it's been getting worse all day. I can barely eat.", timestamp: '00:32' },
        { speaker: 'agent' as const, text: "I understand, that sounds very uncomfortable. Given the severity, let me transfer you to our office manager who can get you in for an emergency appointment right away. Please hold.", timestamp: '00:45' },
      ],
      summary: 'Patient called with severe tooth pain emergency. Following escalation protocol, call was transferred to office manager for immediate emergency appointment scheduling.',
      escalation: 'transferred' as const,
    },
  ];

  sampleCallData.forEach((t, i) => {
    const agentForCall = i < 2 ? (i === 0 ? agent1 : agent2) : agent1;
    callSessions.create({
      workspaceId,
      agentId: agentForCall.id,
      agentName: agentForCall.name,
      ...t,
      startTime: new Date(Date.now() - (i + 1) * 3600000 * 24).toISOString(),
      createdAt: new Date(Date.now() - (i + 1) * 3600000 * 24).toISOString(),
    });
  });

  // Create sample integrations
  integrations.create({
    workspaceId,
    type: 'Calendly',
    name: 'Dental Office Calendar',
    apiKeyOrEndpoint: 'cal_*****************************xyz',
    enabled: true,
  });

  integrations.create({
    workspaceId,
    type: 'Webhook',
    name: 'CRM Lead Webhook',
    apiKeyOrEndpoint: 'https://crm.example.com/api/leads',
    enabled: true,
  });

  // Create audit logs
  const actions: Array<{ actionType: 'create' | 'publish', entityType: string, entityId: string }> = [
    { actionType: 'create', entityType: 'persona', entityId: persona1.id },
    { actionType: 'create', entityType: 'persona', entityId: persona2.id },
    { actionType: 'create', entityType: 'knowledge', entityId: knowledge1.id },
    { actionType: 'create', entityType: 'agent', entityId: agent1.id },
    { actionType: 'publish', entityType: 'agent', entityId: agent1.id },
  ];

  actions.forEach((action, i) => {
    auditLogs.create({
      workspaceId,
      actorEmail: userEmail,
      actionType: action.actionType,
      entityType: action.entityType,
      entityId: action.entityId,
      before: null,
      after: { seeded: true },
    });
  });

  return { agents: [agent1, agent2], personas: [persona1, persona2] };
};
