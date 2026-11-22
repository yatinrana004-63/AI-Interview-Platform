import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Link2, Plus, Users, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "./api.js";

export default function Rooms() {
  const { userId } = useAuth();
  const api = useApi();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");
  const rooms = useQuery({
    queryKey: ["rooms", userId],
    queryFn: ({ signal }) => api("/api/rooms", { signal }),
    refetchInterval: 15_000,
  });
  const create = useMutation({
    mutationFn: () => api("/api/rooms", { method: "POST", body: { title } }),
    onSuccess: (room) => {
      cache.setQueryData(["room", userId, room.id], room);
      cache.invalidateQueries({ queryKey: ["rooms", userId] });
      cache.invalidateQueries({ queryKey: ["dashboard", userId] });
      navigate("/rooms/" + room.id);
    },
  });

  function openInvite(event) {
    event.preventDefault();
    try {
      const url = new URL(inviteUrl.trim(), window.location.origin);
      if (url.origin !== window.location.origin || !/^\/rooms\/[a-f0-9]{24}$/.test(url.pathname)
        || !/^[a-f0-9]{32}$/.test(url.searchParams.get("invite") || "")) {
        throw new Error("Invalid invite");
      }
      navigate(url.pathname + url.search);
    } catch {
      setInviteError("Paste a valid Talent IQ invitation from this site.");
    }
  }

  return (
    <>
      <div className="page-heading"><div><h1>Interview rooms</h1><p>Pair with one person in a private video and chat session.</p></div></div>
      <div className="room-forms">
        <form className="panel content-panel" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <span className="icon-box violet"><Video size={20} /></span>
          <h2>Create a room</h2>
          <p>Share an invitation with your interview partner.</p>
          <label>Room name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Frontend mock interview" maxLength={80} required /></label>
          {create.isError && <p className="form-error" role="alert">{create.error.message}</p>}
          <button className="button primary" disabled={!title.trim() || create.isPending}><Plus size={17} /> {create.isPending ? "Creating…" : "Create room"}</button>
        </form>
        <form className="panel content-panel" onSubmit={openInvite}>
          <span className="icon-box blue"><Link2 size={20} /></span>
          <h2>Join with an invite</h2>
          <p>Open the link shared by your interview partner.</p>
          <label>Invitation link<input placeholder="Paste your invitation link" value={inviteUrl} onChange={(event) => { setInviteUrl(event.target.value); setInviteError(""); }} required /></label>
          {inviteError && <p className="form-error" role="alert">{inviteError}</p>}
          <button className="button secondary" disabled={!inviteUrl.trim()}>Open invitation <ArrowRight size={16} /></button>
        </form>
      </div>
      <section className="section">
        <div className="section-title"><h2>Your rooms</h2></div>
        {rooms.isPending && <p className="status-note" role="status">Loading rooms…</p>}
        {rooms.isError && <p className="form-error" role="alert">{rooms.error.message}</p>}
        {rooms.data && <div className="panel list-panel">
          {!rooms.data.length && <p className="status-note">Your rooms will appear here.</p>}
          {rooms.data.map((room) => <Link key={room.id} to={"/rooms/" + room.id} className="list-row">
            <Video size={18} /><span>{room.title}</span>
            <span className={room.status === "open" ? "difficulty easy" : "difficulty ended"}>{room.status === "open" ? <><Users size={14} /> {room.occupied}/2</> : "Ended"}</span><ArrowRight size={16} />
          </Link>)}
        </div>}
      </section>
    </>
  );
}
