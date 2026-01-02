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

  // Create sample call sessions
  const sampleTranscripts = [
    {
      direction: 'Inbound' as const,
      from: '+1 (555) 123-4567',
      to: '+1 (555) 888-9999',
      durationSec: 245,
      status: 'completed' as const,
      transcript: `
Agent: Thank you for calling Bright Smile Dental! This is Sarah, how may I help you today?

Caller: Hi, I'd like to schedule a cleaning appointment.

Agent: Of course! I'd be happy to help you schedule a cleaning. Are you an existing patient with us, or will this be your first visit?

Caller: I'm a new patient.

Agent: Wonderful, welcome! Let me find some available times for you. Do you prefer mornings or afternoons?

Caller: Mornings work better for me.

Agent: Perfect. I have availability next Tuesday at 9:00 AM or Thursday at 10:30 AM. Which works better for you?

Caller: Tuesday at 9 sounds good.

Agent: Excellent! I've scheduled you for Tuesday, January 14th at 9:00 AM for a new patient cleaning appointment. Please arrive 15 minutes early to complete your paperwork, and don't forget to bring your ID and insurance card. Is there anything else I can help you with?

Caller: No, that's all. Thank you!

Agent: You're welcome! We look forward to seeing you Tuesday. Have a great day!
      `,
      summary: 'New patient scheduled for cleaning appointment on Tuesday at 9:00 AM. Caller was reminded to arrive early and bring ID and insurance card.',
      outcomes: ['appointment_scheduled', 'new_patient'],
      escalation: 'none' as const,
    },
    {
      direction: 'Inbound' as const,
      from: '+1 (555) 234-5678',
      to: '+1 (555) 888-9999',
      durationSec: 180,
      status: 'completed' as const,
      transcript: `
Agent: Hello! Thank you for reaching out to Premium Properties. I'm Alex, how can I help you find your perfect home today?

Caller: I'm looking for a 2-bedroom apartment downtown.

Agent: Great choice! Downtown has some wonderful options. Do you have a budget in mind?

Caller: Around $3,000 per month.

Agent: Perfect. I have a lovely 2 bed, 2 bath at Skyline Apartments available immediately. It's 1,200 square feet with modern finishes and amazing city views. It's pet-friendly and listed at $2,800 per month. Would you like to schedule a viewing?

Caller: That sounds great! Can I see it this weekend?

Agent: Absolutely! I have Saturday at 2:00 PM or Sunday at 11:00 AM available. Which works better?

Caller: Saturday at 2 works.

Agent: Wonderful! I've scheduled your viewing at Skyline Apartments, Unit 2401, for Saturday at 2:00 PM. I'll send you a confirmation with the address and parking instructions. Is there anything else you'd like to know about the property?

Caller: No, I think that covers it. Thanks!

Agent: My pleasure! See you Saturday. Have a great day!
      `,
      summary: 'Prospective tenant scheduled viewing for Skyline Apartments 2BR unit on Saturday at 2:00 PM. Budget $3,000/month, interested in downtown area.',
      outcomes: ['viewing_scheduled', 'qualified_lead'],
      escalation: 'none' as const,
    },
    {
      direction: 'Inbound' as const,
      from: '+1 (555) 345-6789',
      to: '+1 (555) 888-9999',
      durationSec: 320,
      status: 'transferred' as const,
      transcript: `
Agent: Thank you for calling Bright Smile Dental! This is Sarah, how may I help you today?

Caller: I'm having severe tooth pain and I think it's an emergency.

Agent: I'm so sorry to hear you're in pain. Let me help you right away. Can you describe the pain? Is it a sharp pain or more of a throbbing sensation?

Caller: It's throbbing and it's been getting worse all day. I can barely eat.

Agent: I understand, that sounds very uncomfortable. Given the severity, I want to make sure you get the best care possible. Let me transfer you to our office manager who can get you in for an emergency appointment right away. Please hold for just a moment.

[Call transferred to office manager]
      `,
      summary: 'Patient called with severe tooth pain emergency. Following escalation protocol, call was transferred to office manager for immediate emergency appointment scheduling.',
      outcomes: ['emergency_call', 'escalated'],
      escalation: 'transferred' as const,
    },
  ];

  sampleTranscripts.forEach((t, i) => {
    callSessions.create({
      workspaceId,
      agentId: i < 2 ? (i === 0 ? agent1.id : agent2.id) : agent1.id,
      recordingUrl: `https://recordings.example.com/call-${generateId()}.mp3`,
      ...t,
      startTime: new Date(Date.now() - (i + 1) * 3600000 * 24).toISOString(),
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
