import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput, MIN_INPUT_LENGTH, MAX_INPUT_LENGTH } from "@/components/PromptInput";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GeneratedPrompt } from "@/components/GeneratedPrompt";
import { PromptScoring } from "@/components/PromptScoring";
import { AdvancedSettings, AdvancedSettingsValues } from "@/components/AdvancedSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useGenerationHistory } from "@/hooks/useGenerationHistory";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { ArrowRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/PageMeta";

const Index = () => {
  const [input, setInput] = useState("");
  const [length, setLength] = useState("Balanced");
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettingsValues>({
    tone: "neutral",
    style: "default",
    targetModel: "auto",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { addToHistory } = useGenerationHistory();
  const { incrementUsage, canGenerate, limits } = useUsageLimits();

  useEffect(() => {
    // reserved for future prefill hooks
  }, []);

  const lengthOptions = language === 'en'
    ? [{ v: "Concise", s: "S" }, { v: "Balanced", s: "M" }, { v: "Detailed", s: "L" }]
    : language === 'ua'
    ? [{ v: "Стислий", s: "S" }, { v: "Збалансований", s: "M" }, { v: "Детальний", s: "L" }]
    : [{ v: "Краткий", s: "S" }, { v: "Сбалансированный", s: "M" }, { v: "Детальный", s: "L" }];

  const handleGenerate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast({ title: t('errorOccurred'), description: t('enterIdea'), variant: "destructive" });
      return;
    }
    if (trimmed.length < MIN_INPUT_LENGTH) {
      toast({
        title: t('errorOccurred'),
        description: language === 'en'
          ? `Describe your idea in at least ${MIN_INPUT_LENGTH} characters`
          : language === 'ua'
          ? `Опишіть ідею щонайменше ${MIN_INPUT_LENGTH} символами`
          : `Опишите идею минимум ${MIN_INPUT_LENGTH} символами`,
        variant: "destructive",
      });
      return;
    }
    if (input.length > MAX_INPUT_LENGTH) {
      toast({
        title: t('errorOccurred'),
        description: language === 'en'
          ? `Maximum ${MAX_INPUT_LENGTH} characters`
          : language === 'ua'
          ? `Максимум ${MAX_INPUT_LENGTH} символів`
          : `Максимум ${MAX_INPUT_LENGTH} символов`,
        variant: "destructive",
      });
      return;
    }

    if (user && limits && !canGenerate()) {
      toast({
        title: language === 'en' ? 'Limit reached' : language === 'ua' ? 'Ліміт вичерпано' : 'Лимит исчерпан',
        description: language === 'en' ? 'Upgrade to continue generating' : language === 'ua' ? 'Оновіть план для продовження' : 'Обновите план для продолжения',
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setGeneratedPrompt("");

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prompt`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ input, length, tone: advancedSettings.tone, style: advancedSettings.style, targetModel: advancedSettings.targetModel }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResult = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResult += content;
              setGeneratedPrompt(fullResult);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResult += content;
              setGeneratedPrompt(fullResult);
            }
          } catch { /* ignore */ }
        }
      }

      if (fullResult && user) {
        await incrementUsage();
        await addToHistory({ input_text: input, generated_prompt: fullResult, tool_type: 'generator', length_setting: length, tone: advancedSettings.tone, style: advancedSettings.style, target_model: advancedSettings.targetModel, parent_id: null });
      }
      if (fullResult) {
        toast({ title: t('promptGenerated'), description: language === 'en' ? "Your optimized prompt is ready." : language === 'ua' ? "Ваш промпт готовий." : "Ваш промпт готов." });
      }
    } catch (error) {
      console.error('Generate prompt error:', error);
      toast({ title: t('errorOccurred'), description: error instanceof Error ? error.message : t('errorOccurred'), variant: "destructive" });
    } finally { setIsGenerating(false); }
  }, [input, length, advancedSettings, toast, t, language, user, limits, canGenerate, incrementUsage, addToHistory]);

  const handleSavePrompt = async () => {
    if (!user) { toast({ title: t('signInRequired'), description: t('signInRequired'), variant: "destructive" }); return; }
    if (!generatedPrompt) { toast({ title: t('errorOccurred'), description: t('noPromptYet'), variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      const { error } = await supabase.from('saved_prompts').insert({ user_id: user.id, title, input_text: input, generated_prompt: generatedPrompt, length_setting: length });
      if (error) throw error;
      toast({ title: t('promptSaved'), description: language === 'en' ? "Prompt saved" : language === 'ua' ? "Промпт збережено" : "Промпт сохранён" });
    } catch { toast({ title: t('errorOccurred'), description: t('errorOccurred'), variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const headline = language === 'en' ? "What shall we" : language === 'ua' ? "Що будемо" : "Что будем";
  const headlineAccent = language === 'en' ? "forge" : language === 'ua' ? "кувати" : "ковать";
  const subtitle = language === 'en'
    ? "Describe your idea — we'll shape it into a production-ready prompt."
    : language === 'ua'
    ? "Опишіть ідею — ми перетворимо її на готовий промпт."
    : "Опишите идею — мы превратим её в готовый промпт.";

  const trimmedLen = input.trim().length;
  const canSubmit = trimmedLen >= MIN_INPUT_LENGTH && input.length <= MAX_INPUT_LENGTH;

  const lengthHints = language === 'en'
    ? ["short and to the point", "balanced detail", "maximum detail"]
    : language === 'ua'
    ? ["коротко і по суті", "збалансована деталізація", "максимальна деталізація"]
    : ["коротко и по делу", "сбалансированная детализация", "максимальная детализация"];

  const advancedHint = language === 'en'
    ? "Tone, style and target AI model of the prompt"
    : language === 'ua'
    ? "Тон, стиль і цільова AI-модель промпту"
    : "Тон, стиль и целевая AI-модель промпта";

  const generateHint = language === 'en'
    ? "Build an optimized prompt from your description"
    : language === 'ua'
    ? "Створити оптимізований промпт з вашого опису"
    : "Собрать оптимизированный промпт из вашего описания";

  const disabledHint = input.length > MAX_INPUT_LENGTH
    ? (language === 'en' ? `Maximum ${MAX_INPUT_LENGTH} characters` : language === 'ua' ? `Максимум ${MAX_INPUT_LENGTH} символів` : `Максимум ${MAX_INPUT_LENGTH} символов`)
    : (language === 'en' ? `Describe your idea in at least ${MIN_INPUT_LENGTH} characters` : language === 'ua' ? `Опишіть ідею щонайменше ${MIN_INPUT_LENGTH} символами` : `Опишите идею минимум ${MIN_INPUT_LENGTH} символами`);

  return (
    <>
      <PageMeta title={"Prompt Generator — PromptLab"} description={"Generate optimized AI prompts with the PromptLab builder. Configure role, context, task, constraints and format in one place."} path="/app" />
      <div className="relative min-h-full flex flex-col bg-background overflow-hidden">
        <div className="forge-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" aria-hidden />


        {/* Editor area */}
        <div className="relative flex-1 p-5 lg:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
          <header className="mx-auto max-w-3xl pt-4 text-center">
            <div className="mb-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />PromptLab<span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-foreground">
              {headline} <span className="text-primary">{headlineAccent}?</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-muted-foreground">{subtitle}</p>
          </header>

          <div className="grid gap-5 lg:grid-cols-2 items-stretch">

          {/* Input container */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/80 shadow-2xl backdrop-blur-xl">
            <PromptInput value={input} onChange={setInput} />

            <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border/70 p-4">
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground mb-1.5">{t('length')}</span>
                  <div className="flex rounded-md bg-background p-1 border border-border" role="group" aria-label={t('length')}>
                    {lengthOptions.map((opt, i) => (
                      <Tooltip key={opt.v}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setLength(opt.v)}
                            aria-label={opt.v}
                            aria-pressed={length === opt.v}
                            className={cn(
                              "rounded px-3 py-1 text-xs font-semibold transition-colors",
                              length === opt.v
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {opt.s}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{opt.v} — {lengthHints[i]}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground mb-1.5">
                    {language === 'en' ? 'Parameters' : language === 'ua' ? 'Параметри' : 'Параметры'}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        aria-expanded={showAdvanced}
                        aria-controls="advanced-settings-panel"
                        className="flex items-center gap-2 rounded-md px-3 py-2 bg-background border border-border text-xs font-medium text-foreground hover:border-primary transition-colors"
                      >
                        {language === 'en' ? 'Advanced Settings' : language === 'ua' ? 'Розширені' : 'Расширенные'}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{advancedHint}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* aria-disabled instead of disabled: stays focusable so keyboard users hear why */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isGenerating || !canSubmit) return;
                      handleGenerate();
                    }}
                    aria-disabled={isGenerating || !canSubmit}
                    className={cn(
                      "rounded-lg bg-primary text-primary-foreground px-7 py-3.5 font-semibold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3",
                      (isGenerating || !canSubmit) && "opacity-50 cursor-not-allowed hover:brightness-100 active:scale-100"
                    )}
                  >
                    {isGenerating ? t('generating') : t('generate')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{canSubmit ? generateHint : disabledHint}</TooltipContent>
              </Tooltip>
            </div>
            </TooltipProvider>


            {showAdvanced && (
              <div id="advanced-settings-panel" className="px-4 pb-4 pt-1 border-t border-border/60 animate-fade-in">
                <AdvancedSettings values={advancedSettings} onChange={setAdvancedSettings} />
              </div>
            )}
          </div>

          {/* Output */}
          <div className="flex flex-col rounded-xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-foreground">
                {language === 'en' ? 'Generated Result' : language === 'ua' ? 'Результат' : 'Результат'}
              </h2>
              {generatedPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={isSaving}
                  className="text-xs font-bold uppercase tracking-wider border-b border-transparent hover:border-foreground rounded-none hover:bg-transparent"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSaving ? t('saving') : t('save')}
                </Button>
              )}
            </div>

            <div className="relative flex-1 min-h-[420px]">
              <GeneratedPrompt
                prompt={generatedPrompt}
                isGenerating={isGenerating}
                inputText={input}
                title={input.slice(0, 50) || "Generated Prompt"}
                onEnhance={(enhanced) => setGeneratedPrompt(enhanced)}
              />
            </div>

            {generatedPrompt && (
              <div className="mt-5 rounded-lg border border-border p-4 bg-background/40">
                <PromptScoring prompt={generatedPrompt} />
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
