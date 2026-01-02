import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, ArrowRight, Building2, Sparkles } from 'lucide-react';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createWorkspace, user } = useAuth();
  const navigate = useNavigate();

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    createWorkspace(workspaceName);
    setIsLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-glow">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Agent Cockpit</h1>
        </div>

        {/* Onboarding Card */}
        <div className="glass rounded-xl p-8 shadow-elevated">
          {step === 1 && (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Welcome, {user?.email?.split('@')[0]}!
              </h2>
              <p className="text-muted-foreground mb-8">
                Let's set up your workspace to start building AI agents that handle calls, 
                chats, and more.
              </p>
              <Button variant="glow" onClick={() => setStep(2)}>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateWorkspace} className="animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                Create your workspace
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                This is where your team will manage agents, personas, and channels.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace name</Label>
                  <Input
                    id="workspace"
                    placeholder="Acme Corp"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="glow"
                  className="w-full" 
                  disabled={isLoading || !workspaceName}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Workspace
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-8">
            <div className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'bg-primary w-4' : 'bg-muted'}`} />
            <div className={`w-2 h-2 rounded-full transition-all ${step === 2 ? 'bg-primary w-4' : 'bg-muted'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
