import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTierByProductId, type SubscriptionTier } from '@/lib/stripe/config';

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: 'free',
    subscriptionEnd: null,
    loading: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!session) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setState({
        subscribed: data.subscribed ?? false,
        tier: getTierByProductId(data.product_id),
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
    });
    
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const openCustomerPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
