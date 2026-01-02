import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { workspace, user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace</p>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <Badge className="capitalize">{user?.role?.toLowerCase() || 'user'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Workspace
          </CardTitle>
          <CardDescription>Current workspace settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Workspace Name</p>
            <p className="font-medium">{workspace?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Workspace ID</p>
            <p className="font-mono text-sm text-muted-foreground">{workspace?.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;