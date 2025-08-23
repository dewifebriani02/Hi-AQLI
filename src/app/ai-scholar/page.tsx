import { AiScholarClient } from "@/components/ai-scholar-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiScholarPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Scholar</h1>
        <p className="text-muted-foreground">
          Ask questions about Tajwid, Tafsir, and Islamic history. Our AI is trained on a curated set of verified data.
        </p>
      </div>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>Type your question below and receive an answer from our AI Scholar.</CardDescription>
        </CardHeader>
        <CardContent>
          <AiScholarClient />
        </CardContent>
      </Card>
    </div>
  );
}
