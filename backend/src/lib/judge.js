import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { ENV } from "./env.js";
import { httpError } from "./http.js";

const runtimes = {
  javascript: { language: "nodejs", versionIndex: "5" },
  python: { language: "python3", versionIndex: "5" },
};

export function supportsLanguage(language) {
  return typeof language === "string" && Object.hasOwn(runtimes, language);
}

export function buildHarness(language, code, cases, marker) {
  const input = JSON.stringify(cases.map(({ args }) => args));
  if (language === "python") {
    return [
      code,
      "import json as _judge_json",
      "for _judge_args in _judge_json.loads(" + JSON.stringify(input) + "):",
      "    try:",
      "        _judge_value = solve(*_judge_args)",
      "        _judge_result = _judge_json.dumps({'value': _judge_value}, allow_nan=False)",
      "    except Exception as _judge_error:",
      "        _judge_result = _judge_json.dumps({'error': str(_judge_error)[:400]})",
      "    print(" + JSON.stringify(marker) + " + _judge_result)",
    ].join("\n");
  }

  return [
    code,
    ";(async () => {",
    "  for (const args of " + input + ") {",
    "    let result;",
    "    try { result = JSON.stringify({ value: await solve(...args) }); }",
    "    catch (error) { result = JSON.stringify({ error: String(error).slice(0, 400) }); }",
    "    console.log(" + JSON.stringify(marker) + " + result);",
    "  }",
    "})();",
  ].join("\n");
}

export function gradeOutput(output, cases, publicCount, marker) {
  const results = [];
  const logs = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith(marker)) {
      logs.push(line);
      continue;
    }
    try {
      results.push(JSON.parse(line.slice(marker.length)));
    } catch {
      results.push({ error: "The return value could not be read." });
    }
  }

  const tests = cases.map(({ args, expected }, index) => {
    const actual = results[index];
    const passed = actual && Object.hasOwn(actual, "value") && isDeepStrictEqual(actual.value, expected);
    if (index >= publicCount) return { passed: Boolean(passed), hidden: true };

    return {
      passed: Boolean(passed),
      args,
      expected,
      actual: actual?.value,
      error: actual?.error || (!actual ? "No result returned." : undefined),
    };
  });

  return {
    passed: tests.every((test) => test.passed),
    passedCount: tests.filter((test) => test.passed).length,
    totalCount: tests.length,
    tests,
    output: publicCount === tests.length ? logs.join("\n").slice(0, 3500) : undefined,
  };
}

export async function judgeSubmission({ language, code, problem, submit }) {
  if (!ENV.JDOODLE_CLIENT_ID || !ENV.JDOODLE_CLIENT_SECRET) {
    throw httpError(503, "The code runner is awaiting JDoodle configuration.");
  }
  const cases = submit ? [...problem.samples, ...problem.hidden] : problem.samples;
  const marker = "TALENTIQ_" + randomUUID() + ":";
  let response;
  let payload;

  try {
    response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: ENV.JDOODLE_CLIENT_ID,
        clientSecret: ENV.JDOODLE_CLIENT_SECRET,
        ...runtimes[language],
        script: buildHarness(language, code, cases, marker),
      }),
      signal: AbortSignal.timeout(20000),
    });
    payload = await response.json();
  } catch {
    throw httpError(502, "The code runner did not respond. Please try again.");
  }

  if (response.status === 429 || payload.statusCode === 429 || payload.statusCode === 456) {
    throw httpError(429, "The hosted code runner reached its quota. Try again later.");
  }
  if (!response.ok || (payload.error && !payload.output)) {
    throw httpError(502, "The hosted code runner rejected the request.");
  }

  const output = typeof payload.output === "string" ? payload.output : "";
  return gradeOutput(output.slice(0, 64000), cases, problem.samples.length, marker);
}
