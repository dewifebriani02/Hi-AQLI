
"use client";

import { useState, useRef } from "react";
import { Mic, Square, LoaderCircle, AudioLines, FileCheck2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitRecitation } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type Feedback = {
  feedback: string;
  suggestions: string;
} | null;

export function TilawahClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setFeedback(null);
      setError(null);
      setAudioURL(null);
      setAudioDataUri(null);
      setIsRecording(true);
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/wav' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
        };

        // Stop all tracks on the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Tidak dapat mengakses mikrofon. Mohon izinkan akses mikrofon di pengaturan browser Ukhti.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleGetFeedback = async () => {
    if (!audioDataUri) return;
    setIsLoading(true);
    setFeedback(null);
    setError(null);
    try {
      const result = await submitRecitation(audioDataUri);
      setFeedback(result);
    } catch (error: any) {
      console.error("Error submitting recitation:", error);
      setError(error.message || "Terjadi kesalahan. Silakan coba lagi nanti.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4">
      <Button
        onClick={handleRecordClick}
        disabled={isLoading}
        size="lg"
        className="w-48 h-16 rounded-full text-lg font-bold transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl data-[recording=true]:bg-destructive"
        data-recording={isRecording}
      >
        {isRecording ? (
          <>
            <Square className="mr-2" /> Berhenti
          </>
        ) : (
          <>
            <Mic className="mr-2" /> Rekam
          </>
        )}
      </Button>
      
      {audioURL && (
        <div className="w-full max-w-lg flex flex-col items-center gap-4">
          <div className="w-full">
            <h3 className="font-semibold mb-2">Tilawah Ukhti:</h3>
            <audio controls src={audioURL} className="w-full" />
          </div>
          <Button onClick={handleGetFeedback} disabled={isLoading || !audioDataUri}>
            {isLoading ? <LoaderCircle className="animate-spin" /> : "Dapatkan Umpan Balik"}
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="w-full max-w-lg">
           <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {feedback && (
        <Alert className="w-full max-w-lg">
          <AudioLines className="h-4 w-4" />
          <AlertTitle>Analisis Tilawah Selesai</AlertTitle>
          <AlertDescription className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Umpan Balik
              </div>
              <p>{feedback.feedback}</p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Lightbulb className="h-4 w-4 text-accent" />
                Saran
              </div>
              <p>{feedback.suggestions}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
