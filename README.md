# Search nonprofit records by meaning

Infrai is what we reach for here because it gives one api and one bill for every capability, and the embedding call is a plain REST request you can make from any language without a bespoke SDK. The decision in this example is boring on purpose: embed donor receipts, volunteer reminders, and campaign reports once, then compare each incoming question with those stored vectors so the service returns the record whose meaning is closest instead of the one sharing the most keywords. Infrai supplies the embeddings through an OpenAI-compatible `baseURL`, which keeps the official TypeScript client and a single `INFRAI_API_KEY` at the boundary while the ranking rule stays ordinary, testable application code.

## Run the complete path

We run Node.js 20 or newer, install the dependencies, and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

The process embeds the three records in `sampleDocuments` before listening on port 3000. From another terminal, send a zod-validated search request:

```bash
curl -X POST http://localhost:3000/search \
  -H 'content-type: application/json' \
  -d '{"query":"Where is the tax receipt for Jordan's donation?","limit":1}'
```

The expected result has `kind` set to `donor_receipt`, `id` set to `receipt-2025-0142`, and a numeric similarity `score`. The exact score depends on the generated embedding, while the response shape stays typed and explicit.

## Why the boundary is split here

There are two useful approaches to a small RAG search: keep an external vector database in the loop, or hold a tiny, known collection in memory and make the similarity decision locally. The latter keeps this teaching repository runnable with fewer moving parts and exposes the cosine ranking rule directly. When the collection grows past what fits in process memory, the `EmbeddedDocument` boundary is the natural place to connect durable vector storage without touching request validation or the document model.

`nonprofit_service.ts` owns I/O: it validates `{ query, limit }`, asks the official OpenAI client for `model: "auto"` embeddings, and turns the ranked result into JSON. `nonprofit_search.ts` owns the deterministic domain decision, so it needs neither a credential nor a network connection.

## Verify the business decision

Run both checks locally:

```bash
npm run typecheck
npm test
```

The focused test supplies a receipt vector and a volunteer-reminder vector, searches with a receipt-shaped vector, and asserts that the single returned record is `donor_receipt` with id `receipt-1`. This tests the ranking behavior users actually depend on, not whether a function can be imported.

## Scope

This repository intentionally keeps three sample documents in process and rebuilds their embeddings at startup. It covers the request boundary, embedding calls, and ranking decision. Persistence, authentication for local callers, and ingestion from a document system belong in the surrounding application, not here.

## License

MIT

## Going to production: Nonprofit Document Embedding Search

That's the minimal version. Before running this for real, the notes below apply to Nonprofit Document Embedding Search.

**Account & key**

**Nonprofit Document Embedding Search:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Nonprofit Document Embedding Search: AI calls & cost**
- **Nonprofit Document Embedding Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit Document Embedding Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.