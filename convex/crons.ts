// convex/crons.ts
// Scheduled cron jobs for automated maintenance

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Weekly graph cleanup job.
 *
 * Runs every Sunday at 9:00 AM UTC.
 *
 * Operations:
 * - Archives orphan nodes (0 edges, 90+ days old)
 * - Applies time-based decay to edge weights (10% per 30 days)
 * - Archives low-weight edges (< 0.1)
 */
crons.weekly(
  "graph cleanup",
  { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 },
  internal.maintenance.graphCleanup
);

export default crons;
