import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone } from 'lucide-react';

const CallDetail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Phone className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Call not found</h2>
      <p className="text-muted-foreground mb-4">The call you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/dashboard/calls')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Calls
      </Button>
    </div>
  );
};

export default CallDetail;