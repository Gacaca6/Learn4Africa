/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_curriculum from "../ai/curriculum.js";
import type * as ai_explain from "../ai/explain.js";
import type * as ai_flashcards from "../ai/flashcards.js";
import type * as ai_interview from "../ai/interview.js";
import type * as ai_quiz from "../ai/quiz.js";
import type * as ai_tutor from "../ai/tutor.js";
import type * as ai_visualise from "../ai/visualise.js";
import type * as conversations from "../conversations.js";
import type * as demo_seedDemo from "../demo/seedDemo.js";
import type * as lib_claude from "../lib/claude.js";
import type * as lib_mwalimu from "../lib/mwalimu.js";
import type * as lib_providerInfo from "../lib/providerInfo.js";
import type * as passwords from "../passwords.js";
import type * as progress from "../progress.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/curriculum": typeof ai_curriculum;
  "ai/explain": typeof ai_explain;
  "ai/flashcards": typeof ai_flashcards;
  "ai/interview": typeof ai_interview;
  "ai/quiz": typeof ai_quiz;
  "ai/tutor": typeof ai_tutor;
  "ai/visualise": typeof ai_visualise;
  conversations: typeof conversations;
  "demo/seedDemo": typeof demo_seedDemo;
  "lib/claude": typeof lib_claude;
  "lib/mwalimu": typeof lib_mwalimu;
  "lib/providerInfo": typeof lib_providerInfo;
  passwords: typeof passwords;
  progress: typeof progress;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
