import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CallingState, ScreenShareButton, SpeakerLayout, StreamCall, StreamTheme, StreamVideo,
  StreamVideoClient, ToggleAudioPublishingButton, ToggleVideoPublishingButton, useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { StreamChat } from "stream-chat";
import { ArrowLeft, ArrowUpRight, Circle, Code2, Copy, Link2, MessageSquare, PhoneOff, Send, Users, Video } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "./api.js";
import "@stream-io/video-react-sdk/dist/css/styles.css";

const CodeEditor = lazy(() => import("./CodeEditor.jsx"));

function CallSurface({ leave, isHost, url }) {
  const api = useApi();
  const { useIsCallRecordingInProgress, useCallCallingState } = useCallStateHooks();
  const recording = useIsCallRecordingInProgress();
  const callState = useCallCallingState();
  const action = useMutation({
    mutationFn: (record) => api(url + "/recording", { method: "PUT", body: { record } }),
  });

  if (callState === CallingState.LEFT) {
    return <div className="empty video-wait"><Video size={24} /><p>You left the call.</p><button className="button secondary" onClick={leave}>Back to the room</button></div>;
  }

  return (
    <>
      <div className="video-stage"><SpeakerLayout /></div>
      <div className="call-toolbar">
        <ToggleAudioPublishingButton />
        <ToggleVideoPublishingButton />
        <ScreenShareButton />
        {isHost && <button className="icon-button record-button" aria-label={recording ? "Stop recording" : "Start recording"} title={recording ? "Stop recording" : "Start recording"} aria-pressed={recording} disabled={action.isPending} onClick={() => {
          if (recording || window.confirm("Start recording this call? Make sure everyone has agreed to be recorded.")) action.mutate(!recording);
        }}><Circle size={18} fill={recording ? "currentColor" : "none"} /></button>}
        <button className="icon-button danger" aria-label="Leave call" title="Leave call" onClick={leave}><PhoneOff size={18} /></button>
      </div>
      {recording && <p className="recording-notice" role="status"><Circle size={10} fill="currentColor" /> This call is being recorded</p>}
      {action.isError && <p className="form-error padded" role="alert">{action.error.message}</p>}
    </>
  );
}

function VideoPane({ connection, url, leave, isHost }) {
  const api = useApi();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let client;
    let call;
    let token = connection.videoToken;

    async function setup() {
      await Promise.resolve();
      if (cancelled) return;
      client = new StreamVideoClient({
        apiKey: connection.apiKey,
        user: connection.user,
        tokenProvider: async () => {
          if (token) {
            const initial = token;
            token = undefined;
            return initial;
          }
          return (await api(url + "/connection", { method: "POST" })).videoToken;
        },
      });
      call = client.call(connection.callType, connection.callId);
      await call.join();
      if (!cancelled) setSession({ client, call });
    }

    setup().catch((issue) => {
      if (!cancelled) setError(issue.message || "Could not join the video call.");
    });
    return () => {
      cancelled = true;
      if (call) void call.leave().catch(() => {}).finally(() => client.disconnectUser().catch(() => {}));
    };
  }, [api, connection, url]);

  if (error) return <div className="empty video-wait"><Video size={24} /><p className="form-error" role="alert">{error}</p><button className="button secondary" onClick={leave}>Back to the room</button></div>;
  if (!session) return <div className="empty video-wait" role="status"><Video size={24} /><p>Connecting video…</p></div>;

  return (
    <StreamVideo client={session.client}>
      <StreamCall call={session.call}>
        <StreamTheme className="str-video__theme--dark">
          <CallSurface leave={leave} isHost={isHost} url={url} />
        </StreamTheme>
      </StreamCall>
    </StreamVideo>
  );
}

function RoomChat({ connection, url, code }) {
  const api = useApi();
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const feed = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let client;
    let activeChannel;
    let listener;
    let token = connection.chatToken;

    async function setup() {
      await Promise.resolve();
      if (cancelled) return;
      client = new StreamChat(connection.apiKey);
      await client.connectUser(connection.user, async () => {
        if (token) {
          const initial = token;
          token = undefined;
          return initial;
        }
        return (await api(url + "/connection", { method: "POST" })).chatToken;
      });
      if (cancelled) return;
      activeChannel = client.channel(connection.channelType, connection.channelId);
      listener = activeChannel.on("message.new", ({ message }) => {
        if (!cancelled && message) setMessages((current) =>
          current.some((entry) => entry.id === message.id) ? current : [...current, message]);
      });
      const watched = await activeChannel.watch({ messages: { limit: 40 } });
      if (!cancelled) {
        setMessages((current) => [...new Map([...watched.messages, ...current].map((message) => [message.id, message])).values()]);
        setChannel(activeChannel);
      }
    }

    setup().catch((issue) => {
      if (!cancelled) setError(issue.message || "Could not connect to room chat.");
    });
    return () => {
      cancelled = true;
      listener?.unsubscribe();
      if (client) void client.disconnectUser().catch(() => {});
    };
  }, [api, connection, url]);

  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages]);

  const send = useMutation({
    mutationFn: (text) => channel.sendMessage({ text }),
    onSuccess: () => setDraft(""),
  });

  return (
    <section className="panel room-chat">
      <div className="panel-bar"><h2><MessageSquare size={17} /> Room chat</h2></div>
      <div className="chat-feed" aria-live="polite" ref={feed}>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!error && !channel && <p className="status-note">Connecting chat…</p>}
        {channel && messages.length === 0 && <p className="status-note">Say hello to your interview partner.</p>}
        {messages.map((message) => <div key={message.id} className={"chat-message " + (message.user?.id === connection.user.id ? "mine" : "")}>
          <strong>{message.user?.id === connection.user.id ? "You" : message.user?.name || "Partner"}</strong><p>{message.text}</p>
        </div>)}
      </div>
      {send.isError && <p className="form-error padded" role="alert">{send.error.message}</p>}
      <form className="composer" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && channel) send.mutate(draft.trim()); }}>
        <textarea rows="1" aria-label="Room message" placeholder="Write a message…" value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)} />
        <button className="button primary" aria-label="Send message" disabled={!channel || !draft.trim() || send.isPending}><Send size={16} /></button>
      </form>
      <button type="button" className="text-link share-code" disabled={!channel || send.isPending || !code.trim() || code.length > 3900} onClick={() => setDraft("Code snippet:\n" + code)}>Share code in chat</button>
    </section>
  );
}

function RecorderLinks({ url, userId }) {
  const api = useApi();
  const links = useQuery({
    queryKey: ["recordings", userId, url],
    queryFn: ({ signal }) => api(url + "/recordings", { signal }),
    refetchInterval: 20_000,
  });

  return <section className="panel content-panel recording-panel">
    <h2>Recordings</h2>
    {links.isPending && <p role="status">Checking recordings…</p>}
    {links.isError && <p className="form-error" role="alert">{links.error.message}</p>}
    {links.data?.length === 0 && <p>No recordings are ready. A recording can take a few minutes to appear.</p>}
    {links.data?.map((recording) => <a key={recording.filename} className="text-link" href={recording.url} target="_blank" rel="noreferrer">
      {recording.startedAt ? new Date(recording.startedAt).toLocaleString() : "View recording"} <ArrowUpRight size={16} />
    </a>)}
  </section>;
}

function InterviewWorkspace({ id, invite }) {
  const { userId } = useAuth();
  const api = useApi();
  const cache = useQueryClient();
  const [code, setCode] = useState("// Interview scratchpad\n");
  const [copyState, setCopyState] = useState("");
  const url = "/api/rooms/" + id;
  const key = ["room", userId, id];
  const room = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api(url, { signal }),
    refetchInterval: 10_000,
  });
  const join = useMutation({
    mutationFn: () => api(url + "/join", { method: "POST", body: { invite } }),
    onSuccess: (data) => {
      cache.setQueryData(key, data);
      cache.invalidateQueries({ queryKey: ["rooms", userId] });
      cache.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });
  const connect = useMutation({
    mutationFn: () => api(url + "/connection", { method: "POST" }),
  });
  const end = useMutation({
    mutationFn: () => api(url + "/end", { method: "POST" }),
    onSuccess: (data) => {
      connect.reset();
      cache.setQueryData(key, data);
      cache.invalidateQueries({ queryKey: ["rooms", userId] });
      cache.invalidateQueries({ queryKey: ["dashboard", userId] });
    },
  });

  if (room.isPending) return <p className="status-note" role="status">Loading interview room…</p>;
  if (!room.data) return <section className="empty panel">
    <span className="icon-box blue"><Link2 size={22} /></span><h1>{invite ? "Interview invitation" : "Room unavailable"}</h1>
    {invite ? <p>Accept the invitation to reserve the guest seat.</p> : <p>{room.error?.message}</p>}
    {join.isError && <p className="form-error" role="alert">{join.error.message}</p>}
    <div className="inline"><Link to="/rooms" className="button secondary">Back to rooms</Link>
      {invite && <button className="button primary" disabled={join.isPending} onClick={() => join.mutate()}>{join.isPending ? "Joining…" : "Accept invitation"}</button>}
    </div>
  </section>;

  const data = room.data;
  const inviteLink = data.invite ? window.location.origin + "/rooms/" + id + "?invite=" + data.invite : null;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyState("Invitation copied");
    } catch {
      setCopyState("Select and copy the link below.");
    }
  }

  return (
    <>
      <Link to="/rooms" className="back-link"><ArrowLeft size={17} /> Interview rooms</Link>
      <div className="page-heading">
        <div><h1>{data.title}</h1><p className="inline"><Users size={16} /> {data.status === "open" ? data.occupied + " of 2 seats reserved" : "Interview ended"}</p></div>
        <div className="inline">
          {inviteLink && <button className="button secondary" onClick={copyInvite}><Copy size={16} /> Copy invite</button>}
          {data.isHost && data.status === "open" && <button className="button secondary" disabled={end.isPending} onClick={() => {
            if (window.confirm("End the interview for all participants?")) end.mutate();
          }}>End room</button>}
        </div>
      </div>
      {copyState && <p className="status-note" role="status">{copyState}</p>}
      {copyState.startsWith("Select") && <input readOnly aria-label="Invitation link" value={inviteLink || ""} />}
      {end.isError && <p className="form-error" role="alert">{end.error.message}</p>}
      {data.status === "ended" ? <RecorderLinks url={url} userId={userId} /> : <>
        <div className="room-grid">
          <section className="panel video-panel">
            <div className="panel-bar"><h2><Video size={17} /> Video interview</h2></div>
            {connect.data ? <VideoPane connection={connect.data} url={url} leave={connect.reset} isHost={data.isHost} /> :
              <div className="empty video-wait">
                <span className="icon-box violet"><Video size={25} /></span>
                <h2>{data.occupied === 1 ? "Ready for your partner" : "Ready to join"}</h2>
                <p>Your microphone and camera start off. Turn them on when you’re ready.</p>
                {connect.isError && <p className="form-error" role="alert">{connect.error.message}</p>}
                <button className="button primary" disabled={connect.isPending} onClick={() => connect.mutate()}>
                  {connect.isPending ? "Opening room…" : "Open room"}
                </button>
              </div>}
          </section>
          {connect.data && <RoomChat connection={connect.data} url={url} code={code} />}
        </div>
        <section className="panel editor-panel room-editor">
          <div className="panel-bar"><h2><Code2 size={17} /> Interview scratchpad</h2><span className="muted">JavaScript</span></div>
          <Suspense fallback={<p className="status-note">Loading code editor…</p>}><CodeEditor code={code} setCode={setCode} language="javascript" height="270px" /></Suspense>
        </section>
      </>}
    </>
  );
}

export default function Interview() {
  const { id } = useParams();
  const [search] = useSearchParams();
  return <InterviewWorkspace key={id} id={id} invite={search.get("invite")} />;
}
