import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Role } from '@/types';
import { workspacesApi, Workspace as ApiWorkspace } from '@/lib/api';

interface Profile {
  id: string;
  email: string;
  workspace_id: string | null;
}

interface UserRole {
  role: Role;
  workspace_id: string;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  workspace: Workspace | null;
  userRole: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  setWorkspace: (workspace: Workspace, role?: Role) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  hasPermission: (action: 'read' | 'write' | 'admin' | 'billing') => boolean;
  refreshProfile: () => Promise<void>;
  fetchUserWorkspaces: () => Promise<Array<{ workspace: Workspace; role: Role }>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const fetchWorkspace = async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }
    return data;
  };

  const fetchUserRole = async (userId: string, workspaceId: string): Promise<Role | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data?.role as Role || null;
  };

  const fetchUserWorkspaces = async (): Promise<Array<{ workspace: Workspace; role: Role }>> => {
    if (!user) return [];

    try {
      const data = await workspacesApi.list();
      return data.map(item => ({
        workspace: item.workspace as Workspace,
        role: item.role as Role,
      }));
    } catch (error: unknown) {
      // Re-throw auth errors so callers can handle redirect
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 401 || status === 403) {
          throw error;
        }
      }
      console.error('Error fetching workspaces:', error);
      return [];
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);

      if (profileData.workspace_id) {
        const workspaceData = await fetchWorkspace(profileData.workspace_id);
        if (workspaceData) {
          setWorkspaceState(workspaceData);
          const role = await fetchUserRole(user.id, workspaceData.id);
          setUserRole(role);
        }
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Helper function to load user data with proper error handling
    const loadUserData = async (userId: string) => {
      try {
        const profileData = await fetchProfile(userId);
        if (!isMounted) return;

        if (profileData) {
          setProfile(profileData);

          if (profileData.workspace_id) {
            const workspaceData = await fetchWorkspace(profileData.workspace_id);
            if (!isMounted) return;

            if (workspaceData) {
              setWorkspaceState(workspaceData);
              const role = await fetchUserRole(userId, workspaceData.id);
              if (!isMounted) return;
              setUserRole(role);
            }
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading user data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              loadUserData(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setWorkspaceState(null);
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWorkspaceState(null);
    setUserRole(null);
  };

  const setWorkspace = async (ws: Workspace, role: Role = 'OWNER') => {
    if (!user) return;

    try {
      // Use API to switch workspace (handles user_roles via service role)
      const result = await workspacesApi.switch(ws.id);
      setWorkspaceState(result.workspace as Workspace);
      setUserRole(result.role as Role);
      setProfile((prev) => prev ? { ...prev, workspace_id: ws.id } : null);
    } catch (error) {
      console.error('Failed to set workspace:', error);
      // Fallback: just update local state
      setWorkspaceState(ws);
      setUserRole(role);
      setProfile((prev) => prev ? { ...prev, workspace_id: ws.id } : null);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;

    try {
      const result = await workspacesApi.switch(workspaceId);
      setWorkspaceState(result.workspace as Workspace);
      setUserRole(result.role as Role);
      setProfile((prev) => prev ? { ...prev, workspace_id: workspaceId } : null);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error('User not authenticated');

    // Use API to create workspace (handles user_roles via service role)
    const workspace = await workspacesApi.create(name);

    const wsData: Workspace = {
      id: workspace.id,
      name: workspace.name,
      created_at: workspace.created_at,
    };

    setWorkspaceState(wsData);
    setUserRole('OWNER');
    setProfile((prev) => prev ? { ...prev, workspace_id: workspace.id } : null);

    return wsData;
  };

  const hasPermission = (action: 'read' | 'write' | 'admin' | 'billing'): boolean => {
    if (!user || !userRole) return false;

    switch (action) {
      case 'read':
        return true; // All roles can read
      case 'write':
        return userRole === 'OWNER' || userRole === 'MANAGER';
      case 'admin':
        return userRole === 'OWNER';
      case 'billing':
        return userRole === 'OWNER';
      default:
        return false;
    }
  };

  // isAuthenticated should only be true when we have both user AND a valid session
  const isAuthenticated = !!user && !!session?.access_token;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        workspace,
        userRole,
        isAuthenticated,
        isLoading,
        logout,
        setWorkspace,
        switchWorkspace,
        createWorkspace,
        hasPermission,
        refreshProfile,
        fetchUserWorkspaces,
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