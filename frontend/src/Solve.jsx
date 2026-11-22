import { useState } from "react";
import { SignInButton, useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { ArrowLeft, CheckCircle2, CloudUpload, Code2, Play, RotateCcw, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "./api.js";
import CodeEditor from "./CodeEditor.jsx";

function starter(problem, language) {
  if (language === "python") {
    return "def " + problem.signature + ":\n    # Write your solution here\n    pass\n";
  }
  return "function " + problem.signature + " {\n  // Write your solution here\n}\n";
}

function readDraft(slug, language) {
  try {
    return localStorage.getItem("talentiq:draft:" + slug + ":" + language);
  } catch {
    return null;
  }
}

function Workspace({ problem }) {
  const api = useApi();
  const cache = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(() => readDraft(problem.slug, "javascript") ?? starter(problem, "javascript"));
  const run = useMutation({
    mutationFn: (submit) => api("/api/practice/problems/" + problem.slug + "/run", {
      method: "POST", body: { code, language, submit },
    }),
    onSuccess: (data, submit) => {
      if (submit) cache.invalidateQueries({ queryKey: ["dashboard", userId] });
      if (submit && data.passed) confetti({ particleCount: 110, spread: 72, origin: { y: 0.72 }, disableForReducedMotion: true });
    },
  });

  function saveDraft(value) {
    setCode(value);
    try {
      localStorage.setItem("talentiq:draft:" + problem.slug + ":" + language, value);
    } catch {
      // The editor still works when browser storage is unavailable.
    }
  }

  return (
    <>
      <Link className="back-link" to="/practice"><ArrowLeft size={17} /> Practice problems</Link>
      <div className="page-heading"><div><h1>{problem.title}</h1><p>{problem.topics.join(" · ")}</p></div><span className={"difficulty " + problem.difficulty.toLowerCase()}>{problem.difficulty}</span></div>
      <div className="solve-grid">
        <section className="panel content-panel">
          <h2>Problem</h2><p>{problem.description}</p>
          <div className="signature"><Code2 size={17} /><code>{problem.signature}</code></div>
          <h3>Examples</h3>
          {problem.samples.map(({ args, expected }, index) => (
            <div className="example" key={index}><strong>Example {index + 1}</strong><code>Input: {args.map((arg) => JSON.stringify(arg)).join(", ")}</code><code>Output: {JSON.stringify(expected)}</code></div>
          ))}
          <h3>Constraints</h3><ul>{problem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
        </section>
        <section className="panel editor-panel">
          <div className="panel-bar">
            <h2><Code2 size={17} /> Solution</h2>
            <div className="inline">
              <select aria-label="Programming language" value={language} disabled={run.isPending} onChange={(event) => {
                const next = event.target.value;
                setLanguage(next);
                setCode(readDraft(problem.slug, next) ?? starter(problem, next));
                run.reset();
              }}><option value="javascript">JavaScript</option><option value="python">Python</option></select>
              <button className="icon-button" type="button" title="Reset code" aria-label="Reset code" disabled={run.isPending} onClick={() => saveDraft(starter(problem, language))}><RotateCcw size={16} /></button>
            </div>
          </div>
          <CodeEditor code={code} setCode={saveDraft} language={language} />
          <div className="panel-bar actions">
            {isSignedIn ? <>
              <button className="button secondary" disabled={run.isPending || !code.trim()} onClick={() => run.mutate(false)}><Play size={15} /> Run examples</button>
              <button className="button primary" disabled={run.isPending || !code.trim()} onClick={() => run.mutate(true)}><CloudUpload size={16} /> Submit</button>
            </> : <SignInButton mode="modal"><button className="button primary">Sign in to run code</button></SignInButton>}
          </div>
          <div className="results" aria-live="polite">
            {run.isPending && <p>Running test cases…</p>}
            {run.isError && <p className="form-error" role="alert">{run.error.message}</p>}
            {run.data && <div>
              <h3 className={run.data.passed ? "pass" : "fail"}>{run.data.passed ? "All tests passed" : "Some tests failed"} <span>{run.data.passedCount} / {run.data.totalCount}</span></h3>
              {run.data.tests.map((test, index) => {
                const Icon = test.passed ? CheckCircle2 : XCircle;
                return <div className="test-result" key={index}>
                  <Icon size={16} className={test.passed ? "pass" : "fail"} />
                  <div><strong>{test.hidden ? "Hidden test" : "Example"} {index + 1}</strong>
                  {!test.hidden && !test.passed && <small>{test.error ?? ("Expected " + JSON.stringify(test.expected) + " · Received " + JSON.stringify(test.actual))}</small>}</div>
                </div>;
              })}
              {run.data.output && <pre className="console-output">{run.data.output}</pre>}
            </div>}
            {run.isIdle && <p>Run the examples to see your results here.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

export default function Solve() {
  const { slug } = useParams();
  const api = useApi();
  const problems = useQuery({
    queryKey: ["problems"],
    queryFn: ({ signal }) => api("/api/practice/problems", { signal }),
  });
  if (problems.isPending) return <p className="status-note" role="status">Loading problem…</p>;
  if (problems.isError) return <p className="form-error" role="alert">{problems.error.message}</p>;
  const problem = problems.data.find((entry) => entry.slug === slug);
  if (!problem) return <section className="empty panel"><h1>Problem not found</h1><Link className="button secondary" to="/practice">Browse practice problems</Link></section>;
  return <Workspace key={slug} problem={problem} />;
}
