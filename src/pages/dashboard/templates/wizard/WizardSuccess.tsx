import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, MessageSquare, Code, Inbox } from 'lucide-react';

interface WizardSuccessProps {
  agentId: string;
  agentName: string;
  isPublished: boolean;
  onClose: () => void;
}

export const WizardSuccess: React.FC<WizardSuccessProps> = ({
  agentId,
  agentName,
  isPublished,
  onClose,
}) => {
  const navigate = useNavigate();

  const handleTestChat = () => {
    onClose();
    navigate(`/dashboard/test-chat?agent=${agentId}`);
  };

  const handleViewChannels = () => {
    onClose();
    navigate(`/dashboard/channels`);
  };

  const handleViewSessions = () => {
    onClose();
    navigate(`/dashboard/sessions`);
  };

  const handleViewAgent = () => {
    onClose();
    navigate(`/dashboard/agents/${agentId}/review`);
  };

  return (
    <div className="py-8 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-foreground">Agent Created!</h3>
        <p className="text-muted-foreground mt-1">
          <strong>{agentName}</strong> is ready{' '}
          {isPublished ? 'and live' : 'as a draft'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleTestChat}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Test in Test Chat</p>
              <p className="text-sm text-muted-foreground">Try your agent now</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleViewChannels}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Copy Web Embed Code</p>
              <p className="text-sm text-muted-foreground">Add chat to your site</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleViewSessions}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">View Sessions</p>
              <p className="text-sm text-muted-foreground">Monitor conversations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <Button variant="outline" onClick={handleViewAgent}>
          View Agent Details
        </Button>
      </div>
    </div>
  );
};
