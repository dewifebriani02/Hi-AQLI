import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function getCallSign(salutation: string | null | undefined): string {
  const raw = salutation || "Ukhti";
  if (raw === 'Kakak') return 'Kak';
  return raw;
}
