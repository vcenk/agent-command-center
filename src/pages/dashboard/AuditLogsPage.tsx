import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Info } from 'lucide-react';

const AuditLogsPage: React.FC = () => {
  const { workspace } = useAuth();
  if (!workspace) return null;

  // Note: Audit logs are not yet stored in Supabase - this is a placeholder
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">Track all changes made in your workspace</p>
      </div>
      
      <Card className="glass border-border/50">
        <CardContent className="py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No audit logs yet</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <p>Audit logs will be recorded as you make changes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;