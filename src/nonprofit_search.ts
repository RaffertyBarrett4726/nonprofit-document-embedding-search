export type DocumentKind = "donor_receipt" | "volunteer_reminder" | "campaign_report";

export type NonprofitDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  text: string;
};

export type EmbeddedDocument = NonprofitDocument & {
  embedding: number[];
};

export type SearchResult = NonprofitDocument & {
  score: number;
};

export const sampleDocuments: NonprofitDocument[] = [
  {
    id: "receipt-2025-0142",
    kind: "donor_receipt",
    title: "Annual fund donation receipt",
    text: "Receipt for Jordan Lee's tax-deductible annual fund donation of $250, issued January 18, 2025. No goods or services were provided.",
  },
  {
    id: "volunteer-food-drive",
    kind: "volunteer_reminder",
    title: "Saturday food drive reminder",
    text: "Volunteer check-in opens at 8:30 AM on Saturday at the East Hall. Bring closed-toe shoes and ask for the pantry coordinator.",
  },
  {
    id: "report-spring-literacy",
    kind: "campaign_report",
    title: "Spring literacy campaign report",
    text: "The spring literacy campaign supplied 1,240 books and served 380 students. This report summarizes reach, donations, and program outcomes.",
  },
];

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("Embeddings must have the same non-zero length");
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}

export function rankDocuments(
  documents: EmbeddedDocument[],
  queryEmbedding: number[],
  limit: number,
): SearchResult[] {
  return documents
    .map(({ embedding, ...document }) => ({
      ...document,
      score: cosineSimilarity(embedding, queryEmbedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
