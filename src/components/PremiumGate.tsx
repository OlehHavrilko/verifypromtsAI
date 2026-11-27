import { usePremium, type FeatureTier } from '@/hooks/usePremium';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const { hasAccess, getRequiredTier } = usePremium();
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (hasAccess(feature)) {
    return <>{children}</>;
  }

  const requiredTier = getRequiredTier(feature);

  const t = {
    en: {
      title: `${requiredTier === 'business' ? 'Business' : 'Pro'} Feature`,
      desc: `This feature requires a ${requiredTier === 'business' ? 'Business' : 'Pro'} subscription.`,
      upgrade: 'Upgrade Now',
      benefits: requiredTier === 'business'
        ? ['A/B testing', 'API export', 'Prompt chains', '1000 daily generations']
        : ['Chat assistant', 'Image analyzer', 'Text tools', '100 daily generations'],
    },
    ru: {
      title: `${requiredTier === 'business' ? 'Business' : 'Pro'} функция`,
      desc: `Эта функция требует подписку ${requiredTier === 'business' ? 'Business' : 'Pro'}.`,
      upgrade: 'Улучшить план',
      benefits: requiredTier === 'business'
        ? ['A/B тестирование', 'Экспорт в API', 'Цепочки промптов', '1000 генераций/день']
        : ['Чат-ассистент', 'Анализ изображений', 'Текстовые инструменты', '100 генераций/день'],
    },
    ua: {
      title: `${requiredTier === 'business' ? 'Business' : 'Pro'} функція`,
      desc: `Ця функція потребує підписку ${requiredTier === 'business' ? 'Business' : 'Pro'}.`,
      upgrade: 'Покращити план',
      benefits: requiredTier === 'business'
        ? ['A/B тестування', 'Експорт в API', 'Ланцюжки промптів', '1000 генерацій/день']
        : ['Чат-асистент', 'Аналіз зображень', 'Текстові інструменти', '100 генерацій/день'],
    },
  };

  const labels = t[language as keyof typeof t] || t.en;
  const TierIcon = requiredTier === 'business' ? Crown : Sparkles;

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <TierIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{labels.title}</h2>
          </div>
          <p className="text-muted-foreground text-sm">{labels.desc}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left">
          {labels.benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              {b}
            </div>
          ))}
        </div>

        <Button variant="gradient" size="lg" onClick={() => navigate('/pricing')} className="gap-2">
          <TierIcon className="w-4 h-4" />
          {labels.upgrade}
        </Button>
      </div>
    </div>
  );
}

// Badge component for sidebar
export function TierBadge({ tier }: { tier: FeatureTier }) {
  if (tier === 'free') return null;
  
  return (
    <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
      tier === 'business' 
        ? 'bg-amber-500/15 text-amber-500' 
        : 'bg-primary/15 text-primary'
    }`}>
      {tier === 'business' ? 'BIZ' : 'PRO'}
    </span>
  );
}
