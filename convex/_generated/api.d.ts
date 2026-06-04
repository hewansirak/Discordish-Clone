/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_channel from "../functions/channel.js";
import type * as functions_channelMessage from "../functions/channelMessage.js";
import type * as functions_dm from "../functions/dm.js";
import type * as functions_friend from "../functions/friend.js";
import type * as functions_helpers from "../functions/helpers.js";
import type * as functions_message from "../functions/message.js";
import type * as functions_presence from "../functions/presence.js";
import type * as functions_reaction from "../functions/reaction.js";
import type * as functions_server from "../functions/server.js";
import type * as functions_typing from "../functions/typing.js";
import type * as functions_user from "../functions/user.js";
import type * as http from "../http.js";
import type * as lib_emoji from "../lib/emoji.js";
import type * as lib_invite from "../lib/invite.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_presence from "../lib/presence.js";
import type * as lib_username from "../lib/username.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/channel": typeof functions_channel;
  "functions/channelMessage": typeof functions_channelMessage;
  "functions/dm": typeof functions_dm;
  "functions/friend": typeof functions_friend;
  "functions/helpers": typeof functions_helpers;
  "functions/message": typeof functions_message;
  "functions/presence": typeof functions_presence;
  "functions/reaction": typeof functions_reaction;
  "functions/server": typeof functions_server;
  "functions/typing": typeof functions_typing;
  "functions/user": typeof functions_user;
  http: typeof http;
  "lib/emoji": typeof lib_emoji;
  "lib/invite": typeof lib_invite;
  "lib/names": typeof lib_names;
  "lib/permissions": typeof lib_permissions;
  "lib/presence": typeof lib_presence;
  "lib/username": typeof lib_username;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
