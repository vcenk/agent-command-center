import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CallsList: React.FC = () => {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { data: agents } = useAgents();

  if (!workspace) return null;

  const hasLiveAgents = agents?.some(a => a.status === 'live');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calls</h1>
          <p className="text-muted-foreground">View and manage call sessions</p>
        </div>
      </div>

      {/* Empty State */}
      <Card className="glass border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Phone className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No calls recorded</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Call history will appear here once your agents handle phone interactions.
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Info className="w-4 h-4" />
            <p>Call tracking requires phone channel integration</p>
          </div>

          {!hasLiveAgents && (
            <Button onClick={() => navigate('/dashboard/agents')} variant="outline">
              View Agents
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallsList;