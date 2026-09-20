import { Queue } from "bullmq";
import { env } from "./env";

const connection = { url: env().REDIS_URL };
export const buildQueue = new Queue("purpo-builds", { connection, defaultJobOptions: { attempts: 1, removeOnComplete: 1000, removeOnFail: 5000 } });
export const mediaQueue = new Queue("purpo-media", { connection, defaultJobOptions: { attempts: 1, removeOnComplete: 500 } });
export const deploymentQueue = new Queue("purpo-deployments", { connection, defaultJobOptions: { attempts: 1, removeOnComplete: 500 } });
