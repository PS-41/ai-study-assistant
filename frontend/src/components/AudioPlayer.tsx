import { useRef, useState, useEffect } from "react";
import { api } from "../lib/api";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";

interface Props {
  summaryId: number;
  hasAudio: boolean;
  onGenerate: (voice: string) => Promise<void>;
}

export default function AudioPlayer({ summaryId, hasAudio, onGenerate }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [voice, setVoice] = useState("us"); 
  const [generating, setGenerating] = useState(false);
  
  // We use a cache-buster to force the audio element to reload when file changes
  const [audioKey, setAudioKey] = useState(Date.now());
  const [exists, setExists] = useState(hasAudio);

  useEffect(() => {
    setExists(hasAudio);
  }, [hasAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(voice);
      setExists(true);
      // Update key to force browser to re-fetch the file (bypassing cache)
      setAudioKey(Date.now());
      
      // Auto-reload the audio element
      if (audioRef.current) {
        audioRef.current.load();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm mb-8 animate-in fade-in">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Audio Summary</h4>
            {!exists && <p className="text-xs text-gray-500">Convert text to speech</p>}
          </div>
        </div>
        
        {/* Playback Speed Controls (Only visible if audio exists) */}
        {exists && (
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
            {[1, 1.25, 1.5, 2].map(rate => (
                <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all ${playbackRate === rate ? "bg-white shadow-sm text-purple-700 font-bold ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                >
                    {rate}x
                </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Audio Element */}
      {exists && (
        <div className="mb-5 bg-gray-50/50 rounded-lg p-2 border border-gray-100">
          <audio 
            ref={audioRef}
            controls 
            className="w-full h-10 focus:outline-none"
            // Append timestamp to URL to bypass browser cache after regeneration
            src={`${apiOrigin}/api/summaries/${summaryId}/audio?t=${audioKey}`} 
            onError={(e) => console.error("Audio load error", e)}
          />
        </div>
      )}

      {/* Generation Controls (Always Visible) */}
      <div className={`flex items-center gap-3 ${exists ? "pt-4 border-t border-gray-100" : ""}`}>
        <div className="relative flex-1 max-w-xs">
            <select 
                className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all cursor-pointer hover:bg-white"
                value={voice}
                onChange={e => setVoice(e.target.value)}
                disabled={generating}
            >
                <option value="us">🇺🇸 US English</option>
                <option value="uk">🇬🇧 UK English</option>
                <option value="aus">🇦🇺 Australian</option>
                <option value="ind">🇮🇳 Indian English</option>
                <option value="ca">🇨🇦 Canadian</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>

        <button 
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 bg-white border border-purple-200 text-purple-700 text-sm px-4 py-2.5 rounded-lg hover:bg-purple-50 active:bg-purple-100 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
        >
            {generating ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                </>
            ) : exists ? (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg>
                    Regenerate Audio
                </>
            ) : (
                <>Generate Audio</>
            )}
        </button>

        {exists && (
            <a 
                href={`${apiOrigin}/api/summaries/${summaryId}/audio?t=${audioKey}`} 
                download 
                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100"
                title="Download MP3"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
        )}
      </div>
    </div>
  );
}