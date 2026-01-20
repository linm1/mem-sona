// convex/crons.ts
// Scheduled cron jobs for automated maintenance

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Nightly consolidation job.
 *
 * Runs daily at 7:00 AM UTC.
 *
 * Operations:
 * - Merges duplicate items (same category, cosine similarity > 0.95)
 * - Identifies and logs hot memories (accessed 2+ times in last 7 days)
 * - Maintains data quality through deduplication
 */
crons.daily(
  "nightly consolidation",
  { hourUTC: 7, minuteUTC: 0 },
  internal.maintenance.nightlyConsolidation
);

/**
 * Weekly summarization job.
 *
 * Runs every Sunday at 8:00 AM UTC.
 *
 * Operations:
 * - Compresses items older than 30 days into category summaries
 * - Updates category markdown with compressed insights
 * - Deletes items older than 90 days after summarization
 */
crons.weekly(
  "weekly summarization",
  { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 },
  internal.maintenance.weeklySummarization
);

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

/**
 * Monthly reindexing job.
 *
 * Runs on the 1st of every month at 10:00 AM UTC.
 *
 * Operations:
 * - Regenerates embeddings for all items using voyage-4 (1024-dim)
 * - Updates graph node embeddings for consistency
 * - Ensures vector index uses latest embedding model
 */
crons.monthly(
  "monthly reindex",
  { day: 1, hourUTC: 10, minuteUTC: 0 },
  internal.maintenance.monthlyReindex
);

export default crons;
