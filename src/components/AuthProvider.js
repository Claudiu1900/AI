'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const initDone = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the SINGLE source of truth.
    // This avoids the race condition between getUser() and onAuthStateChange
    // that caused the loading state to hang indefinitely.
    // INITIAL_SESSION fires immediately with the cached session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Fetch profile in background — do NOT await here.
          // This prevents a hung profile fetch from blocking the entire app.
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        // Always mark loading as done immediately.
        // Profile loads in background; pages use profileLoading to wait if needed.
        if (!initDone.current) {
          initDone.current = true;
          setLoading(false);
        }
      }
    );

    // Safety timeout: if INITIAL_SESSION never fires (broken Supabase connection),
    // stop loading after 3 seconds so the user sees something instead of infinite spinner.
    const timeout = setTimeout(() => {
      if (mounted && !initDone.current) {
        console.warn('Auth init timeout — forcing loading to false');
        initDone.current = true;
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const value = useMemo(() => ({
    user, profile, loading, profileLoading, signOut, fetchProfile, supabase
  }), [user, profile, loading, profileLoading, signOut, fetchProfile, supabase]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
