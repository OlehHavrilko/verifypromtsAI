import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedSettingsValues {
  tone: string;
  style: string;
  targetModel: string;
}

interface AdvancedSettingsProps {
  values: AdvancedSettingsValues;
  onChange: (values: AdvancedSettingsValues) => void;
}

type Lang = "en" | "ru" | "ua";

interface Option {
  id: string;
  label: Record<Lang, string>;
  /** how this value changes the final prompt */
  effect: Record<Lang, string>;
  /** short example of the resulting wording */
  example: Record<Lang, string>;
}

const toneOptions: Option[] = [
  {
    id: "neutral",
    label: { en: "Neutral", ru: "Нейтральный", ua: "Нейтральний" },
    effect: {
      en: "Balanced, emotion-free wording in the Role and Constraints blocks.",
      ru: "Сдержанные формулировки без эмоций в блоках Role и Constraints.",
      ua: "Стримані формулювання без емоцій у блоках Role і Constraints.",
    },
    example: {
      en: "“Answer clearly and without embellishment.”",
      ru: "«Отвечай ясно, без прикрас».",
      ua: "«Відповідай ясно, без прикрас».",
    },
  },
  {
    id: "formal",
    label: { en: "Formal", ru: "Формальный", ua: "Формальний" },
    effect: {
      en: "Business register, no slang, third-person phrasing.",
      ru: "Деловой регистр, без сленга, обезличенные формулировки.",
      ua: "Діловий регістр, без сленгу, знеособлені формулювання.",
    },
    example: {
      en: "“Maintain a formal business tone.”",
      ru: "«Придерживайся официально-делового тона».",
      ua: "«Дотримуйся офіційно-ділового тону».",
    },
  },
  {
    id: "creative",
    label: { en: "Creative", ru: "Креативный", ua: "Креативний" },
    effect: {
      en: "Adds metaphors, imagery and freedom of expression.",
      ru: "Добавляет метафоры, образность и свободу выражения.",
      ua: "Додає метафори, образність і свободу вираження.",
    },
    example: {
      en: "“Use vivid images and unexpected comparisons.”",
      ru: "«Используй яркие образы и неожиданные сравнения».",
      ua: "«Використовуй яскраві образи та несподівані порівняння».",
    },
  },
  {
    id: "technical",
    label: { en: "Technical", ru: "Технический", ua: "Технічний" },
    effect: {
      en: "Precise terminology, numbers and edge cases in Constraints.",
      ru: "Точная терминология, цифры и краевые случаи в Constraints.",
      ua: "Точна термінологія, цифри та краєві випадки в Constraints.",
    },
    example: {
      en: "“Use exact terms, specify versions and limits.”",
      ru: "«Используй точные термины, указывай версии и ограничения».",
      ua: "«Використовуй точні терміни, вказуй версії та обмеження».",
    },
  },
  {
    id: "friendly",
    label: { en: "Friendly", ru: "Дружелюбный", ua: "Дружній" },
    effect: {
      en: "Warm, personal address and simple explanations.",
      ru: "Тёплое личное обращение и простые объяснения.",
      ua: "Тепле особисте звернення і прості пояснення.",
    },
    example: {
      en: "“Speak to the reader directly, keep it simple.”",
      ru: "«Обращайся к читателю на «ты», объясняй просто».",
      ua: "«Звертайся до читача на «ти», пояснюй просто».",
    },
  },
];

const styleOptions: Option[] = [
  {
    id: "default",
    label: { en: "Default", ru: "По умолчанию", ua: "За замовчуванням" },
    effect: {
      en: "Standard structure: role, context, task, constraints, format.",
      ru: "Стандартная структура: роль, контекст, задача, ограничения, формат.",
      ua: "Стандартна структура: роль, контекст, завдання, обмеження, формат.",
    },
    example: {
      en: "Balanced Markdown sections.",
      ru: "Сбалансированные Markdown-секции.",
      ua: "Збалансовані Markdown-секції.",
    },
  },
  {
    id: "instructional",
    label: { en: "Instructional", ru: "Инструктивный", ua: "Інструктивний" },
    effect: {
      en: "Turns the task into a numbered step-by-step procedure.",
      ru: "Превращает задачу в нумерованную пошаговую процедуру.",
      ua: "Перетворює завдання на нумеровану покрокову процедуру.",
    },
    example: {
      en: "“1. Analyze… 2. Draft… 3. Verify…”",
      ru: "«1. Проанализируй… 2. Составь… 3. Проверь…»",
      ua: "«1. Проаналізуй… 2. Склади… 3. Перевір…»",
    },
  },
  {
    id: "conversational",
    label: { en: "Conversational", ru: "Разговорный", ua: "Розмовний" },
    effect: {
      en: "Dialogue framing, clarifying questions allowed.",
      ru: "Диалоговая рамка, разрешены уточняющие вопросы.",
      ua: "Діалогова рамка, дозволені уточнювальні запитання.",
    },
    example: {
      en: "“Ask up to 2 clarifying questions first.”",
      ru: "«Сначала задай до 2 уточняющих вопросов».",
      ua: "«Спочатку постав до 2 уточнювальних запитань».",
    },
  },
  {
    id: "academic",
    label: { en: "Academic", ru: "Академический", ua: "Академічний" },
    effect: {
      en: "Argument structure, sources and caveats requested.",
      ru: "Структура аргументации, запрос источников и оговорок.",
      ua: "Структура аргументації, запит джерел і застережень.",
    },
    example: {
      en: "“Support each claim with reasoning and sources.”",
      ru: "«Подкрепляй каждый тезис рассуждением и источниками».",
      ua: "«Підкріплюй кожну тезу міркуванням і джерелами».",
    },
  },
  {
    id: "storytelling",
    label: { en: "Storytelling", ru: "Нарративный", ua: "Наративний" },
    effect: {
      en: "Narrative arc: setup, tension, resolution.",
      ru: "Нарративная арка: завязка, напряжение, развязка.",
      ua: "Наративна арка: зав'язка, напруга, розв'язка.",
    },
    example: {
      en: "“Open with a scene, end with a takeaway.”",
      ru: "«Начни со сцены, закончи выводом».",
      ua: "«Почни зі сцени, закінчи висновком».",
    },
  },
];

const modelOptions: Option[] = [
  {
    id: "auto",
    label: { en: "Auto (Best Match)", ru: "Авто (Лучший)", ua: "Авто (Найкращий)" },
    effect: {
      en: "Model-agnostic wording that works everywhere.",
      ru: "Универсальные формулировки, работают в любой модели.",
      ua: "Універсальні формулювання, працюють у будь-якій моделі.",
    },
    example: {
      en: "No vendor-specific syntax.",
      ru: "Без синтаксиса конкретного вендора.",
      ua: "Без синтаксису конкретного вендора.",
    },
  },
  {
    id: "gpt",
    label: { en: "GPT (OpenAI)", ru: "GPT (OpenAI)", ua: "GPT (OpenAI)" },
    effect: {
      en: "System-message style, explicit output schema.",
      ru: "Стиль system-сообщения, явная схема вывода.",
      ua: "Стиль system-повідомлення, явна схема виводу.",
    },
    example: {
      en: "“You are… Respond in JSON with fields…”",
      ru: "«Ты — … Ответь в JSON с полями…»",
      ua: "«Ти — … Відповідай у JSON з полями…»",
    },
  },
  {
    id: "claude",
    label: { en: "Claude (Anthropic)", ru: "Claude (Anthropic)", ua: "Claude (Anthropic)" },
    effect: {
      en: "XML-ish sections and long-context friendly structure.",
      ru: "XML-подобные секции и структура под длинный контекст.",
      ua: "XML-подібні секції та структура під довгий контекст.",
    },
    example: {
      en: "“<task>…</task> <constraints>…</constraints>”",
      ru: "«<task>…</task> <constraints>…</constraints>»",
      ua: "«<task>…</task> <constraints>…</constraints>»",
    },
  },
  {
    id: "gemini",
    label: { en: "Gemini (Google)", ru: "Gemini (Google)", ua: "Gemini (Google)" },
    effect: {
      en: "Compact instructions, strong emphasis on output format.",
      ru: "Компактные инструкции, сильный акцент на формате вывода.",
      ua: "Компактні інструкції, сильний акцент на форматі виводу.",
    },
    example: {
      en: "“Return only Markdown, no preamble.”",
      ru: "«Верни только Markdown, без вступления».",
      ua: "«Поверни лише Markdown, без вступу».",
    },
  },
  {
    id: "llama",
    label: { en: "Llama (Meta)", ru: "Llama (Meta)", ua: "Llama (Meta)" },
    effect: {
      en: "Simple, literal instructions, fewer nested conditions.",
      ru: "Простые буквальные инструкции, меньше вложенных условий.",
      ua: "Прості буквальні інструкції, менше вкладених умов.",
    },
    example: {
      en: "“Do exactly these 3 things.”",
      ru: "«Сделай ровно эти 3 вещи».",
      ua: "«Зроби рівно ці 3 речі».",
    },
  },
];

export const AdvancedSettings = ({ values, onChange }: AdvancedSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useLanguage();
  const lang = (language === "en" || language === "ua" ? language : "ru") as Lang;

  const labels = {
    en: {
      title: "Advanced Settings",
      tone: "Tone",
      style: "Style",
      targetModel: "Target AI Model",
      toneHint: "Sets the voice of the generated prompt.",
      styleHint: "Shapes how the task block is structured.",
      modelHint: "Adapts syntax to the model that will run the prompt.",
      impact: "How this affects the prompt",
      example: "Example",
    },
    ru: {
      title: "Расширенные настройки",
      tone: "Тон",
      style: "Стиль",
      targetModel: "Целевая AI-модель",
      toneHint: "Задаёт голос итогового промпта.",
      styleHint: "Определяет, как построен блок задачи.",
      modelHint: "Адаптирует синтаксис под модель, которая исполнит промпт.",
      impact: "Как это влияет на промпт",
      example: "Пример",
    },
    ua: {
      title: "Розширені налаштування",
      tone: "Тон",
      style: "Стиль",
      targetModel: "Цільова AI-модель",
      toneHint: "Задає голос підсумкового промпту.",
      styleHint: "Визначає, як побудований блок завдання.",
      modelHint: "Адаптує синтаксис під модель, що виконає промпт.",
      impact: "Як це впливає на промпт",
      example: "Приклад",
    },
  } as const;

  const t = labels[lang];

  const handleChange = (key: keyof AdvancedSettingsValues, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const renderGroup = (
    title: string,
    hint: string,
    options: Option[],
    key: keyof AdvancedSettingsValues,
    activeClass: string,
    hoverClass: string
  ) => {
    const selected = options.find((o) => o.id === values[key]) ?? options[0];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <label className="text-sm font-medium text-foreground">{title}</label>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
          {options.map((option) => (
            <Tooltip key={option.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleChange(key, option.id)}
                  aria-pressed={values[key] === option.id}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-all",
                    values[key] === option.id
                      ? activeClass
                      : cn("bg-background border-border text-muted-foreground hover:text-foreground", hoverClass)
                  )}
                >
                  {option.label[lang]}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs space-y-1">
                <p className="font-medium">{option.label[lang]}</p>
                <p className="text-xs opacity-90">{option.effect[lang]}</p>
                <p className="text-xs opacity-70">
                  {t.example}: {option.example[lang]}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/90 leading-relaxed">
          <span className="text-foreground/80">{selected.label[lang]}</span> — {selected.effect[lang]}
        </p>
      </div>
    );
  };

  const activeSummary = [
    toneOptions.find((o) => o.id === values.tone),
    styleOptions.find((o) => o.id === values.style),
    modelOptions.find((o) => o.id === values.targetModel),
  ].filter(Boolean) as Option[];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="advanced-settings-groups"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>{t.title}</span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {isExpanded && (
          <div id="advanced-settings-groups" className="space-y-5 p-4 rounded-lg bg-muted/30 border border-border/50 animate-fade-in">
            {renderGroup(
              t.tone,
              t.toneHint,
              toneOptions,
              "tone",
              "bg-primary text-primary-foreground border-primary",
              "hover:border-primary/50"
            )}
            {renderGroup(
              t.style,
              t.styleHint,
              styleOptions,
              "style",
              "bg-accent text-accent-foreground border-accent",
              "hover:border-accent/50"
            )}
            {renderGroup(
              t.targetModel,
              t.modelHint,
              modelOptions,
              "targetModel",
              "bg-secondary text-secondary-foreground border-secondary",
              "hover:border-secondary/50"
            )}

            <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-1.5">
              <p className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                {t.impact}
              </p>
              <ul className="space-y-1">
                {activeSummary.map((o) => (
                  <li key={o.id} className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground/85 font-medium">{o.label[lang]}</span> — {o.example[lang]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
