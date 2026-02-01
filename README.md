# Agent Command Center

A comprehensive AI Agent management platform for building, deploying, and monitoring conversational AI agents across multiple channels.

## Overview

Agent Command Center is a multi-tenant SaaS application that enables businesses to create and manage AI-powered conversational agents. Built with modern web technologies and a serverless architecture.

## Features

- **Agent Management** - Create, configure, and deploy AI agents
- **Persona System** - Define agent personalities, tones, and behaviors
- **Knowledge Base** - Upload documents and text for RAG-powered responses
- **Multi-Channel Support** - Web chat, phone, SMS, WhatsApp
- **Lead Capture** - Automatic contact extraction from conversations
- **Analytics Dashboard** - Track conversations, leads, and performance
- **Billing Integration** - Stripe-powered subscription management
- **Team Collaboration** - Role-based access control (Owner, Manager, Viewer)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| State | TanStack React Query |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth |
| Payments | Stripe |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vcenk/agent-command-center.git
cd agent-command-center

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
AgentCenter/
├── docs/                    # Documentation
├── public/                  # Static assets
├── src/
│   ├── components/          # React components
│   │   ├── layout/          # Layout components
│   │   ├── shared/          # Shared business components
│   │   └── ui/              # shadcn/ui components
│   ├── constants/           # Application constants
│   ├── contexts/            # React contexts
│   ├── data/                # Templates and demo data
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Third-party integrations
│   ├── lib/                 # Utility functions
│   ├── pages/               # Page components
│   ├── services/            # API services
│   └── types/               # TypeScript types
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Database migrations
└── package.json
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [Getting Started](docs/GETTING_STARTED.md) | Setup and installation guide |
| [Project Structure](docs/PROJECT_STRUCTURE.md) | Detailed file organization |
| [Architecture](docs/ARCHITECTURE.md) | System design and patterns |
| [Database](docs/DATABASE.md) | Schema and data model |
| [API](docs/API.md) | Edge Functions reference |
| [Hooks](docs/HOOKS.md) | Custom React hooks |
| [Components](docs/COMPONENTS.md) | UI component library |
| [Rules](docs/RULES.md) | Coding standards |

## Environment Variables

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

---

Built with [React](https://react.dev), [Supabase](https://supabase.com), and [shadcn/ui](https://ui.shadcn.com)
