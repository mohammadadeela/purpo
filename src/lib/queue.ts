import { Queue } from "bullmq";
import { env } from "./env";

let buildQueue: Queue | undefined;
let mediaQueue: Queue | undefined;
let deploymentQueue: Queue | undefined;

function connection() {
  return { url: env().REDIS_URL };
}

export function getBuildQueue() {
  return buildQueue ??= new Queue("purpo-builds", { connection: connection(), defaultJobOptions: { attempts: 1, removeOnComplete: 1000, removeOnFail: 5000 } });
}

export function getMediaQueue() {
  return mediaQueue ??= new Queue("purpo-media", { connection: connection(), defaultJobOptions: { attempts: 1, removeOnComplete: 500 } });
}

export function getDeploymentQueue() {
  return deploymentQueue ??= new Queue("purpo-deployments", { connection: connection(), defaultJobOptions: { attempts: 1, removeOnComplete: 500 } });
}
