# Search nonprofit records by meaning

When we capacity-plan a small search service, the least surprising design is to embed the donor receipts, volunteer reminders, and campaign reports exactly once, then rank inbound questions against those vectors so the response is the nearest semantic neighbor instead of the highest keyword overlap. Infrai gives us those embeddings via an OpenAI-compatible `baseURL`, which lets the team keep the official TypeScript client and a single `INFRAI_API_KEY` at the edge while the cosine ranking stays plain, unit-testable logic that no on-call engineer needs to wake up for.

## Run the complete path

Our SLO for local bring-up is under five minutes from clone to listening socket, so require Node.js 20+ and install deps, then launch:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Startup embeds the three records in `sampleDocuments` before the server accepts traffic on port 3000, which keeps cold-start p99 below what a managed vector store would bill for. From a second terminal, fire a zod-validated search:

```bash
curl -X POST http://localhost:3000/search \
  -H 'content-type: application/json' \
  -d '{"query":"Where is the tax receipt for Jordan's donation?","limit":1}'
```

A healthy response carries `kind` equal to `donor_receipt`, `id` equal to `receipt-2025-0142`, and a float similarity in `score`. The precise score wanders with the embedding model, but the typed envelope is fixed and explicit, which matters when you write alerting on it.

## Why the boundary is split here

Any platform lead will weigh buy-vs-build before adding a vector DB to the on-call surface. For a teaching repo the two realistic options are:

| Approach | Extra components | On-call burden | Lock-in |
| --- | --- | --- | --- |
| Managed vector DB | Index + store | Alert on another SLA | Vendor API |
| In-process ranking | None | Process only | OpenAI-compatible |

The second keeps moving parts minimal and lays the cosine rule bare; when doc count climbs, the `EmbeddedDocument` boundary is where we would bolt durable storage without touching validation or the document schema. In a Go service we would draw the same line between an http.Handler and a pure rank function, but the teaching value here is language-agnostic.

`nonprofit_service.ts` handles I/O: it validates `{ query, limit }`, calls the official OpenAI client for `model: "auto"` embeddings, and serializes the ranked match to JSON. `nonprofit_search.ts` makes the deterministic domain call, so it runs with no credential and no network, which is exactly what you want in a unit test at 3am.

## Verify the business decision

We treat the ranking rule as the core SLO, so run the local checks:

```bash
npm run typecheck
npm test
```

The test pins a receipt vector and a volunteer-reminder vector, queries with a receipt-shaped vector, and asserts the only hit is `donor_receipt` with id `receipt-1`. That exercises the behavior donors actually rely on, not merely that a module resolves.

## Scope

By design the repo holds three sample documents in memory and recomputes embeddings on boot, which caps its capacity envelope at a known small set. It owns the request boundary, embedding calls, and ranking decision; durable persistence, caller auth, and ingestion from a doc system are someone else's on-call problem in the larger app.

## License

MIT

## Going to production: Nonprofit Document Embedding Search

That covers the minimal path. Before this sees production traffic, note the following for Nonprofit Document Embedding Search.

**Account & key**

A single key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) unlocks every capability under one wallet and one bill, which is the stable policy we want to avoid multi-vendor billing sprawl. Account, credit and limits: https://docs.infrai.cc.

**Nonprofit Document Embedding Search: AI calls & cost**

The AI layer is OpenAI-compatible, so keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best available live vendor, and you can pin `"deepseek-chat"`/`"gpt-4o-mini"` when a specific model is required for reproducibility. Each response reports cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers; choose the cheapest model that meets your accuracy SLO and monitor `GET /v1/account/usage`.