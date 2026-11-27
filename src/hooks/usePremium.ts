import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';


export type FeatureTier = 'free' | 'pro' | 'business';

// Which tier is needed for each feature
export const FEATURE_TIERS: Record<string, FeatureTier> = {
  generator: 'free',
  saved_prompts: 'free',
  templates: 'free',
  history: 'free',
  chat: 'free',
  image_analyzer: 'free',
  text_tools: 'free',
  dashboard: 'free',
  marketplace: 'free',
  my_templates: 'free',
  ab_testing: 'business',
  api_export: 'business',
  prompt_chains: 'business',
};

const TIER_ORDER: Record<FeatureTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

const TIER_LIMITS = {
  free: { daily: 10, monthly: 100 },
  pro: { daily: 100, monthly: 3000 },
  business: { daily: 1000, monthly: 50000 },
};

export function usePremium() {
  const { user } = useAuth();
  const { tier, subscribed, loading: subLoading } = useSubscription();

  // Tier is synchronized server-side by the check-subscription edge function.
  // Client cannot modify usage_limits.tier directly (RLS-restricted).


  const hasAccess = (feature: string): boolean => {
    const requiredTier = FEATURE_TIERS[feature] || 'free';
    return TIER_ORDER[tier] >= TIER_ORDER[requiredTier];
  };

  const getRequiredTier = (feature: string): FeatureTier => {
    return FEATURE_TIERS[feature] || 'free';
  };

  return {
    tier,
    subscribed,
    loading: subLoading,
    hasAccess,
    getRequiredTier,
    isPro: TIER_ORDER[tier] >= TIER_ORDER.pro,
    isBusiness: TIER_ORDER[tier] >= TIER_ORDER.business,
  };
}
