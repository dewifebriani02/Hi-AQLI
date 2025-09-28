import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const tajweedRules = [
  {
    title: "Nun Sakinah dan Tanwin",
    category: "Artikulasi",
    content: "Aturan yang mengatur pengucapan Nun tanpa harakat (نْ) atau Tanwin (ـًـــٍـــٌ) ketika diikuti oleh huruf-huruf tertentu. Ini termasuk Izhar (jelas), Idgham (melebur), Iqlab (mengubah), dan Ikhfa (menyembunyikan).",
  },
  {
    title: "Mim Sakinah",
    category: "Artikulasi",
    content: "Aturan untuk Mim tanpa harakat (مْ). Ini termasuk Ikhfa Syafawi (menyembunyikan), Idgham Syafawi (melebur), dan Izhar Syafawi (jelas), tergantung pada huruf yang mengikutinya.",
  },
  {
    title: "Qalqalah",
    category: "Pantulan",
    content: "Suara memantul atau bergetar yang dibuat pada huruf-huruf tertentu (ق ط ب ج د) ketika mereka memiliki sukun. Ada berbagai tingkat Qalqalah tergantung pada posisi huruf dalam kata.",
  },
  {
    title: "Madd (Panjang)",
    category: "Vokal",
    content: "Perpanjangan suara vokal. Ada banyak jenis, seperti Madd Asli (madd alami) dan Madd Far'i (madd sekunder), masing-masing dengan aturan khusus untuk panjangnya.",
  },
  {
    title: "Hukum Lam",
    category: "Huruf",
    content: "Aturan mengenai huruf Lam (ل), terutama dalam nama Allah (الله). Bisa diucapkan dengan suara tebal (Tafkhim) atau suara tipis (Tarqiq) tergantung pada vokal sebelumnya.",
  },
  {
    title: "Hukum Ra",
    category: "Huruf",
    content: "Aturan untuk huruf Ra (ر). Mirip dengan Lam, bisa diucapkan dengan suara tebal (Tafkhim) atau tipis (Tarqiq) berdasarkan vokal dan vokal huruf di sekitarnya.",
  },
];


export default function TajweedPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Modul Tajwid Interaktif</h1>
        <p className="text-muted-foreground">
          Kuasai seni tilawah Al-Qur'an dengan mempelajari aturan-aturan penting Tajwid.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
            <Accordion type="single" collapsible className="w-full">
            {tajweedRules.map((rule, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-lg font-headline hover:no-underline">
                    <div className="flex items-center gap-4">
                        {rule.title}
                        <Badge variant="outline">{rule.category}</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                    {rule.content}
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </div>
        <div className="md:col-span-4">
            <Card>
                <CardHeader>
                    <CardTitle>Uji Pengetahuan Anda</CardTitle>
                    <CardDescription>Ikuti kuis untuk memeriksa pemahaman Anda tentang aturan-aturan tersebut.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Kuis adalah cara yang bagus untuk memperkuat pembelajaran. Tantang diri Anda setelah meninjau modul.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/tajweed-quiz">Mulai Kuis</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
