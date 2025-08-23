import { TilawahClient } from "@/components/tilawah-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Tilawah Assistant</h1>
        <p className="text-muted-foreground">
          Improve your Quranic recitation with real-time feedback. Record yourself and let our AI guide you.
        </p>
      </div>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Recitation Practice</CardTitle>
          <CardDescription>Press record to begin your recitation. Press stop when you are finished.</CardDescription>
        </CardHeader>
        <CardContent>
          <TilawahClient />
        </CardContent>
      </Card>
    </div>
  );
}
