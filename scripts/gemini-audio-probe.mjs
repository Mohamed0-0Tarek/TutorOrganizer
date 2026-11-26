#!/usr/bin/env node
/**
 * Spike B helper — can Gemini read a short Arabic voice clip with the MIME type
 * the browser really produces?
 *
 *   node scripts/gemini-audio-probe.mjs <file> <mimeType> [prompt]
 *
 * Examples (record 3 s in the browser, save the blob to a file):
 *   node scripts/gemini-audio-probe.mjs clip.webm "audio/webm;codecs=opus"
 *   node scripts/gemini-audio-probe.mjs clip.m4a  "audio/mp4"
 *
 * Reads GEMINI_API_KEY from the environment (or from .env.local).
 * Exit code 0 = accepted, 1 = rejected/error (prints the API message).
 */
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local: rely on the real environment.
  }
}

async function main() {
  const [file, mimeType, prompt] = process.argv.slice(2);
  if (!file || !mimeType) {
    console.error(
      'usage: node scripts/gemini-audio-probe.mjs <file> <mimeType> ["prompt"]',
    );
    process.exit(2);
  }

  loadEnvLocal();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set (env or .env.local).");
    process.exit(2);
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const data = readFileSync(file).toString("base64");

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              prompt ||
              "اكتب اللي قاله في التسجيل بالحرف، وحدد اللغة واللهجة.",
          },
          { inlineData: { mimeType, data } },
        ],
      },
    ],
  };

  const started = Date.now();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  const text = await response.text();
  const elapsed = Date.now() - started;

  console.log(`model=${model} mimeType=${mimeType} status=${response.status} ${elapsed}ms`);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 800));
    process.exit(response.ok ? 0 : 1);
  }

  if (!response.ok) {
    console.log(JSON.stringify(parsed, null, 2).slice(0, 1600));
    process.exit(1);
  }

  const answer = parsed?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n");
  console.log(answer ? `\n${answer}` : JSON.stringify(parsed, null, 2).slice(0, 1600));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
