import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUp, Mic, MicOff, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useApi } from "./api.js";

const topics = ["Data structures", "System design", "Behavioral"];

export default function Assistant() {
  const api = useApi();
  const [topic, setTopic] = useState(topics[0]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognition = useRef(null);
  const feed = useRef(null);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supportsSpeech = "speechSynthesis" in window;
  const chat = useMutation({
    mutationFn: (turns) => api("/api/assistant", { method: "POST", body: { topic, messages: turns.slice(-21) } }),
    onSuccess: ({ reply }, turns) => {
      setMessages([...turns, { role: "assistant", text: reply }]);
      setDraft("");
      if (speaking && supportsSpeech) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    },
  });

  useEffect(() => () => {
    recognition.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages, chat.isPending]);

  function send(text) {
    if (!text.trim() || chat.isPending) return;
    chat.mutate([...messages, { role: "user", text: text.trim() }]);
  }

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const session = new SpeechRecognition();
    session.lang = navigator.language || "en-US";
    session.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setDraft((value) => [value, transcript].filter(Boolean).join(" ").slice(0, 4000));
    };
    session.onerror = () => setVoiceError("Speech recognition failed. Check your microphone permissions or type your answer.");
    session.onend = () => setListening(false);
    recognition.current = session;
    setVoiceError("");
    try {
      session.start();
      setListening(true);
    } catch {
      setVoiceError("Could not start speech recognition.");
    }
  }

  function reset() {
    recognition.current?.abort();
    window.speechSynthesis?.cancel();
    setMessages([]);
    setDraft("");
    setVoiceError("");
    chat.reset();
  }

  const displayed = chat.isPending ? chat.variables : messages;

  return (
    <>
      <div className="page-heading"><div><h1>AI interviewer</h1><p>Practice your reasoning out loud and get feedback.</p></div></div>
      <section className="panel assistant">
        <div className="panel-bar">
          <label className="inline"><Sparkles size={17} /> <select aria-label="Interview topic" value={topic} disabled={messages.length > 0 || chat.isPending} onChange={(event) => setTopic(event.target.value)}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="inline">
            {supportsSpeech && <button className="icon-button" aria-label="Read replies aloud" title="Read replies aloud" aria-pressed={speaking} onClick={() => {
              if (speaking) window.speechSynthesis.cancel();
              setSpeaking(!speaking);
            }}>{speaking ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>}
            <button className="icon-button" title="Reset conversation" aria-label="Reset conversation" disabled={chat.isPending} onClick={reset}><RotateCcw size={17} /></button>
          </div>
        </div>
        <div className="conversation" ref={feed} aria-live="polite">
          {displayed.length === 0 && <div className="coach-intro">
            <span className="icon-box teal"><Sparkles size={24} /></span>
            <h2>Ready when you are.</h2>
            <p>Choose a topic and start a mock interview, or ask a question of your own.</p>
            <button className="button primary" onClick={() => send("Start my mock interview. Please ask the first question.")}>Start mock interview</button>
          </div>}
          {displayed.map(({ role, text }, index) => <div key={index} className={"message " + role}><strong>{role === "assistant" ? "AI interviewer" : "You"}</strong><p>{text}</p></div>)}
          {chat.isPending && <p className="status-note" role="status">The interviewer is responding…</p>}
        </div>
        {(chat.isError || voiceError) && <p className="form-error assistant-error" role="alert">{chat.error?.message || voiceError}</p>}
        <form className="composer" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
          <textarea aria-label="Your answer" rows="2" maxLength={4000} placeholder={listening ? "Listening…" : "Type your answer…"} value={draft} onChange={(event) => setDraft(event.target.value)} />
          {SpeechRecognition && <button type="button" className="icon-button" aria-pressed={listening} title="Dictate your answer" aria-label="Dictate your answer" disabled={chat.isPending} onClick={toggleMic}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>}
          <button className="button primary" disabled={!draft.trim() || chat.isPending} aria-label="Send answer"><ArrowUp size={18} /></button>
        </form>
        <div className="assistant-footer">
          <small>{SpeechRecognition ? "Use the mic to dictate, then review and send your answer." : "Voice input isn’t available in this browser. You can type your answer."}</small>
          {messages.length > 0 && <button className="text-link" type="button" disabled={chat.isPending} onClick={() => send("Please wrap up the interview and summarize my feedback.")}>Get final feedback</button>}
        </div>
      </section>
    </>
  );
}
