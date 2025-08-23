"use client";

import { useState, useRef } from "react";
import { Mic, Square, LoaderCircle, AudioLines, FileCheck2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitRecitation } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";

type Feedback = {
  feedback: string;
  suggestions: string;
} | null;

export function TilawahClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setFeedback(null);
      setAudioURL(null);
      setIsRecording(true);
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setIsLoading(true);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const result = await submitRecitation(base64Audio);
            setFeedback(result);
          } catch (error) {
            console.error("Error submitting recitation:", error);
            setFeedback({
              feedback: "An error occurred.",
              suggestions: "Please try again later.",
            });
          } finally {
            setIsLoading(false);
            // Stop all tracks on the stream
            stream.getTracks().forEach(track => track.stop());
          }
        };
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      // You might want to show an error message to the user here
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

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4">
      <Button
        onClick={handleRecordClick}
        disabled={isLoading}
        size="lg"
        className="w-48 h-16 rounded-full text-lg font-bold transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl data-[recording=true]:bg-destructive"
        data-recording={isRecording}
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin" />
        ) : isRecording ? (
          <>
            <Square className="mr-2" /> Stop
          </>
        ) : (
          <>
            <Mic className="mr-2" /> Record
          </>
        )}
      </Button>
      
      {audioURL && !isLoading && (
        <div className="w-full max-w-lg">
          <h3 className="font-semibold mb-2">Your Recitation:</h3>
          <audio controls src={audioURL} className="w-full" />
        </div>
      )}

      {feedback && (
        <Alert className="w-full max-w-lg">
          <AudioLines className="h-4 w-4" />
          <AlertTitle>Recitation Analysis Complete</AlertTitle>
          <AlertDescription className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Feedback
              </div>
              <p>{feedback.feedback}</p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Lightbulb className="h-4 w-4 text-accent" />
                Suggestions
              </div>
              <p>{feedback.suggestions}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
