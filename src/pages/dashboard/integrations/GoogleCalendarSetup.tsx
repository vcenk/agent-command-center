import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { secureApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
  CalendarDays,
  Timer,
  Globe,
} from 'lucide-react';

interface CalendarIntegration {
  id: string;
  provider: 'google_calendar';
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  config: {
    available_calendars?: { id: string; summary: string; primary?: boolean }[];
  };
  settings: {
    calendar_id?: string;
    calendar_name?: string;
    business_hours_start?: string;
    business_hours_end?: string;
    slot_duration_minutes?: number;
    buffer_minutes?: number;
    timezone?: string;
  };
  connected_at: string | null;
  error_message?: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

const GoogleCalendarSetup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [localSettings, setLocalSettings] = useState<CalendarIntegration['settings']>({});

  // Check for OAuth callback params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Google Calendar connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
    } else if (error) {
      toast.error(`Failed to connect Google Calendar: ${error}`);
    }
  }, [searchParams, queryClient]);

  // Fetch Calendar integration status
  const { data: integration, isLoading } = useQuery({
    queryKey: ['calendar-integration'],
    queryFn: () => secureApi.get<CalendarIntegration>('/integrations/google_calendar'),
  });

  // Initialize local settings when integration loads
  useEffect(() => {
    if (integration?.settings) {
      setLocalSettings(integration.settings);
    }
  }, [integration]);

  // Connect to Google Calendar mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await secureApi.post<{ authorizeUrl: string }>(
        '/integrations/google_calendar/connect',
        {}
      );
      return response;
    },
    onSuccess: (data) => {
      window.location.href = data.authorizeUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start Google Calendar connection');
      setIsConnecting(false);
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: CalendarIntegration['settings']) => {
      return secureApi.patch('/integrations/google_calendar/settings', { settings });
    },
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => secureApi.delete('/integrations/google_calendar'),
    onSuccess: () => {
      toast.success('Google Calendar disconnected');
      queryClient.invalidateQueries({ queryKey: ['calendar-integration'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate();
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
  };

  const handleCalendarChange = (calendarId: string) => {
    const calendar = integration?.config.available_calendars?.find(c => c.id === calendarId);
    setLocalSettings({
      ...localSettings,
      calendar_id: calendarId,
      calendar_name: calendar?.summary || 'Calendar',
    });
  };

  const isConnected = integration?.status === 'connected';
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(integration?.settings);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Google Calendar"
          description="Configure calendar sync for appointment booking"
          backLink="/dashboard/integrations"
        />
        <Card className="glass border-border/50 animate-pulse">
          <CardHeader>
            <div className="h-8 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Google Calendar"
        description="Sync appointments booked by your AI agents to Google Calendar"
        backLink="/dashboard/integrations"
      />

      {/* Connection Status Card */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>
                  {isConnected
                    ? `Syncing to ${localSettings.calendar_name || 'your calendar'}`
                    : 'Not connected'}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-muted text-muted-foreground'
              }
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect Google Calendar to automatically:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 pl-4">
                <li className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Create calendar events when customers book appointments
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Show real-time availability based on your calendar
                </li>
                <li className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  Respect buffer time between meetings
                </li>
              </ul>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Calendar Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Calendar
                </Label>
                <Select
                  value={localSettings.calendar_id || ''}
                  onValueChange={handleCalendarChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {integration?.config.available_calendars?.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary} {calendar.primary && '(Primary)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Events will be created in this calendar
                </p>
              </div>

              <Separator />

              {/* Business Hours */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Business Hours
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Start Time</Label>
                    <Input
                      type="time"
                      value={localSettings.business_hours_start || '09:00'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, business_hours_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">End Time</Label>
                    <Input
                      type="time"
                      value={localSettings.business_hours_end || '17:00'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, business_hours_end: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Appointments can only be booked during these hours
                </p>
              </div>

              <Separator />

              {/* Slot Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Default Appointment Duration
                </Label>
                <Select
                  value={String(localSettings.slot_duration_minutes || 30)}
                  onValueChange={(value) =>
                    setLocalSettings({ ...localSettings, slot_duration_minutes: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buffer Time */}
              <div className="space-y-2">
                <Label>Buffer Between Appointments</Label>
                <Select
                  value={String(localSettings.buffer_minutes || 15)}
                  onValueChange={(value) =>
                    setLocalSettings({ ...localSettings, buffer_minutes: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Time to leave between appointments for preparation
                </p>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </Label>
                <Input
                  value={localSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onChange={(e) => setLocalSettings({ ...localSettings, timezone: e.target.value })}
                  placeholder="America/New_York"
                />
                <p className="text-xs text-muted-foreground">
                  All times will be shown in this timezone
                </p>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        New appointments will no longer be synced to your calendar. Existing events will remain.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectMutation.mutate()}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>1. Availability:</strong> When a customer asks to book an appointment,
              your AI agent checks Google Calendar for free time slots.
            </p>
            <p>
              <strong>2. Booking:</strong> The customer selects a time, and the agent
              creates a calendar event with their contact details.
            </p>
            <p>
              <strong>3. Reminders:</strong> Both you and the customer receive email
              reminders before the appointment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleCalendarSetup;
