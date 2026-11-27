// Stripe product/price mapping for PromptLab tiers.
// Create the products in your own Stripe account and pass the IDs through
// VITE_STRIPE_PRICE_PRO / VITE_STRIPE_PRICE_BUSINESS (see .env.example).
// The checkout edge function resolves the price on the server, so a missing ID
// only disables the upgrade button instead of breaking the page.

export const STRIPE_TIERS = {
  pro: {
    product_id: (import.meta.env.VITE_STRIPE_PRODUCT_PRO as string | undefined) ?? "",
    price_id: (import.meta.env.VITE_STRIPE_PRICE_PRO as string | undefined) ?? "",
    price: 12,
  },
  business: {
    product_id: (import.meta.env.VITE_STRIPE_PRODUCT_BUSINESS as string | undefined) ?? "",
    price_id: (import.meta.env.VITE_STRIPE_PRICE_BUSINESS as string | undefined) ?? "",
    price: 39,
  },
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'business';

export function getTierByProductId(productId: string | null): SubscriptionTier {
  if (!productId) return 'free';
  if (productId === STRIPE_TIERS.pro.product_id) return 'pro';
  if (productId === STRIPE_TIERS.business.product_id) return 'business';
  return 'free';
}
