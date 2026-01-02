import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Workspace, Role } from '@/types';
import { users, workspaces } from '@/lib/mockDb';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  isAuthenticated: boolean;
  login: (email: string) => User;
  logout: () => void;
  setWorkspace: (workspace: Workspace) => void;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Workspace;
  hasPermission: (action: 'read' | 'write' | 'admin' | 'billing') => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'agent_cockpit_session';

interface SessionData {
  userId: string;
  workspaceId: string | null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);

  // Load session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session: SessionData = JSON.parse(stored);
        const storedUser = users.getById(session.userId);
        if (storedUser) {
          setUser(storedUser);
          if (session.workspaceId) {
            const storedWorkspace = workspaces.getById(session.workspaceId);
            if (storedWorkspace) {
              setWorkspaceState(storedWorkspace);
            }
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Save session on changes
  useEffect(() => {
    if (user) {
      const session: SessionData = {
        userId: user.id,
        workspaceId: workspace?.id || null,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [user, workspace]);

  const login = (email: string): User => {
    let existingUser = users.getByEmail(email);
    
    if (!existingUser) {
      existingUser = users.create({
        email,
        workspaceId: null,
        role: 'OWNER',
      });
    }

    setUser(existingUser);
    
    if (existingUser.workspaceId) {
      const ws = workspaces.getById(existingUser.workspaceId);
      if (ws) {
        setWorkspaceState(ws);
      }
    }

    return existingUser;
  };

  const logout = () => {
    setUser(null);
    setWorkspaceState(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const setWorkspace = (ws: Workspace) => {
    setWorkspaceState(ws);
    if (user) {
      users.update(user.id, { workspaceId: ws.id });
      setUser({ ...user, workspaceId: ws.id });
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.getById(workspaceId);
    if (ws && user) {
      setWorkspaceState(ws);
      users.update(user.id, { workspaceId });
      setUser({ ...user, workspaceId });
    }
  };

  const createWorkspace = (name: string): Workspace => {
    const newWorkspace = workspaces.create({ name });
    setWorkspace(newWorkspace);
    return newWorkspace;
  };

  const hasPermission = (action: 'read' | 'write' | 'admin' | 'billing'): boolean => {
    if (!user) return false;
    
    const role = user.role;
    
    switch (action) {
      case 'read':
        return true; // All roles can read
      case 'write':
        return role === 'OWNER' || role === 'MANAGER';
      case 'admin':
        return role === 'OWNER';
      case 'billing':
        return role === 'OWNER';
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        isAuthenticated: !!user,
        login,
        logout,
        setWorkspace,
        switchWorkspace,
        createWorkspace,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
