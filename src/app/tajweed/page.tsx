import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tajweedRules = [
  {
    title: "Noon Sakinah and Tanween",
    category: "Articulation",
    content: "Rules governing the pronunciation of a non-voweled Noon (نْ) or Tanween (ـًـــٍـــٌ) when followed by certain letters. This includes Izhar (clear pronunciation), Idgham (merging), Iqlab (conversion), and Ikhfa (hiding).",
  },
  {
    title: "Meem Sakinah",
    category: "Articulation",
    content: "Rules for a non-voweled Meem (مْ). This includes Ikhfa Shafawi (hiding), Idgham Shafawi (merging), and Izhar Shafawi (clear pronunciation), depending on the letter that follows.",
  },
  {
    title: "Qalqalah",
    category: "Echoing",
    content: "The echoing or vibrating sound made on certain letters (ق ط ب ج د) when they have a sukoon. There are different levels of Qalqalah depending on the letter's position in the word.",
  },
  {
    title: "Madd (Elongation)",
    category: "Vowels",
    content: "The prolongation of vowel sounds. There are many types, such as Madd Asli (natural madd) and Madd Far'i (secondary madd), each with specific rules for its length.",
  },
  {
    title: "Rules of Laam",
    category: "Letters",
    content: "Rules concerning the letter Laam (ل), particularly in the name of Allah (الله). It can be pronounced with a heavy sound (Tafkheem) or a light sound (Tarqeeq) depending on the preceding vowel.",
  },
  {
    title: "Rules of Raa",
    category: "Letters",
    content: "Rules for the letter Raa (ر). Similar to Laam, it can be pronounced with a heavy (Tafkheem) or light (Tarqeeq) sound based on its vowel and the vowels of surrounding letters.",
  },
];


export default function TajweedPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Interactive Tajweed Modules</h1>
        <p className="text-muted-foreground">
          Master the art of Quranic recitation by studying the essential rules of Tajweed.
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
                    <CardTitle>Test Your Knowledge</CardTitle>
                    <CardDescription>Take a quiz to check your understanding of the rules.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Quizzes are a great way to reinforce learning. Challenge yourself after reviewing the modules.</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Start Quiz</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
