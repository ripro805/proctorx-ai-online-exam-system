/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from "http";

import fs from "fs";
import path from "path";

// Diagnostic marker to confirm which version of this file is deployed on Vercel.
// Look for this string in Vercel function logs to verify the serverless bundle is up-to-date.
console.log("[proctorx-api] api/index2.ts loaded - inline-fallback-v3");

// The original `renderErrorPage` lives in `frontend/src/lib/error-page.ts` which
// is not guaranteed to be available to the serverless runtime. Include a small
// fallback here so the function can render a helpful error page even when the
// source file is not present in the runtime bundle.
function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}

type BuiltServer = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<BuiltServer> | undefined;

async function getServerEntry(): Promise<BuiltServer> {
  if (!serverEntryPromise) {
    // Attempt to import the build-generated server entry. If it fails, include helpful diagnostics in the error.
    const serverIndexPath = path.join(__dirname, "..", "dist", "server", "index.js");
    try {
      if (!fs.existsSync(serverIndexPath)) {
        throw new Error(`Build artifact not found at ${serverIndexPath}`);
      }
      // @ts-ignore Generated at build time; no static declaration file is available in Vercel builds.
      serverEntryPromise = import("../dist/server/index.js").then(
        (mod) => ((mod as { default?: BuiltServer }).default ?? (mod as unknown as BuiltServer)),
      );
    } catch (err) {
      // rethrow with more context for Vercel logs
      const message = `Failed to import generated server entry: ${(err as Error).message}`;
      console.error(message, err);
      throw new Error(message);
    }
  }

  return serverEntryPromise;
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const forwardedHost = req.headers.host ?? "localhost";
  const requestUrl = new URL(req.url ?? "/", `https://${forwardedHost}`);
  const matchedPath = req.headers["x-matched-path"];
  const forwardedUri = req.headers["x-forwarded-uri"];
  const rewrittenPath =
    typeof matchedPath === "string"
      ? matchedPath
      : typeof forwardedUri === "string"
        ? forwardedUri
        : requestUrl.searchParams.has("pathname")
          ? requestUrl.searchParams.get("pathname")
          : null;

  if (rewrittenPath !== null) {
    requestUrl.pathname = rewrittenPath
      ? rewrittenPath.startsWith("/")
        ? rewrittenPath
        : `/${rewrittenPath}`
      : "/";
    requestUrl.searchParams.delete("pathname");
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      // value can be string | undefined | number | null in some environments — stringify to satisfy Headers
      headers.set(key, String(value));
    }
  }

  const body = await readRequestBody(req);
  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
  };

  if (body && body.length > 0) {
    // convert Buffer to Uint8Array for Request body to satisfy TypeScript DOM BodyInit
    init.body = new Uint8Array(body);
    init.duplex = "half";
  }

  return new Request(requestUrl, init);
}

async function sendResponse(response: Response, res: ServerResponse) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const server = await getServerEntry();
    const request = await toRequest(req);
    const response = await server.fetch(request, {}, {});
    await sendResponse(response, res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(renderErrorPage());
  }
}
