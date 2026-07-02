import { WorkerOptions } from 'bullmq';

/** Tuned for Upstash pay-as-you-go: fewer idle polls and stalled checks. */
export const UPSTASH_WORKER_OPTS: Omit<WorkerOptions, 'connection'> = {
  drainDelay: 90,
  stalledInterval: 600_000,
  lockDuration: 120_000,
};
