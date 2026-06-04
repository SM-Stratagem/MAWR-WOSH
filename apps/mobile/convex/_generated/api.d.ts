/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as addresses from "../addresses.js";
import type * as bookings from "../bookings.js";
import type * as carData from "../carData.js";
import type * as carHelpers from "../carHelpers.js";
import type * as cars from "../cars.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as photos from "../photos.js";
import type * as settings from "../settings.js";
import type * as subscriptions from "../subscriptions.js";
import type * as teamAuth from "../teamAuth.js";
import type * as teams from "../teams.js";
import type * as timeWindows from "../timeWindows.js";
import type * as users from "../users.js";
import type * as washTypes from "../washTypes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  addresses: typeof addresses;
  bookings: typeof bookings;
  carData: typeof carData;
  carHelpers: typeof carHelpers;
  cars: typeof cars;
  crons: typeof crons;
  http: typeof http;
  notifications: typeof notifications;
  payments: typeof payments;
  photos: typeof photos;
  settings: typeof settings;
  subscriptions: typeof subscriptions;
  teamAuth: typeof teamAuth;
  teams: typeof teams;
  timeWindows: typeof timeWindows;
  users: typeof users;
  washTypes: typeof washTypes;
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
