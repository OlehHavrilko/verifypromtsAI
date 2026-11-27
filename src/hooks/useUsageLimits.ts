import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UsageLimits {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'business';
  daily_generations_used: number;
  daily_limit: number;
  monthly_generations_used: number;
  monthly_limit: number;
  last_daily_reset: string;
  last_monthly_reset: string;
  created_at: string;
  updated_at: string;
}

const TIER_LIMITS = {
  free: { daily: 10, monthly: 100 },
  pro: { daily: 100, monthly: 3000 },
  business: { daily: 1000, monthly: 50000 }
};

export function useUsageLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('ensure_usage_limits');
      if (rpcError) throw rpcError;
      setLimits(data as unknown as UsageLimits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch limits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const incrementUsage = useCallback(async () => {
    if (!user || !limits) return { error: 'Not ready' };

    if (limits.daily_generations_used >= limits.daily_limit) {
      return { error: 'daily_limit_reached' };
    }
    if (limits.monthly_generations_used >= limits.monthly_limit) {
      return { error: 'monthly_limit_reached' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('increment_usage');
      if (rpcError) {
        if (rpcError.message?.includes('daily_limit_reached')) return { error: 'daily_limit_reached' };
        if (rpcError.message?.includes('monthly_limit_reached')) return { error: 'monthly_limit_reached' };
        throw rpcError;
      }
      setLimits(data as unknown as UsageLimits);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update usage' };
    }
  }, [user, limits]);


  const canGenerate = useCallback(() => {
    if (!limits) return false;
    return limits.daily_generations_used < limits.daily_limit && 
           limits.monthly_generations_used < limits.monthly_limit;
  }, [limits]);

  const getRemainingDaily = useCallback(() => {
    if (!limits) return 0;
    return Math.max(0, limits.daily_limit - limits.daily_generations_used);
  }, [limits]);

  const getRemainingMonthly = useCallback(() => {
    if (!limits) return 0;
    return Math.max(0, limits.monthly_limit - limits.monthly_generations_used);
  }, [limits]);

  const getUsagePercent = useCallback(() => {
    if (!limits) return { daily: 0, monthly: 0 };
    return {
      daily: (limits.daily_generations_used / limits.daily_limit) * 100,
      monthly: (limits.monthly_generations_used / limits.monthly_limit) * 100
    };
  }, [limits]);

  useEffect(() => {
    if (user) {
      fetchLimits();
    }
  }, [user, fetchLimits]);

  return {
    limits,
    loading,
    error,
    fetchLimits,
    incrementUsage,
    canGenerate,
    getRemainingDaily,
    getRemainingMonthly,
    getUsagePercent,
    TIER_LIMITS
  };
}
