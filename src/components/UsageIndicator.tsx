import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function UsageIndicator() {
  const { user } = useAuth();
  const { limits, loading, getRemainingDaily, getUsagePercent } = useUsageLimits();
  const { language } = useLanguage();

  if (!user || loading || !limits) return null;

  const remaining = getRemainingDaily();
  const { daily: dailyPercent } = getUsagePercent();

  const tierLabels = {
    free: { en: 'Free', ru: 'Бесплатно', ua: 'Безкоштовно' },
    pro: { en: 'Pro', ru: 'Pro', ua: 'Pro' },
    business: { en: 'Business', ru: 'Бизнес', ua: 'Бізнес' }
  };

  const TierIcon = limits.tier === 'business' ? Crown : limits.tier === 'pro' ? TrendingUp : Zap;

  const t = {
    remaining: {
      en: 'generations left today',
      ru: 'генераций осталось сегодня',
      ua: 'генерацій залишилось сьогодні'
    },
    upgrade: {
      en: 'Upgrade',
      ru: 'Улучшить',
      ua: 'Покращити'
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass-strong">
          <div className="flex items-center gap-2">
            <TierIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {tierLabels[limits.tier][language]}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Progress 
              value={100 - dailyPercent} 
              className="w-16 h-1.5" 
            />
            <span className="text-xs font-mono text-foreground">
              {remaining}/{limits.daily_limit}
            </span>
          </div>
          
          {limits.tier === 'free' && (
            <Button variant="macos" size="sm" className="h-6 text-xs px-2">
              {t.upgrade[language]}
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{remaining} {t.remaining[language]}</p>
      </TooltipContent>
    </Tooltip>
  );
}
