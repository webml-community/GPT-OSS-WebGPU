import { useState, useEffect } from "react";

import { useLLM } from "../hooks/useLLM";
import { LandingPage } from "./LandingPage";
import { ChatApp } from "./ChatApp";

export function AppShell() {
  const { status } = useLLM();
  const isReady = status.state === "ready";
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (isReady) {
      const t = setTimeout(() => setShowChat(true), 300);
      return () => clearTimeout(t);
    }
  }, [isReady]);

  return (
    <>
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-500 ${
          showChat ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <LandingPage onStart={() => {}} status={status} isLoading={true} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showChat ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChatApp />
      </div>
    </>
  );
}
