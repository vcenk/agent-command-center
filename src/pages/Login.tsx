import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = login(email);
    setIsLoading(false);
    
    if (user.workspaceId) {
      navigate('/dashboard');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-glow">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Agent Cockpit</h1>
        </div>

        {/* Login Card */}
        <div className="glass rounded-xl p-8 shadow-elevated">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to manage your AI agents
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              variant="glow"
              className="w-full" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo mode: Enter any email to sign in
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
