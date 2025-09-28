"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { askScholarQuestion, type ScholarState } from "@/app/actions";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "ai";
  content: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending} aria-label="Kirim pesan">
      {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
    </Button>
  );
}

export function AiScholarClient() {
  const initialState: ScholarState = {};
  const [state, formAction] = useActionState(askScholarQuestion, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.answer) {
      setMessages((prev) => [...prev, { role: "ai", content: state.answer! }]);
    }
  }, [state.answer]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;
    if (question.trim()) {
      setMessages((prev) => [...prev, { role: "user", content: question }]);
      formAction(formData);
      formRef.current?.reset();
    }
  };

  return (
    <div className="flex flex-col h-[60vh] gap-4">
      <ScrollArea className="flex-1 p-4 border rounded-md" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
                Mulai percakapan dengan mengajukan pertanyaan di bawah.
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "ai" && (
                <Avatar className="w-8 h-8 border">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="w-5 h-5"/></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-md p-3 rounded-lg",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <Avatar className="w-8 h-8 border">
                    <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form ref={formRef} onSubmit={handleFormSubmit} className="flex items-start gap-2">
        <Textarea
          name="question"
          placeholder="Tanyakan tentang Tafsir Surah Al-Fatihah..."
          className="min-h-0 resize-none"
          rows={1}
          required
        />
        <SubmitButton />
      </form>
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
