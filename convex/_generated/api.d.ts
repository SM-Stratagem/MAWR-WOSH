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
import type * as admin from "../admin.js";
import type * as authHelpers from "../authHelpers.js";
import type * as bookings from "../bookings.js";
import type * as carData from "../carData.js";
import type * as carHelpers from "../carHelpers.js";
import type * as cars from "../cars.js";
import type * as crons from "../crons.js";
import type * as dashboardCache from "../dashboardCache.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as phone from "../phone.js";
import type * as photos from "../photos.js";
import type * as pinHash from "../pinHash.js";
import type * as refunds from "../refunds.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as subscriptions from "../subscriptions.js";
import type * as teamAuth from "../teamAuth.js";
import type * as teamSelection from "../teamSelection.js";
import type * as teams from "../teams.js";
import type * as timeWindows from "../timeWindows.js";
import type * as users from "../users.js";
import type * as vans from "../vans.js";
import type * as washTypes from "../washTypes.js";
import type * as zones from "../zones.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  addresses: typeof addresses;
  admin: typeof admin;
  authHelpers: typeof authHelpers;
  bookings: typeof bookings;
  carData: typeof carData;
  carHelpers: typeof carHelpers;
  cars: typeof cars;
  crons: typeof crons;
  dashboardCache: typeof dashboardCache;
  http: typeof http;
  migrations: typeof migrations;
  notifications: typeof notifications;
  payments: typeof payments;
  phone: typeof phone;
  photos: typeof photos;
  pinHash: typeof pinHash;
  refunds: typeof refunds;
  seed: typeof seed;
  settings: typeof settings;
  subscriptions: typeof subscriptions;
  teamAuth: typeof teamAuth;
  teamSelection: typeof teamSelection;
  teams: typeof teams;
  timeWindows: typeof timeWindows;
  users: typeof users;
  vans: typeof vans;
  washTypes: typeof washTypes;
  zones: typeof zones;
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
