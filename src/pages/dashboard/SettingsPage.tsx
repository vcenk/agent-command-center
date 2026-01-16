import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import {
  User,
  Building2,
  Bell,
  Key,
  Shield,
  Copy,
  RefreshCw,
  AlertTriangle,
  Mail,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { workspace, user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences (mock state)
  const [notifications, setNotifications] = useState({
    emailNewLead: true,
    emailDailySummary: false,
    emailWeeklyReport: true,
    pushNewSession: true,
    pushAgentErrors: true,
  });

  // Mock API key
  const [apiKey] = useState('sk_live_****************************');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Profile updated successfully');
    setIsSaving(false);
  };

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Workspace settings updated');
    setIsSaving(false);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk_live_1234567890abcdef1234567890abcdef');
    toast.success('API key copied to clipboard');
  };

  const handleRegenerateApiKey = () => {
    toast.info('API key regeneration is disabled in demo mode');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your account and workspace preferences"
      />

      {/* Profile Section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge className="capitalize mt-1">{user?.role?.toLowerCase() || 'user'}</Badge>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Workspace
          </CardTitle>
          <CardDescription>Current workspace settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace Name</Label>
            <Input
              id="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>
          <div className="space-y-2">
            <Label>Workspace ID</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-muted font-mono text-sm text-muted-foreground">
                {workspace?.id}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(workspace?.id || '');
                  toast.success('Workspace ID copied');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveWorkspace} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Workspace'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email Notifications
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Lead Captured</p>
                  <p className="text-xs text-muted-foreground">Get notified when a new lead is captured</p>
                </div>
                <Switch
                  checked={notifications.emailNewLead}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNewLead: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Daily Summary</p>
                  <p className="text-xs text-muted-foreground">Receive a daily summary of activity</p>
                </div>
                <Switch
                  checked={notifications.emailDailySummary}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailDailySummary: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weekly Report</p>
                  <p className="text-xs text-muted-foreground">Get a weekly performance report</p>
                </div>
                <Switch
                  checked={notifications.emailWeeklyReport}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailWeeklyReport: checked }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              In-App Notifications
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Chat Session</p>
                  <p className="text-xs text-muted-foreground">Alert when a new session starts</p>
                </div>
                <Switch
                  checked={notifications.pushNewSession}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNewSession: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Agent Errors</p>
                  <p className="text-xs text-muted-foreground">Get alerted about agent issues</p>
                </div>
                <Switch
                  checked={notifications.pushAgentErrors}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushAgentErrors: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Keys
          </CardTitle>
          <CardDescription>Manage API access for integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                <Shield className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyApiKey}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key to authenticate API requests. Keep it secret!
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleRegenerateApiKey}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Usage
          </CardTitle>
          <CardDescription>Your current plan usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Messages</p>
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-xs text-muted-foreground">of 10,000 / month</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Active Agents</p>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">of 5 included</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Storage</p>
              <p className="text-2xl font-bold">2.5 MB</p>
              <p className="text-xs text-muted-foreground">of 100 MB included</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <p className="font-medium text-foreground">Delete Workspace</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => toast.error('Workspace deletion is disabled in demo mode')}
            >
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
