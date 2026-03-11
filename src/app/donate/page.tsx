'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DonateRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/berbagi');
  }, [router]);

  return (
    <div className="flex justify-center py-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
    </div>
  );
}
