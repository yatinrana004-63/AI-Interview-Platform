import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/python/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

globalThis.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

export default function CodeEditor({ code, setCode, language, height = "350px" }) {
  return (
    <Editor
      height={height}
      language={language}
      value={code}
      onChange={(value) => setCode(value ?? "")}
      theme="vs-dark"
      loading={<p className="status-note" role="status">Loading code editor…</p>}
      options={{
        ariaLabel: "Solution code",
        automaticLayout: true,
        fontFamily: "JetBrains Mono, Consolas, monospace",
        fontSize: 13,
        minimap: { enabled: false },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        tabSize: language === "python" ? 4 : 2,
      }}
    />
  );
}
