import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { AlertCircle, Lightbulb } from "lucide-react";

export const MIN_INPUT_LENGTH = 10;
export const MAX_INPUT_LENGTH = 2000;

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const suggestions = {
  en: [
    "Landing page copy for a B2B SaaS analytics tool",
    "Code review checklist for a React component",
    "Weekly content plan for an Instagram account",
  ],
  ru: [
    "Текст лендинга для B2B SaaS-аналитики",
    "Чек-лист код-ревью для React-компонента",
    "Контент-план на неделю для Instagram",
  ],
  ua: [
    "Текст лендінгу для B2B SaaS-аналітики",
    "Чек-ліст код-рев'ю для React-компонента",
    "Контент-план на тиждень для Instagram",
  ],
};

export function PromptInput({ value, onChange, placeholder }: PromptInputProps) {
  const { language } = useLanguage();
  const lang = (language === "en" || language === "ua" ? language : "ru") as "en" | "ru" | "ua";

  const copy = {
    en: {
      header: "Describe what you want to create",
      hint: "Tip: name the audience, goal and format — e.g. “for beginners, to teach, as a step-by-step guide”.",
      tooShort: `At least ${MIN_INPUT_LENGTH} characters`,
      tooLong: "Text is too long",
      examples: "Examples",
      placeholder: "E.g. an onboarding email for new users of a fitness app...",
    },
    ru: {
      header: "Опишите, что вы хотите создать",
      hint: "Совет: укажите аудиторию, цель и формат — например «для новичков, чтобы обучить, в виде пошаговой инструкции».",
      tooShort: `Минимум ${MIN_INPUT_LENGTH} символов`,
      tooLong: "Слишком длинный текст",
      examples: "Примеры",
      placeholder: "Например: письмо-онбординг для новых пользователей фитнес-приложения...",
    },
    ua: {
      header: "Опишіть, що ви хочете створити",
      hint: "Порада: вкажіть аудиторію, мету та формат — наприклад «для новачків, щоб навчити, у вигляді покрокової інструкції».",
      tooShort: `Мінімум ${MIN_INPUT_LENGTH} символів`,
      tooLong: "Занадто довгий текст",
      examples: "Приклади",
      placeholder: "Наприклад: лист-онбординг для нових користувачів фітнес-застосунку...",
    },
  }[lang];

  const length = value.trim().length;
  const tooShort = length > 0 && length < MIN_INPUT_LENGTH;
  const tooLong = value.length > MAX_INPUT_LENGTH;

  return (
    <div className="flex min-h-[420px] flex-col bg-card/80">
      <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {copy.header}
        </span>
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums tracking-normal",
            tooLong ? "text-destructive" : "text-muted-foreground/70"
          )}
        >
          {value.length}/{MAX_INPUT_LENGTH}
        </span>
      </div>
      <Textarea
        id="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_INPUT_LENGTH + 200))}
        placeholder={placeholder || copy.placeholder}
        aria-label={copy.header}
        aria-invalid={tooShort || tooLong}
        aria-describedby="prompt-input-help"
        maxLength={MAX_INPUT_LENGTH + 200}
        className="focus-ring-inset min-h-[250px] flex-1 border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/70 text-base leading-relaxed p-5 resize-none"
      />

      <div className="px-5 py-4 border-t border-border/60 space-y-3">
        <div id="prompt-input-help" aria-live="polite">
          {tooShort || tooLong ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {tooLong ? copy.tooLong : copy.tooShort}
            </p>
          ) : (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {copy.hint}
            </p>
          )}
        </div>

        {length === 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.examples}>
            <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground/70">
              {copy.examples}
            </span>
            {suggestions[lang].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
