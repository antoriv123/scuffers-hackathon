"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

export function Toast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, 2400);
    return () => clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 toast-up">
      <div className="bg-[#0A0A0A] text-[#ffffff] text-sm px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 border border-[#2b7551]">
        <Check className="w-4 h-4 text-[#2b7551]" />
        {message}
      </div>
    </div>
  );
}
