import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const CLAUDE_PATHS = [
  `${homedir()}/.local/bin/claude`,
  `${homedir()}/.npm-global/bin/claude`,
  "/usr/local/bin/claude",
  "/opt/homebrew/bin/claude",
];

export function findClaudeBinary(): string | null {
  for (const path of CLAUDE_PATHS) {
    if (existsSync(path)) return path;
  }
  return null;
}

export type ClaudeCliResult = {
  result: string;
  cost_usd: number;
  duration_ms: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  input_tokens: number;
  output_tokens: number;
  model: string;
};

/**
 * Ejecuta el CLI de Claude Code (claude -p) con un prompt y system prompt opcional.
 * Usa la autenticación local del CLI (suscripción Claude Pro / Claude Code).
 * NO requiere ANTHROPIC_API_KEY. Funciona como Pepita.
 */
export function executeClaudeCli(opts: {
  prompt: string;
  systemPrompt?: string;
  model?: "haiku" | "sonnet" | "opus";
  timeoutMs?: number;
}): Promise<ClaudeCliResult> {
  const claudePath = findClaudeBinary();
  if (!claudePath) {
    return Promise.reject(
      new Error("Claude CLI not found. Install with: npm i -g @anthropic-ai/claude-code"),
    );
  }

  const model = opts.model ?? "sonnet";
  const timeout = opts.timeoutMs ?? 60000;

  const args = [
    "-p",
    opts.prompt,
    "--model",
    model,
    "--output-format",
    "json",
    "--disable-slash-commands",
    "--permission-mode",
    "default",
  ];

  if (opts.systemPrompt) {
    args.push("--append-system-prompt", opts.systemPrompt);
  }

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PATH: `${homedir()}/.local/bin:${homedir()}/.nvm/versions/node/v22.22.2/bin:${homedir()}/.bun/bin:${process.env.PATH ?? ""}`,
    };

    const proc = spawn(claudePath, args, { env, cwd: homedir() });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Claude CLI timeout after ${timeout}ms`));
    }, timeout);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `Claude CLI exited with code ${code}. stderr: ${stderr.slice(0, 500)}`,
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.is_error) {
          reject(
            new Error(parsed.result ?? "Claude CLI returned error"),
          );
          return;
        }

        const modelKey = Object.keys(parsed.modelUsage ?? {})[0] ?? "unknown";

        resolve({
          result: parsed.result,
          cost_usd: parsed.total_cost_usd ?? 0,
          duration_ms: parsed.duration_ms ?? 0,
          cache_creation_tokens: parsed.usage?.cache_creation_input_tokens ?? 0,
          cache_read_tokens: parsed.usage?.cache_read_input_tokens ?? 0,
          input_tokens: parsed.usage?.input_tokens ?? 0,
          output_tokens: parsed.usage?.output_tokens ?? 0,
          model: modelKey,
        });
      } catch (e) {
        reject(
          new Error(
            `Failed to parse Claude CLI output: ${e instanceof Error ? e.message : "?"}. Raw: ${stdout.slice(0, 500)}`,
          ),
        );
      }
    });
  });
}
