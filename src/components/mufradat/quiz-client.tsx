"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";

const quizQuestions = [
  {
    question: "Apa hukum Nun Sakinah (نْ) bertemu dengan huruf Ba (ب)?",
    options: ["Idgham", "Iqlab", "Ikhfa", "Izhar"],
    answer: "Iqlab",
  },
  {
    question: "Huruf-huruf berikut ini yang termasuk huruf Qalqalah adalah...",
    options: ["ق ط ب ج د", "ي ن م و", "ا و ي", "ل ر"],
    answer: "ق ط ب ج د",
  },
  {
    question: "Berapa panjang harakat untuk Mad Wajib Muttasil?",
    options: ["2 harakat", "2, 4, atau 6 harakat", "4 atau 5 harakat", "6 harakat"],
    answer: "4 atau 5 harakat",
  },
];

type AnswersState = { [key: number]: string };
type ResultsState = { [key: number]: boolean };

export function QuizClient() {
  const [answers, setAnswers] = useState<AnswersState>({});
  const [results, setResults] = useState<ResultsState | null>(null);

  const handleValueChange = (questionIndex: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = () => {
    const newResults: ResultsState = {};
    quizQuestions.forEach((q, index) => {
      newResults[index] = answers[index] === q.answer;
    });
    setResults(newResults);
  };

  const handleReset = () => {
    setAnswers({});
    setResults(null);
  }

  const score = results ? Object.values(results).filter(Boolean).length : 0;
  const total = quizQuestions.length;

  return (
    <div className="space-y-8">
      {results ? (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Hasil Kuis Ukhti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Skor Ukhti: {score} / {total}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReset}>Coba Lagi</Button>
          </CardFooter>
        </Card>
      ) : (
        quizQuestions.map((q, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                Pertanyaan {index + 1}: <span className="font-normal">{q.question}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[index]}
                onValueChange={(value) => handleValueChange(index, value)}
              >
                {q.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${index}-${option}`} />
                    <Label htmlFor={`${index}-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))
      )}

      {!results && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={Object.keys(answers).length !== quizQuestions.length}>
            Kirim Jawaban
          </Button>
        </div>
      )}
    </div>
  );
}
