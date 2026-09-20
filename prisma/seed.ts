import { PrismaClient, PromptStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { key: "free", name: "Starter", monthlyCents: 0, annualCents: 0, monthlyCredits: 40, features: ["1 project", "Code access", "Preview"] },
    { key: "pro", name: "Pro", monthlyCents: 2900, annualCents: 27840, monthlyCredits: 1500, features: ["Unlimited projects", "Media generation", "Deployments", "Priority builds"] },
    { key: "studio", name: "Studio", monthlyCents: 7900, annualCents: 75840, monthlyCredits: 5000, features: ["Teams", "Advanced automations", "White-label handoff", "Priority support"] }
  ];
  for (const plan of plans) await prisma.plan.upsert({ where: { key: plan.key }, create: plan, update: plan });

  const providers = [
    { key: "openai", name: "OpenAI", priority: 10 },
    { key: "gemini", name: "Google Gemini", priority: 20 }
  ];
  for (const provider of providers) await prisma.aiProvider.upsert({ where: { key: provider.key }, create: provider, update: provider });

  const prompt = await prisma.promptDefinition.upsert({
    where: { key: "core.product-builder" },
    create: { key: "core.product-builder", name: "Core product builder", category: "core", description: "Converts outcomes into complete, secure products." },
    update: {}
  });
  await prisma.promptVersion.upsert({
    where: { promptId_version: { promptId: prompt.id, version: 1 } },
    create: { promptId: prompt.id, version: 1, status: PromptStatus.ACTIVE, modelCompatibility: [], content: "Build the complete product the user is trying to create. Return only the requested structured JSON. Preserve existing files, enforce authorization server-side, and never expose secrets." },
    update: { status: PromptStatus.ACTIVE }
  });
}

main().finally(() => prisma.$disconnect());
