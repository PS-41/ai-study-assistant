import { useEffect, useRef, useState } from "react";

type Props = {
  title?: string;
  messages?: string[];
  onCancel?: () => void; // optional (we won't wire cancel yet)
};

export default function ProgressOverlay({ title="Working…", messages, onCancel }: Props) {
  const defaultMsgs = [
    "Reading your document…",
    "Extracting key points…",
    "Composing multiple-choice stems…",
    "Balancing distractors…",
    "Checking consistency…",
    "Formatting quiz payload…"
  ];
  const steps = messages?.length ? messages : defaultMsgs;

  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number>(Date.now());

  useEffect(() => {
    const msgTimer = setInterval(() => setIdx(i => (i + 1) % steps.length), 8500);
    const elTimer  = setInterval(() => setElapsed(Math.floor((Date.now() - start.current)/1000)), 1000);
    return () => { clearInterval(msgTimer); clearInterval(elTimer); };
  }, [steps.length]);

  const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
  const ss = String(elapsed%60).padStart(2,'0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <Spinner />
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-sm text-gray-600">{steps[idx]}</div>
          </div>
          <div className="ml-auto text-sm text-gray-500 tabular-nums">{mm}:{ss}</div>
        </div>
        {/* Optional cancel */}
        {onCancel && (
          <div className="mt-4 text-right">
            <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
  );
}
