import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { seedDemoData } from '@/lib/demoData';
import { resetDb } from '@/lib/mockDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SettingsPage: React.FC = () => {
  const { workspace, user } = useAuth();
  const { toast } = useToast();

  const handleSeedData = () => {
    if (!workspace || !user) return;
    seedDemoData(workspace.id, user.email);
    toast({ title: 'Demo data seeded!', description: 'Sample agents, personas, and calls have been created.' });
  };

  const handleResetData = () => {
    resetDb();
    toast({ title: 'Database reset', description: 'All data has been cleared. Refresh the page.' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace configuration</p>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
          <div><p className="text-sm text-muted-foreground">Role</p><Badge className="capitalize">{user?.role.toLowerCase()}</Badge></div>
          <div><p className="text-sm text-muted-foreground">Workspace</p><p className="font-medium">{workspace?.name}</p></div>
        </CardContent>
      </Card>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Demo Data</CardTitle>
          <CardDescription>Populate your workspace with sample data for testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="glow" onClick={handleSeedData}><Sparkles className="w-4 h-4 mr-2" />Seed Demo Data</Button>
          <Button variant="destructive" onClick={handleResetData}><Trash2 className="w-4 h-4 mr-2" />Reset All Data</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
