"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useEffect, useRef, useState } from "react";
import { askScholarQuestion, type ScholarState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, LoaderCircle, Send, Sparkles, User, CheckCircle2, Flag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { openGlobalReportModal } from "@/components/common/report-issue-widget";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "ai";
  content: string;
};

const QUICK_TOPICS = [
  "Tafsir QS. Hud ayat 3 menurut Ibnu Katsir & As-Sa'di",
  "I'rab & kedudukan kata dalam QS. Al-Fatihah ayat 1–2",
  "Kaidah Salaf dalam menjaga & memuraja'ah hafalan Al-Qur'an",
  "Keutamaan istighfar dan taubat berdasarkan dalil shahih",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="icon"
      disabled={pending}
      aria-label="Kirim pertanyaan"
      className="h-11 w-11 rounded-2xl bg-[#800000] hover:bg-[#600000] text-white shadow-md shrink-0"
    >
      {pending ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
    </Button>
  );
}

/**
 * Formats inline **bold** and *italic* cleanly without showing raw markdown asterisks.
 */
function renderInlineText(text: string): React.ReactNode[] {
  const cleaned = text.replace(/^#{1,6}\s*/, "");
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{part.replace(/\*\*/g, "")}</span>;
  });
}

/**
 * Checks if a line is predominantly Arabic script so we can render it in mushaf style.
 */
function isArabicBlock(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const latinChars = (trimmed.match(/[A-Za-z]/g) || []).length;
  return arabicChars >= 8 && arabicChars > latinChars * 1.2;
}

/**
 * Renders structured Salaf scholar response into clean editorial cards,
 * Arabic verse boxes, section headers, and reference blocks.
 */
function FormattedScholarReply({ content }: { content: string }) {
  const rawLines = content
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !/^-{3,}$/.test(l.trim()) && !/^_{3,}$/.test(l.trim()));

  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Standalone Section Heading
    const headingMatch =
      line.match(/^#{1,4}\s+\*?\*?(.+?)\*?\*?:?$/) ||
      (line.startsWith("**") &&
        (line.endsWith("**") || line.endsWith("**:")) &&
        line.length < 75 &&
        !line.slice(2, -2).includes("**")
        ? [line, line.replace(/^\*\*|\*\*:?$/g, "")]
        : null);

    if (headingMatch) {
      const title = headingMatch[1].replace(/\*\*/g, "").replace(/:$/, "").trim();
      const isReferenceHeading = /rujukan|referensi|maraji|sumber kitab/i.test(title);

      blocks.push(
        <div
          key={`h-${i}`}
          className={cn(
            "pt-3 pb-1 border-b flex items-center gap-2",
            isReferenceHeading
              ? "border-amber-200/80 text-[#800000]"
              : "border-slate-100 text-[#800000]"
          )}
        >
          <span className="w-1.5 h-4 rounded-full bg-[#800000] shrink-0" />
          <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider">
            {title}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // 2. Arabic Verse / Dalil Block
    if (isArabicBlock(line)) {
      blocks.push(
        <div
          key={`ar-${i}`}
          dir="rtl"
          className="my-2 px-4 py-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-right font-arabic text-xl sm:text-2xl leading-[2.1] text-slate-900 shadow-inner"
        >
          {line.replace(/\*\*/g, "")}
        </div>
      );
      i++;
      continue;
    }

    // 3. Bullet or Numbered List group
    if (/^([•\-*]|\d+\.)\s+/.test(line)) {
      const listItems: { marker: string; text: string }[] = [];
      while (i < rawLines.length && /^([•\-*]|\d+\.)\s+/.test(rawLines[i].trim())) {
        const current = rawLines[i].trim();
        const m = current.match(/^([•\-*]|\d+\.)\s+(.*)$/);
        if (m) {
          listItems.push({
            marker: m[1] === "*" || m[1] === "-" ? "•" : m[1],
            text: m[2],
          });
        }
        i++;
      }

      blocks.push(
        <ul key={`ul-${i}`} className="space-y-2 my-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-[13px] sm:text-sm text-slate-700 leading-relaxed"
            >
              <span className="font-black text-[#800000] mt-0.5 shrink-0 select-none">
                {item.marker}
              </span>
              <div className="flex-1 min-w-0">{renderInlineText(item.text)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 4. Normal Paragraph (or Wallahu a'lam closing)
    const isClosing = /wallahu\s*a['’`]?lam/i.test(line);
    blocks.push(
      <p
        key={`p-${i}`}
        className={cn(
          "text-[13px] sm:text-sm leading-relaxed",
          isClosing
            ? "text-xs font-bold italic text-slate-500 pt-2 border-t border-slate-100"
            : "text-slate-700"
        )}
      >
        {renderInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2.5">{blocks}</div>;
}

export function AiScholarClient() {
  const initialState: ScholarState = {};
  const [state, formAction] = useActionState(askScholarQuestion, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.answer) {
      setMessages((prev) => [...prev, { role: "ai", content: state.answer! }]);
    }
  }, [state.answer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = (formData.get("question") as string) || "";
    if (question.trim()) {
      setMessages((prev) => [...prev, { role: "user", content: question.trim() }]);
      formAction(formData);
      setInputValue("");
      formRef.current?.reset();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Manhaj & Reference Badge Header */}
      <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#800000] shrink-0" />
          <span className="text-[11px] font-bold text-slate-800">
            Rujukan Manhaj Salafus Shalih:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#800000]">
          <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200">Tafsir Ibnu Katsir</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200">Tafsir Ath-Thabari</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200">Tafsir As-Sa&apos;di</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200">Tafsir Al-Baghawi</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200">Shahihain</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="min-h-[48vh] max-h-[64vh] overflow-y-auto px-1 sm:px-2 py-3 space-y-5 rounded-2xl bg-slate-50/70 border border-slate-100">
        {messages.length === 0 && (
          <div className="py-8 px-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-black text-slate-800">
                Majelis Ilmu &amp; Tadabbur Al-Qur&apos;an
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tanyakan tafsir ayat, kedudukan i&apos;rab &amp; mufradat, atau faedah ilmiah berdasarkan penjelasan para ulama Salafus Shalih.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-1">
              {QUICK_TOPICS.map((topic, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputValue(topic)}
                  className="text-left text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-[#800000]/5 text-slate-700 hover:text-[#800000] border border-slate-200/80 transition-colors shadow-sm"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const prevUserQuestion =
            index > 0 && messages[index - 1]?.role === "user" ? messages[index - 1].content : "";

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2.5 px-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "ai" && (
                <div className="w-8 h-8 rounded-xl bg-[#800000] text-amber-300 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl shadow-sm",
                  message.role === "user"
                    ? "max-w-[82%] bg-[#800000] text-white px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-tr-sm"
                    : "w-full max-w-[92%] bg-white border border-slate-200/90 px-4 sm:px-5 py-4 rounded-tl-sm"
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#800000] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Penjelasan Ilmiah • Manhaj Salaf
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openGlobalReportModal({
                            moduleName: "Hi Asisten AQLI (Tanya Jawab Ilmiah)",
                            category: "koreksi_rujukan_ai",
                            contextTitle: prevUserQuestion
                              ? `Pertanyaan: ${prevUserQuestion.slice(0, 90)}`
                              : "Jawaban Hi Asisten AQLI",
                            contextExcerpt: message.content.slice(0, 450),
                          })
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:text-[#800000] bg-rose-50 hover:bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200/70 transition-colors"
                      >
                        <Flag className="w-2.5 h-2.5" />
                        Laporkan Jawaban
                      </button>
                    </div>
                    <FormattedScholarReply content={message.content} />
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Form Input */}
      <form ref={formRef} onSubmit={handleFormSubmit} className="flex items-end gap-2">
        <Textarea
          name="question"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Tanyakan tafsir ayat, i'rab, mufradat, atau penjelasan ulama Salaf..."
          className="min-h-[44px] max-h-32 resize-none rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm py-3 px-3.5"
          rows={1}
          required
        />
        <SubmitButton />
      </form>

      {state.error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle className="text-xs font-bold">Pemberitahuan</AlertTitle>
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
