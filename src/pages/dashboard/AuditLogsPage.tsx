import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auditLogs } from '@/lib/mockDb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

const AuditLogsPage: React.FC = () => {
  const { workspace } = useAuth();
  if (!workspace) return null;

  const logs = auditLogs.getByWorkspace(workspace.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">Track all changes made in your workspace</p>
      </div>
      {logs.length === 0 ? (
        <Card className="glass border-border/50"><CardContent className="py-16 text-center"><FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No audit logs yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="glass border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-md bg-secondary"><FileText className="w-4 h-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="font-medium">{log.actorEmail} <span className="text-muted-foreground">{log.actionType}d</span> {log.entityType}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <Badge variant="outline" className="capitalize">{log.actionType}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
