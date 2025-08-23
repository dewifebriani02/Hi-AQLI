import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { ProgressClient } from "@/components/progress-client";
  import { CheckCircle2, ListChecks, Target } from "lucide-react";
  
  export default function ProgressPage() {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Your Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey, review your recitation accuracy, and stay motivated.
          </p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tajweed Lessons Completed</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">4 of 6</div>
                    <p className="text-xs text-muted-foreground">
                        +2 in the last month
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Recitation Score</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">88%</div>
                    <p className="text-xs text-muted-foreground">
                        +5% from last week
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Study Circles Joined</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">2</div>
                    <p className="text-xs text-muted-foreground">
                        Joined "Tafsir of Juz' Amma" recently
                    </p>
                </CardContent>
            </Card>
        </div>
  
        <Card>
          <CardHeader>
            <CardTitle>Recitation Accuracy Over Time</CardTitle>
            <CardDescription>
              This chart shows the accuracy scores from your AI Tilawah Assistant sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressClient />
          </CardContent>
        </Card>
      </div>
    );
  }
  