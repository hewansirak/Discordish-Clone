import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { getCurrentUser } from "./user";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery, query, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 1000;
/** Stay well inside the free Convex storage quota (1 GB total). */
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** At most this many new videos per user inside the window. */
export const UPLOAD_LIMIT = 5;
export const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const LIST_LIMIT = 100;
/** Groq's speech-to-text endpoint rejects files larger than this on the free tier. */
export const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;
