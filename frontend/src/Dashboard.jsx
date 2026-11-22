import { useAuth, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Code2, Flame, Layers, Sparkles, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "./api.js";

const links = [
  { title: "Coding practice", description: "Solve problems and check your solution against test cases.", icon: Code2, color: "violet", link: "/practice" },
  { title: "Interview rooms", description: "Pair up in a private room with video, chat, and screen sharing.", icon: Video, color: "blue", link: "/rooms" },
  { title: "AI interviewer", description: "Answer questions out loud and get feedback on your reasoning.", icon: Sparkles, color: "teal", link: "/coach" },
];

export default function Dashboard() {
  const api = useApi();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const stats = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: ({ signal }) => api("/api/practice/dashboard", { signal }),
    enabled: Boolean(isSignedIn),
    refetchInterval: 15_000,
  });
  const problems = useQuery({
    queryKey: ["problems"],
    queryFn: ({ signal }) => api("/api/practice/problems", { signal }),
  });

  const data = stats.data;
  const metrics = [
    { Icon: CheckCircle2, label: "Problems solved", value: data?.solved.length, color: "teal" },
    { Icon: Flame, label: "Submissions", value: data?.attempts, color: "violet" },
    { Icon: Video, label: "Active rooms", value: data?.activeRooms, color: "blue" },
    { Icon: Layers, label: "Completed interviews", value: data?.completedRooms, color: "amber" },
  ];

  return (
    <>
      <div className="page-heading">
        <div><h1>Overview</h1><p>{user?.firstName ? "Welcome back, " + user.firstName + "." : "Your space to prepare for technical interviews."}</p></div>
        <Link className="button secondary" to="/rooms"><Video size={16} /> Interview rooms <ArrowUpRight size={15} /></Link>
      </div>
      <section className="hero panel">
        <div className="hero-copy">
          <h2>Make your next<br />interview count.</h2>
          <p>Write code, rehearse with an AI coach, or invite a partner for a live mock interview.</p>
          <Link className="button primary" to="/practice">Start practicing <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="demo-code">
            <div className="demo-top"><div><i /><i /><i /></div><span>solution.js</span><Code2 size={15} /></div>
            <div className="demo-body">
              <div><i>01</i><b>function</b> <em>summarize</em>(scores) {"{"}</div>
              <div><i>02</i>&nbsp; <b>const</b> total = scores.reduce(</div>
              <div><i>03</i>&nbsp;&nbsp;&nbsp; (sum, score) =&gt; sum + score, <strong>0</strong></div>
              <div><i>04</i>&nbsp; );</div>
              <div><i>05</i>&nbsp; <b>return</b> {"{"} total,</div>
              <div><i>06</i>&nbsp;&nbsp;&nbsp; count: scores.length</div>
              <div><i>07</i>&nbsp; {"}"};</div>
              <div><i>08</i>{"}"}</div>
            </div>
            <div className="demo-result"><CheckCircle2 size={17} /> <span>All tests passed</span><ArrowDownRight size={14} /></div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-title"><h2>Your activity</h2>{isSignedIn && <span className="live"><span /> Auto-updates</span>}</div>
        <div className="metrics">
          {metrics.map((metric) => {
            const { Icon, label, value, color } = metric;
            return (
            <div className="metric panel" key={label}>
              <span className={"icon-box " + color}><Icon size={19} /></span>
              <div><strong>{value ?? "—"}</strong><p>{label}</p></div>
            </div>
            );
          })}
        </div>
        {stats.isError && <p className="form-error" role="alert">{stats.error.message}</p>}
      </section>
      <section className="section">
        <div className="section-title"><h2>Keep preparing</h2></div>
        <div className="feature-grid">
          {links.map((feature) => {
            const { title, description, icon: Icon, color, link } = feature;
            return (
            <Link className="feature panel" to={link} key={title}>
              <div className="feature-top"><span className={"icon-box " + color}><Icon size={20} /></span><ArrowUpRight size={18} /></div>
              <h3>{title}</h3><p>{description}</p>
            </Link>
            );
          })}
        </div>
      </section>
      <section className="section">
        <div className="section-title"><h2>Practice problems</h2><Link className="text-link" to="/practice">View all <ArrowRight size={15} /></Link></div>
        {problems.isError && <p className="form-error" role="alert">{problems.error.message}</p>}
        {problems.data && <div className="panel list-panel">
          {problems.data.slice(0, 3).map((problem) => <Link className="list-row" key={problem.slug} to={"/practice/" + problem.slug}>
            <BookOpen size={17} /><span>{problem.title}</span><span className={"difficulty " + problem.difficulty.toLowerCase()}>{problem.difficulty}</span><ArrowRight size={16} />
          </Link>)}
        </div>}
      </section>
      {data?.submissions.length > 0 && <section className="section">
        <div className="section-title"><h2>Recent submissions</h2></div>
        <div className="panel list-panel">
          {data.submissions.map((submission) => (
            <Link className="list-row" key={submission._id} to={"/practice/" + submission.problemSlug}>
              <Code2 size={17} />
              <span>{problems.data?.find(({ slug }) => slug === submission.problemSlug)?.title || submission.problemSlug}</span>
              <span className={"difficulty " + (submission.passed ? "easy" : "ended")}>
                {submission.passedCount} / {submission.totalCount} passed
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>}
    </>
  );
}
