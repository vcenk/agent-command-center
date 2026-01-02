import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, ArrowRight, Building2, Sparkles, Plus } from 'lucide-react';
import { Role } from '@/types';

interface WorkspaceOption {
  workspace: {
    id: string;
    name: string;
    created_at: string;
  };
  role: Role;
}

const Onboarding: React.FC = () => {
  const [step, setStep] = useState<'loading' | 'select' | 'create'>('loading');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingWorkspaces, setExistingWorkspaces] = useState<WorkspaceOption[]>([]);
  const { createWorkspace, setWorkspace, fetchUserWorkspaces, user, workspace } = useAuth();
  const navigate = useNavigate();

  // If user already has a workspace set, redirect to dashboard
  useEffect(() => {
    if (workspace) {
      navigate('/dashboard');
    }
  }, [workspace, navigate]);

  // Check for existing workspaces on mount
  useEffect(() => {
    const checkExistingWorkspaces = async () => {
      const workspaces = await fetchUserWorkspaces();
      setExistingWorkspaces(workspaces);
      
      if (workspaces.length > 0) {
        // If user has exactly one workspace, auto-select it
        if (workspaces.length === 1) {
          await setWorkspace(workspaces[0].workspace, workspaces[0].role);
          navigate('/dashboard');
        } else {
          setStep('select');
        }
      } else {
        setStep('create');
      }
    };

    if (user) {
      checkExistingWorkspaces();
    }
  }, [user, fetchUserWorkspaces, setWorkspace, navigate]);

  const handleSelectWorkspace = async (ws: WorkspaceOption) => {
    setIsLoading(true);
    try {
      await setWorkspace(ws.workspace, ws.role);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error selecting workspace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) return;
    
    setIsLoading(true);
    try {
      await createWorkspace(workspaceName);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

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
          {step === 'select' && (
            <div className="animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground text-center mb-2">
                Welcome back, {user?.email?.split('@')[0]}!
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                Select a workspace to continue
              </p>

              <div className="space-y-3 mb-6">
                {existingWorkspaces.map((ws) => (
                  <button
                    key={ws.workspace.id}
                    onClick={() => handleSelectWorkspace(ws)}
                    disabled={isLoading}
                    className="w-full p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {ws.workspace.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Role: {ws.role}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-6"
                onClick={() => setStep('create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create new workspace
              </Button>
            </div>
          )}

          {step === 'create' && (
            <form onSubmit={handleCreateWorkspace} className="animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                {existingWorkspaces.length > 0 ? 'Create a new workspace' : 'Create your first workspace'}
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

                {existingWorkspaces.length > 0 && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setStep('select')}
                  >
                    Back to workspace selection
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;