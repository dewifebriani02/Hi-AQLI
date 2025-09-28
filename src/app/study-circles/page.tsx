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
    title: "Tafsir Juz' Amma",
    instructor: "Dr. Fatima Ahmed",
    image: "https://placehold.co/600x400.png",
    aiHint: "woman scholar",
    description: "Studi mendalam tentang makna dan konteks bagian terakhir Al-Qur'an, cocok untuk pemula.",
    schedule: "Sabtu, 10:00 WIB",
    level: "Pemula",
  },
  {
    title: "Tajwid Lanjutan: Sifaat Al-Huroof",
    instructor: "Syekh Yusuf Ibrahim",
    image: "https://placehold.co/600x400.png",
    aiHint: "man teaching",
    description: "Eksplorasi rinci tentang karakteristik huruf Arab (Sifaat) untuk qari berpengalaman.",
    schedule: "Senin & Rabu, 19:00 WIB",
    level: "Lanjutan",
  },
  {
    title: "Sirah Nabi (SAW)",
    instructor: "Ustadha Aisha Khan",
    image: "https://placehold.co/600x400.png",
    aiHint: "islamic book",
    description: "Perjalanan melalui kehidupan Nabi Muhammad (SAW) dan dapatkan pelajaran abadi untuk hari ini.",
    schedule: "Minggu, 14:00 WIB",
    level: "Semua Level",
  },
  {
    title: "Fikih Ibadah",
    instructor: "Imam Omar Farooq",
    image: "https://placehold.co/600x400.png",
    aiHint: "praying mosque",
    description: "Pahami hukum dan hikmah di balik ibadah inti, termasuk Salat, Zakat, dan Puasa.",
    schedule: "Kamis, 20:00 WIB",
    level: "Menengah",
  },
];


export default function StudyCirclesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Lingkar Studi Komunitas</h1>
        <p className="text-muted-foreground">
          Bergabunglah dengan halaqah online bersama instruktur bersertifikat untuk memperdalam pengetahuan Anda dalam komunitas yang suportif.
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
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Gabung Lingkar Studi</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
