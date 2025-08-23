import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Users } from "lucide-react";

const studyCircles = [
  {
    title: "Tafsir of Juz' Amma",
    instructor: "Dr. Fatima Ahmed",
    image: "https://placehold.co/600x400.png",
    aiHint: "woman scholar",
    description: "An in-depth study of the meanings and context of the last part of the Quran, perfect for beginners.",
    schedule: "Saturdays, 10:00 AM EST",
    level: "Beginner",
  },
  {
    title: "Advanced Tajweed: Sifaat Al-Huroof",
    instructor: "Sheikh Yusuf Ibrahim",
    image: "https://placehold.co/600x400.png",
    aiHint: "man teaching",
    description: "A detailed exploration of the characteristics of Arabic letters (Sifaat) for experienced reciters.",
    schedule: "Mondays & Wednesdays, 7:00 PM EST",
    level: "Advanced",
  },
  {
    title: "Seerah of the Prophet (PBUH)",
    instructor: "Ustadha Aisha Khan",
    image: "https://placehold.co/600x400.png",
    aiHint: "islamic book",
    description: "Journey through the life of Prophet Muhammad (PBUH) and derive timeless lessons for today.",
    schedule: "Sundays, 2:00 PM EST",
    level: "All Levels",
  },
  {
    title: "Fiqh of Worship",
    instructor: "Imam Omar Farooq",
    image: "https://placehold.co/600x400.png",
    aiHint: "praying mosque",
    description: "Understand the rulings and wisdom behind the core acts of worship, including Salah, Zakat, and Sawm.",
    schedule: "Thursdays, 8:00 PM EST",
    level: "Intermediate",
  },
];


export default function StudyCirclesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Community Study Circles</h1>
        <p className="text-muted-foreground">
          Join online halaqas with certified instructors to deepen your knowledge in a supportive community.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {studyCircles.map((circle, index) => (
          <Card key={index} className="flex flex-col overflow-hidden">
            <div className="relative h-40 w-full">
              <Image
                src={circle.image}
                alt={circle.title}
                fill
                className="object-cover"
                data-ai-hint={circle.aiHint}
              />
            </div>
            <CardHeader>
              <CardTitle className="font-headline">{circle.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-1 text-sm">
                <User className="w-4 h-4" /> {circle.instructor}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground text-sm leading-relaxed">{circle.description}</p>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 p-4 pt-0">
               <div className="flex flex-col gap-2 text-xs w-full">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5"/>
                    <span>{circle.schedule}</span>
                </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-3.5 h-3.5"/>
                    <Badge variant="secondary" className="font-semibold">{circle.level}</Badge>
                </div>
               </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Join Circle</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
