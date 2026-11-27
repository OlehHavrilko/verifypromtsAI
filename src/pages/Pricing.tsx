import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { STRIPE_TIERS } from '@/lib/stripe/config';
import {
  ArrowLeft, Check, Zap, Crown, Rocket, Loader2, ExternalLink, Command, ChevronRight
} from 'lucide-react';
import { PageMeta } from "@/components/PageMeta";

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const { tier: currentTier, subscribed, loading: subLoading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: language === 'en' ? 'Subscription activated!' : language === 'ua' ? 'Підписку активовано!' : 'Подписка активирована!',
        description: language === 'en' ? 'Thank you for your purchase. Refreshing...' : language === 'ua' ? 'Дякуємо за покупку. Оновлення...' : 'Спасибо за покупку. Обновление...',
      });
      checkSubscription();
    }
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: language === 'en' ? 'Checkout canceled' : language === 'ua' ? 'Оплату скасовано' : 'Оплата отменена',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const handleCheckout = async (priceId: string, tierName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckoutLoading(tierName);
    try {
      await createCheckout(priceId);
    } catch (err) {
      toast({
        title: language === 'en' ? 'Error' : 'Ошибка',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch (err) {
      toast({
        title: language === 'en' ? 'Error' : 'Ошибка',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const t = {
    title: { en: 'Choose Your Plan', ru: 'Выберите тариф', ua: 'Оберіть тариф' },
    subtitle: {
      en: 'Start free and upgrade as you grow',
      ru: 'Начните бесплатно и обновляйтесь по мере роста',
      ua: 'Почніть безкоштовно та оновлюйтесь у міру зростання',
    },
    monthly: { en: '/month', ru: '/мес', ua: '/міс' },
    currentPlan: { en: 'Current Plan', ru: 'Текущий план', ua: 'Поточний план' },
    upgrade: { en: 'Upgrade', ru: 'Обновить', ua: 'Оновити' },
    getStarted: { en: 'Get Started', ru: 'Начать', ua: 'Почати' },
    manage: { en: 'Manage Subscription', ru: 'Управление подпиской', ua: 'Керування підпискою' },
    popular: { en: 'Most Popular', ru: 'Популярный', ua: 'Популярний' },
    back: { en: 'Back', ru: 'Назад', ua: 'Назад' },
    loginToUpgrade: { en: 'Sign in to upgrade', ru: 'Войдите для обновления', ua: 'Увійдіть для оновлення' },
  };

  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      price: 0,
      icon: Zap,
      description: {
        en: 'For getting started with AI prompts',
        ru: 'Для знакомства с AI промптами',
        ua: 'Для знайомства з AI промптами',
      },
      features: {
        en: ['10 generations per day', '100 per month', 'Basic templates', 'Prompt scoring', 'Export to TXT'],
        ru: ['10 генераций в день', '100 в месяц', 'Базовые шаблоны', 'Оценка промптов', 'Экспорт в TXT'],
        ua: ['10 генерацій на день', '100 на місяць', 'Базові шаблони', 'Оцінка промптів', 'Експорт в TXT'],
      },
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: STRIPE_TIERS.pro.price,
      priceId: STRIPE_TIERS.pro.price_id,
      icon: Crown,
      popular: true,
      description: {
        en: 'For professionals who need more power',
        ru: 'Для профессионалов, которым нужно больше',
        ua: 'Для професіоналів, яким потрібно більше',
      },
      features: {
        en: ['100 generations per day', '3,000 per month', 'All templates', 'Image analyzer', 'AI detector & humanizer', 'Priority support'],
        ru: ['100 генераций в день', '3 000 в месяц', 'Все шаблоны', 'Анализ изображений', 'AI детектор и гуманизатор', 'Приоритетная поддержка'],
        ua: ['100 генерацій на день', '3 000 на місяць', 'Усі шаблони', 'Аналіз зображень', 'AI детектор та гуманізатор', 'Пріоритетна підтримка'],
      },
    },
    {
      id: 'business' as const,
      name: 'Business',
      price: STRIPE_TIERS.business.price,
      priceId: STRIPE_TIERS.business.price_id,
      icon: Rocket,
      description: {
        en: 'For teams and heavy users',
        ru: 'Для команд и активных пользователей',
        ua: 'Для команд та активних користувачів',
      },
      features: {
        en: ['1,000 generations per day', '50,000 per month', 'Everything in Pro', 'API access', 'Custom templates', 'Dedicated support'],
        ru: ['1 000 генераций в день', '50 000 в месяц', 'Всё из Pro', 'Доступ к API', 'Свои шаблоны', 'Выделенная поддержка'],
        ua: ['1 000 генерацій на день', '50 000 на місяць', 'Все з Pro', 'Доступ до API', 'Власні шаблони', 'Виділена підтримка'],
      },
    },
  ];

  return (
    <>
      <PageMeta title={"Pricing plans — PromptForge"} description={"Compare PromptForge Free, Pro and Business plans. Choose the right AI prompt engineering plan for your workflow and team size."} path="/pricing" />
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="container max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.back[language]}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl glass-card">
                <Command className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold tracking-tight">PromptForge</span>
            </div>
            <Button variant="macos" onClick={() => navigate('/app')} className="gap-2">
              {language === 'en' ? 'Open App' : language === 'ua' ? 'Відкрити' : 'Открыть'}
              <ChevronRight className="w-4 h-4 opacity-60" />
            </Button>
          </div>
        </nav>

        {/* Header */}
        <section className="container max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">{t.title[language]}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t.subtitle[language]}</p>
        </section>

        {/* Plans Grid */}
        <section className="container max-w-6xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentTier === plan.id;
              const isUpgrade = !isCurrent && plan.id !== 'free';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 transition-all duration-300 ${
                    plan.popular
                      ? 'border-gradient glass-premium scale-[1.02]'
                      : 'glass-card'
                  } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30">
                        {t.popular[language]}
                      </span>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 right-6">
                      <span className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground rounded-full">
                        {t.currentPlan[language]}
                      </span>
                    </div>
                  )}

                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${plan.popular ? 'bg-primary/15' : 'bg-muted/50'}`}>
                      <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground ml-1">{t.monthly[language]}</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6">{plan.description[language]}</p>

                  {/* CTA */}
                  {isCurrent ? (
                    subscribed ? (
                      <Button variant="macos" className="w-full gap-2" onClick={handleManage}>
                        <ExternalLink className="w-4 h-4" />
                        {t.manage[language]}
                      </Button>
                    ) : (
                      <Button variant="macos" className="w-full" disabled>
                        {t.currentPlan[language]}
                      </Button>
                    )
                  ) : isUpgrade ? (
                    <Button
                      variant={plan.popular ? 'gradient' : 'macos'}
                      className={`w-full gap-2 ${plan.popular ? 'glow-button' : ''}`}
                      onClick={() => handleCheckout(plan.priceId!, plan.id)}
                      disabled={!!checkoutLoading || subLoading}
                    >
                      {checkoutLoading === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {!user ? t.loginToUpgrade[language] : t.upgrade[language]}
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="macos" className="w-full" onClick={() => navigate('/app')}>
                      {t.getStarted[language]}
                    </Button>
                  )}

                  {/* Features */}
                  <ul className="mt-6 space-y-3">
                    {plan.features[language].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
    </>
  );
};

export default Pricing;
