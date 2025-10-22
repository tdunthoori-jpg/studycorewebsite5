import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Admin authentication and helper functions
 */

export const ADMIN_EMAIL = 'admin@system.local';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'cCAqGmGLHof4ypEa';

/**
 * Check if the current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Admin login function
 */
export async function adminLogin(email: string = ADMIN_EMAIL, password: string = ADMIN_PASSWORD) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Admin login failed: ' + error.message);
      return { success: false, error };
    }

    // Verify the user is actually an admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error('Access denied. Admin privileges required.');
      return { success: false, error: new Error('Not an admin user') };
    }

    toast.success('Admin login successful');
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Admin login error:', error);
    toast.error('Admin login failed');
    return { success: false, error };
  }
}

/**
 * Get pending approvals count
 */
export async function getPendingApprovalsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
      .in('role', ['student', 'tutor']);

    if (error) {
      console.error('Error getting pending approvals count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting pending approvals count:', error);
    return 0;
  }
}

/**
 * Approve a user
 */
export async function approveUser(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { data, error } = await supabase.rpc('approve_user', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error approving user:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving user:', error);
    return { success: false, error };
  }
}

/**
 * Reject a user
 */
export async function rejectUser(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { data, error } = await supabase.rpc('reject_user', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error rejecting user:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting user:', error);
    return { success: false, error };
  }
}

/**
 * Get all pending users for approval
 */
export async function getPendingUsers() {
  try {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting pending users:', error);
      return { success: false, data: [], error };
    }

    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error('Error getting pending users:', error);
    return { success: false, data: [], error };
  }
}

/**
 * Get recently approved users
 */
export async function getRecentlyApprovedUsers() {
  try {
    const { data, error } = await supabase
      .from('recent_approvals')
      .select('*')
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Error getting recent approvals:', error);
      return { success: false, data: [], error };
    }

    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error('Error getting recent approvals:', error);
    return { success: false, data: [], error };
  }
}