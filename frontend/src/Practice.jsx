import { useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Code2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "./api.js";

export default function Practice() {
  const api = useApi();
  const { isSignedIn, userId } = useAuth();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const problems = useQuery({
    queryKey: ["problems"],
    queryFn: ({ signal }) => api("/api/practice/problems", { signal }),
  });
  const stats = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: ({ signal }) => api("/api/practice/dashboard", { signal }),
    enabled: Boolean(isSignedIn),
  });
  const filtered = useMemo(() => problems.data?.filter((problem) =>
    (difficulty === "All" || difficulty === problem.difficulty)
    && [problem.title, ...problem.topics].join(" ").toLowerCase().includes(search.trim().toLowerCase())), [problems.data, difficulty, search]);

  return (
    <>
      <div className="page-heading"><div><h1>Coding practice</h1><p>Build fluency one problem at a time.</p></div></div>
      <div className="toolbar">
        <label className="search"><Search size={17} /><input aria-label="Search problems" placeholder="Search problems or topics" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="segmented" aria-label="Difficulty">
          {["All", "Easy", "Medium"].map((level) => <button key={level} aria-pressed={level === difficulty} onClick={() => setDifficulty(level)}>{level}</button>)}
        </div>
      </div>
      {problems.isPending && <p className="status-note" role="status">Loading problems…</p>}
      {problems.isError && <p className="form-error" role="alert">{problems.error.message}</p>}
      {filtered && <div className="panel list-panel">
        <div className="list-header"><span>Problem</span><span>Difficulty</span></div>
        {filtered.map((problem) => (
          <Link className="problem-row" key={problem.slug} to={"/practice/" + problem.slug}>
            <span className="icon-box violet">{stats.data?.solved.includes(problem.slug) ? <CheckCircle2 size={19} /> : <Code2 size={19} />}</span>
            <div><strong>{problem.title}</strong><p>{problem.topics.join(" · ")}</p></div>
            <span className={"difficulty " + problem.difficulty.toLowerCase()}>{problem.difficulty}</span>
            <ArrowRight size={17} />
          </Link>
        ))}
        {!filtered.length && <p className="status-note">No problems match your search.</p>}
      </div>}
    </>
  );
}
