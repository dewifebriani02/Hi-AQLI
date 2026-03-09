
"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Medal, Users, Clock, User, BookOpen, Star, ArrowRight, CheckCircle2, PlayCircle, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const studyCircles = [
  {
    id: "1",
    title: "Tafsir Juz' Amma",
    instructor: "Dr. Fatima Ahmed",
    description: "Studi mendalam tentang makna dan konteks bagian terakhir Al-Qur'an, cocok untuk pemula.",
    schedule: "Sabtu, 10:00 WIB",
    level: "Pemula",
    lessons: [
      { id: "l1", title: "Pengantar Juz 30", duration: "15 mnt", completed: true },
      { id: "l2", title: "Tafsir Surah An-Naba Part 1", duration: "25 mnt", completed: true },
      { id: "l3", title: "Tafsir Surah An-Naba Part 2", duration: "20 mnt", completed: false },
      { id: "l4", title: "Hikmah Surah An-Naziat", duration: "30 mnt", completed: false, locked: true },
    ]
  },
  {
    id: "2",
    title: "Tajwid Lanjutan: Sifaat Al-Huroof",
    instructor: "Syekh Yusuf Ibrahim",
    description: "Eksplorasi rinci tentang karakteristik huruf Arab (Sifaat) untuk qari berpengalaman.",
    schedule: "Senin & Rabu, 19:00 WIB",
    level: "Lanjutan",
    lessons: [
      { id: "l1", title: "Review Makharij", duration: "20 mnt", completed: true },
      { id: "l2", title: "Sifat-sifat Berlawanan", duration: "45 mnt", completed: false },
      { id: "l3", title: "Sifat-sifat Tak Berlawanan", duration: "45 mnt", completed: false, locked: true },
    ]
  },
];

const mockGroupLeaderboard = [
  { name: "Abdullah Mansur", points: 2450, rank: 1, avatar: "https://picsum.photos/seed/user1/100/100", level: "Hafiz" },
  { name: "Siti Aminah", points: 2200, rank: 2, avatar: "https://picsum.photos/seed/user2/100/100", level: "Alim" },
  { name: "Yusuf Ibrahim", points: 2150, rank: 3, avatar: "https://picsum.photos/seed/user3/100/100", level: "Alim" },
  { name: "Fatimah Az-Zahra", points: 1900, rank: 4, avatar: "https://picsum.photos/seed/user4/100/100", level: "Murid" },
  { name: "Ahmad Fauzi", points: 1800, rank: 5, avatar: "https://picsum.photos/seed/user5/100/100", level: "Murid" },
];

export default function StudyCircleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const circle = studyCircles.find(c => c.id === id) || studyCircles[0];
  const lessonsRef = useRef<HTMLDivElement>(null);

  const scrollToLessons = () => {
    lessonsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLessonAction = (lesson: any) => {
    if (lesson.locked) {
      toast({
        variant: "destructive",
        title: "Materi Terkunci",
        description: "Selesaikan materi sebelumnya untuk membuka bab ini.",
      });
      return;
    }
    
    toast({
      title: "Mulai Belajar",
      description: `Menyiapkan materi: ${lesson.title}. Silakan tunggu...`,
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-32">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-1">
        <Button asChild variant="ghost" size="icon">
          <Link href="/study-circles">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">{circle.title}</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#800000] font-bold">Materi Halaqah • Detail & Peringkat</p>
        </div>
      </div>

      {/* Circle Info Header */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#800000] to-[#b30000] opacity-90" />
        <CardContent className="pt-0 px-6 pb-6">
          <div className="relative -top-10 flex flex-col gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-white text-[#800000]">
              <BookOpen className="w-10 h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold font-headline">{circle.title}</h2>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#800000]" />
                  <span>{circle.instructor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#800000]" />
                  <span>{circle.schedule}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 border-[#800000]/20 text-[#800000] uppercase">
                  {circle.level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {circle.description}
              </p>
            </div>
            <Button 
              onClick={scrollToLessons}
              className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold shadow-lg h-12 mt-2"
            >
              Lanjutkan Belajar <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lesson List Section */}
      <div ref={lessonsRef} className="space-y-4 px-1 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg font-headline">Daftar Materi Pembelajaran</h3>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{circle.lessons.length} Modul</span>
        </div>
        
        <div className="grid gap-3">
          {circle.lessons.map((lesson, idx) => (
            <Card 
              key={lesson.id} 
              className={cn(
                "border-none shadow-sm transition-all select-none ring-0 outline-none",
                lesson.locked ? "opacity-60 bg-muted/30" : "hover:bg-accent/50 cursor-pointer bg-card/50"
              )}
              onClick={() => handleLessonAction(lesson)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    lesson.completed ? "bg-emerald-100 text-emerald-600" : 
                    lesson.locked ? "bg-muted text-muted-foreground" : "bg-[#800000]/10 text-[#800000]"
                  )}>
                    {lesson.completed ? <CheckCircle2 className="w-5 h-5" /> : 
                     lesson.locked ? <Lock className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{idx + 1}. {lesson.title}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{lesson.duration} • {lesson.completed ? "Selesai" : lesson.locked ? "Terkunci" : "Tersedia"}</span>
                  </div>
                </div>
                {!lesson.locked && <ArrowRight className="w-4 h-4 text-muted-foreground/30" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard Section Per Halaqah */}
      <div className="space-y-4 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#D4AF37] fill-current" />
            <h3 className="font-bold text-lg font-headline">Peringkat Kelompok</h3>
          </div>
          <Badge className="bg-[#D4AF37] text-black border-none font-bold text-[10px]">AKTIF</Badge>
        </div>

        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="p-0">
            <div className="divide-y">
              {mockGroupLeaderboard.map((user) => (
                <div key={user.name} className="flex items-center justify-between p-4 hover:bg-white/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                      user.rank === 1 ? "bg-[#D4AF37] text-white border-white" : 
                      user.rank === 2 ? "bg-slate-300 text-slate-800 border-white" :
                      user.rank === 3 ? "bg-amber-600 text-white border-white" : "bg-muted text-muted-foreground border-transparent"
                    )}>
                      {user.rank}
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[8px] h-4 font-bold uppercase tracking-tighter px-1.5 py-0">
                          {user.level}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">{user.points.toLocaleString()} Poin Grup</span>
                      </div>
                    </div>
                  </div>
                  {user.rank <= 3 && (
                    <div className="flex items-center gap-1">
                      <Star className={cn("w-3 h-3 fill-current", user.rank === 1 ? "text-[#D4AF37]" : "text-muted-foreground/30")} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
