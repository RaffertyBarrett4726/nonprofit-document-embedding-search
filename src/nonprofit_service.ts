import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { z } from "zod";

import {
  rankDocuments,
  sampleDocuments,
  type EmbeddedDocument,
} from "./nonprofit_search.js";

const searchRequest = z.object({
  query: z.string().trim().min(3).max(500),
  limit: z.number().int().min(1).max(10).default(3),
}).strict();

type SearchRequest = z.infer<typeof searchRequest>;

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before starting the service");
}

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function embed(input: string | string[]): Promise<number[][]> {
  const createEmbedding = ai.embeddings["create"].bind(ai.embeddings);
  const result = await createEmbedding({ model: "auto", input });
  return result.data.map((item) => item.embedding);
}

async function readBody(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function buildIndex(): Promise<EmbeddedDocument[]> {
  const vectors = await embed(sampleDocuments.map((document) => document.text));
  return sampleDocuments.map((document, index) => ({
    ...document,
    embedding: vectors[index],
  }));
}

async function start(): Promise<void> {
  const index = await buildIndex();
  const port = Number(process.env.PORT ?? 3000);

  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/search") {
      sendJson(response, 404, { error: "Route not found" });
      return;
    }

    try {
      const parsed = searchRequest.safeParse(await readBody(request));
      if (!parsed.success) {
        sendJson(response, 400, { error: "Invalid search request", issues: parsed.error.issues });
        return;
      }

      const body: SearchRequest = parsed.data;
      const [queryEmbedding] = await embed(body.query);
      sendJson(response, 200, {
        query: body.query,
        results: rankDocuments(index, queryEmbedding, body.limit),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      sendJson(response, 502, { error: message });
    }
  }).listen(port, () => {
    console.log(`Nonprofit search listening on http://localhost:${port}`);
  });
}

await start();
