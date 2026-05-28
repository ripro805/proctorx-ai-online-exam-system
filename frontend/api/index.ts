/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from "http";

import { renderErrorPage } from "../src/lib/error-page";

type BuiltServer = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<BuiltServer> | undefined;

async function getServerEntry(): Promise<BuiltServer> {
  if (!serverEntryPromise) {
    // @ts-ignore Generated at build time; no static declaration file is available in Vercel builds.
    serverEntryPromise = import("../dist/server/index.js").then(
      (mod) => ((mod as { default?: BuiltServer }).default ?? (mod as unknown as BuiltServer)),
    );
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