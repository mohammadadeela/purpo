export const productSpecSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "type", "targetUsers", "features", "pages", "dataEntities", "integrations", "risks", "designDirection", "suggestions"],
  properties: {
    summary: { type: "string" }, type: { type: "string" },
    targetUsers: { type: "array", items: { type: "string" } },
    features: { type: "array", items: { type: "string" } },
    pages: { type: "array", items: { type: "string" } },
    dataEntities: { type: "array", items: { type: "string" } },
    integrations: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    designDirection: { type: "string" },
    suggestions: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "reason", "command"], properties: { title: { type: "string" }, reason: { type: "string" }, command: { type: "string" } } } }
  }
};

export const fileManifestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["changeSummary", "files"],
  properties: {
    changeSummary: { type: "string" },
    files: { type: "array", minItems: 3, maxItems: 30, items: { type: "object", additionalProperties: false, required: ["path", "content", "mimeType"], properties: { path: { type: "string" }, content: { type: "string" }, mimeType: { type: "string" } } } }
  }
};
