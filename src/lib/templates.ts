export interface TemplatePersona {
  name: string;
  roleTitle: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  styleNotes: string;
  guardrails: string[];
  fallbackPolicy: 'apologize' | 'escalate' | 'retry' | 'transfer';
  greetingScript: string;
  escalationRules: string;
}

export interface TemplateKnowledgeBase {
  name: string;
  chunks: string[];
}

export interface TemplateAgent {
  industry: 'healthcare' | 'retail' | 'finance' | 'realestate' | 'hospitality' | 'other';
  channels: {
    webChat: boolean;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  goals: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  defaultPersona: TemplatePersona;
  defaultKnowledgeBase: TemplateKnowledgeBase;
  defaultAgent: TemplateAgent;
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'website-assistant',
    name: 'Website Business Assistant',
    category: 'General',
    description: 'General-purpose assistant for answering website visitor questions',
    tags: ['Web'],
    defaultPersona: {
      name: 'Website Assistant',
      roleTitle: 'Customer Support Specialist',
      tone: 'friendly',
      styleNotes: 'Be helpful, concise, and guide visitors to the information they need. Use a warm but professional tone.',
      guardrails: [
        'Never provide pricing without confirmation from knowledge base',
        'Avoid technical jargon unless the visitor uses it first',
        'Do not make promises about delivery times or availability',
      ],
      fallbackPolicy: 'escalate',
      greetingScript: 'Hi there! 👋 Welcome to {businessName}. How can I help you today?',
      escalationRules: 'Transfer to human support if unable to answer after 2 attempts or if customer expresses frustration.',
    },
    defaultKnowledgeBase: {
      name: '{businessName} Website Info',
      chunks: [
        'About Us: {businessName} is dedicated to providing excellent service to our customers. We pride ourselves on quality, reliability, and customer satisfaction.',
        'Business Hours: We are open Monday through Friday, 9:00 AM to 5:00 PM. Weekend support is available via email.',
        'Contact Information: You can reach us through this chat, by email at info@{businessName}.com, or by phone during business hours.',
        'FAQ - Shipping: We offer standard shipping (5-7 business days) and express shipping (2-3 business days). Free shipping on orders over $50.',
        'FAQ - Returns: We accept returns within 30 days of purchase. Items must be in original condition with tags attached.',
        'FAQ - Payment: We accept all major credit cards, PayPal, and Apple Pay. All transactions are secured with SSL encryption.',
      ],
    },
    defaultAgent: {
      industry: 'other',
      channels: { webChat: true, phone: false, sms: false, whatsapp: false },
      goals: 'Help website visitors find information, answer FAQs, and collect leads for follow-up.',
    },
  },
  {
    id: 'whatsapp-lead-capture',
    name: 'WhatsApp Lead Capture Assistant',
    category: 'Sales',
    description: 'Capture and qualify leads through WhatsApp conversations',
    tags: ['WhatsApp'],
    defaultPersona: {
      name: 'Lead Capture Assistant',
      roleTitle: 'Sales Assistant',
      tone: 'casual',
      styleNotes: 'Be conversational and friendly. Focus on understanding customer needs and collecting contact information naturally.',
      guardrails: [
        'Never be pushy or aggressive about collecting information',
        'Avoid sending multiple messages in a row without a response',
        'Do not share pricing without qualifying the lead first',
      ],
      fallbackPolicy: 'apologize',
      greetingScript: "Hey! 👋 Thanks for reaching out to {businessName}. I'd love to learn more about what you're looking for. What brings you here today?",
      escalationRules: 'Flag high-value leads (budget >$5000 or enterprise inquiries) for immediate sales team follow-up.',
    },
    defaultKnowledgeBase: {
      name: '{businessName} Lead Qualification',
      chunks: [
        'Qualification Question 1: What specific problem or challenge are you trying to solve? Understanding the pain point helps us recommend the right solution.',
        "Qualification Question 2: What's your timeline for making a decision? This helps us prioritize and provide relevant information.",
        'Qualification Question 3: Have you worked with similar solutions before? This helps us understand your experience level.',
        'Lead Scoring - Hot Lead: Ready to buy within 1 month, has clear budget, is the decision-maker. Priority: Immediate sales follow-up.',
        'Lead Scoring - Warm Lead: Interested but researching options, timeline 1-3 months. Priority: Nurture with relevant content.',
        'Lead Scoring - Cold Lead: Just browsing, no immediate need, gathering information. Priority: Add to newsletter, follow up in 30 days.',
        'Information to Collect: Full name, email address, phone (optional), company name and size, budget range, timeline.',
      ],
    },
    defaultAgent: {
      industry: 'retail',
      channels: { webChat: false, phone: false, sms: false, whatsapp: true },
      goals: 'Qualify incoming leads, collect contact information, and route hot leads to the sales team for immediate follow-up.',
    },
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking Assistant',
    category: 'Services',
    description: 'Help customers schedule appointments and manage bookings',
    tags: ['Web', 'SMS-ready'],
    defaultPersona: {
      name: 'Booking Coordinator',
      roleTitle: 'Booking Coordinator',
      tone: 'professional',
      styleNotes: 'Be efficient and clear about availability. Always confirm booking details before finalizing.',
      guardrails: [
        'Never double-book time slots',
        'Do not share other customer information or booking details',
        'Always send confirmation details after booking',
      ],
      fallbackPolicy: 'transfer',
      greetingScript: "Hello! I'm here to help you schedule an appointment with {businessName}. What type of service are you looking for?",
      escalationRules: 'If calendar integration fails, collect contact info and have staff follow up within 2 hours.',
    },
    defaultKnowledgeBase: {
      name: '{businessName} Booking Guide',
      chunks: [
        'Available Services: Consultation (30 min), Standard Service (1 hour), Extended Session (2 hours). Pricing varies by service type.',
        'Booking Process: 1) Select your preferred service, 2) Choose an available date and time, 3) Provide your contact information, 4) Receive confirmation via email.',
        'Cancellation Policy: Please cancel at least 24 hours in advance. Late cancellations may incur a fee. Rescheduling is free with 12+ hours notice.',
        'Preparation Guidelines: Please arrive 10 minutes early. Bring any relevant documents or information. Wear comfortable clothing if applicable.',
        'Payment Information: Payment is due at time of service. We accept credit cards, debit cards, and cash. Tips are appreciated but not required.',
      ],
    },
    defaultAgent: {
      industry: 'other',
      channels: { webChat: true, phone: false, sms: false, whatsapp: false },
      goals: 'Schedule appointments, confirm bookings, handle rescheduling requests, and send appointment reminders.',
    },
  },
];

export const getTemplateById = (id: string): AgentTemplate | undefined => {
  return agentTemplates.find(t => t.id === id);
};

export const replaceTemplateVariables = (text: string, variables: { businessName: string }): string => {
  return text.replace(/{businessName}/g, variables.businessName || 'Your Business');
};
