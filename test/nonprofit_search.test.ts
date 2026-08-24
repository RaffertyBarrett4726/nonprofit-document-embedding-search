import assert from "node:assert/strict";
import test from "node:test";

import { rankDocuments, type EmbeddedDocument } from "../src/nonprofit_search.js";

test("a receipt-shaped query ranks the donor receipt first", () => {
  const documents: EmbeddedDocument[] = [
    {
      id: "receipt-1",
      kind: "donor_receipt",
      title: "Donation receipt",
      text: "Tax receipt for a charitable gift",
      embedding: [1, 0],
    },
    {
      id: "reminder-1",
      kind: "volunteer_reminder",
      title: "Shift reminder",
      text: "Saturday volunteer check-in",
      embedding: [0, 1],
    },
  ];

  const [result] = rankDocuments(documents, [0.9, 0.1], 1);

  assert.equal(result.kind, "donor_receipt");
  assert.equal(result.id, "receipt-1");
  assert.ok(result.score > 0.99);
});
