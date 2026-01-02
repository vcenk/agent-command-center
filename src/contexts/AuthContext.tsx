import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Role } from '@/types';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then((profileData) => {
              if (profileData) {
                setProfile(profileData);

                if (profileData.workspace_id) {
                  fetchWorkspace(profileData.workspace_id).then((workspaceData) => {
                    if (workspaceData) {
                      setWorkspaceState(workspaceData);
                      fetchUserRole(session.user.id, workspaceData.id).then((role) => {
                        setUserRole(role);
                      });
                    }
                  });
                }
              }
              setIsLoading(false);
            });
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          if (profileData) {
            setProfile(profileData);

            if (profileData.workspace_id) {
              fetchWorkspace(profileData.workspace_id).then((workspaceData) => {
                if (workspaceData) {
                  setWorkspaceState(workspaceData);
                  fetchUserRole(session.user.id, workspaceData.id).then((role) => {
                    setUserRole(role);
                    setIsLoading(false);
                  });
                } else {
                  setIsLoading(false);
                }
              });
            } else {
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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

    // Update profile with workspace
    await supabase
      .from('profiles')
      .update({ workspace_id: ws.id })
      .eq('id', user.id);

    // Add user role for this workspace (use insert, handle conflict)
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          workspace_id: ws.id,
          role: role,
        },
        { onConflict: 'user_id,workspace_id' }
      );

    if (roleError) {
      console.error('Failed to upsert user role:', roleError);
    }

    setWorkspaceState(ws);
    setUserRole(role);
    setProfile((prev) => prev ? { ...prev, workspace_id: ws.id } : null);
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;

    const workspaceData = await fetchWorkspace(workspaceId);
    if (workspaceData) {
      await supabase
        .from('profiles')
        .update({ workspace_id: workspaceId })
        .eq('id', user.id);

      const role = await fetchUserRole(user.id, workspaceId);
      setWorkspaceState(workspaceData);
      setUserRole(role);
      setProfile((prev) => prev ? { ...prev, workspace_id: workspaceId } : null);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error('User not authenticated');
    
    // Create the workspace
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Insert user role as OWNER - this is critical for RLS to work
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        workspace_id: data.id,
        role: 'OWNER',
      });

    if (roleError) {
      console.error('Failed to create user role:', roleError);
      // Still continue but log the error
    }

    // Update profile with workspace
    await supabase
      .from('profiles')
      .update({ workspace_id: data.id })
      .eq('id', user.id);

    setWorkspaceState(data);
    setUserRole('OWNER');
    setProfile((prev) => prev ? { ...prev, workspace_id: data.id } : null);
    
    return data;
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        workspace,
        userRole,
        isAuthenticated: !!user,
        isLoading,
        logout,
        setWorkspace,
        switchWorkspace,
        createWorkspace,
        hasPermission,
        refreshProfile,
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