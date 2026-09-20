import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateCredits, reserveCredits } from "@/lib/credits";
import { deploymentQueue } from "@/lib/queue";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

const schema = z.object({ environment: z.enum(["PREVIEW","STAGING","PRODUCTION"]), domain: z.string().max(253).optional(), healthUrl: z.url().optional() });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { projectId } = await context.params;
    const { user, project } = await requireProject(projectId, true);
    const input = schema.parse(await request.json());
    if (!project.activeVersionId) throw new HttpError(409, "Complete a build before deploying.", "NO_ACTIVE_VERSION");
    const hostinger = await db.integration.findUnique({ where: { projectId_provider: { projectId, provider: "hostinger" } } });
    if (hostinger?.status !== "CONNECTED") throw new HttpError(409, "Connect Hostinger before deploying.", "HOSTINGER_NOT_CONNECTED");
    const deployment = await db.deployment.create({ data: { projectId, versionId: project.activeVersionId, environment: input.environment, provider: "hostinger", domain: input.domain, healthUrl: input.healthUrl, sourceRevision: project.activeVersionId, buildVersion: process.env.npm_package_version ?? "0.1.0" } });
    await reserveCredits(user.id, estimateCredits("deploy"), `deployment:${deployment.id}:reserve`, undefined, deployment.id);
    await deploymentQueue.add("deploy", { deploymentId: deployment.id }, { jobId: `deployment:${deployment.id}` });
    await db.usageEvent.create({ data: { userId: user.id, projectId, event: "deploy_started", metadata: { deploymentId: deployment.id } } });
    return Response.json({ deployment }, { status: 202 });
  } catch (error) { return jsonError(error); }
}
