import { useState } from "react";

import { LLMProvider } from "./hooks/LLMProvider";
import { LandingPage } from "./components/LandingPage";
import { AppShell } from "./components/AppShell";
import "katex/dist/katex.min.css";

function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="relative h-screen w-screen bg-[#09090b]">
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-500 ${
          started ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <LandingPage
          onStart={() => setStarted(true)}
          status={{ state: "idle" }}
          isLoading={false}
        />
      </div>

      {started && (
        <LLMProvider>
          <AppShell />
        </LLMProvider>
      )}
    </div>
  );
}

export default App;
