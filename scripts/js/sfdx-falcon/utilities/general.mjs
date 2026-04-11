/*
 * Copyright (c) 2026, Salesforce, Inc.
 * SPDX-License-Identifier: Apache-2
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @file          sfdx-falcon/utilities/general.mjs
 * @author        Vivek M. Chawla <@VivekMChawla> (original 2018)
 * @summary       SFDX-Falcon Utility Module
 * @description   Exports functions that provide common, helpful utility logic.
 * @version       1.0.0
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Libraries, Modules, and Types.

// Import Internal Modules, Classes, and Functions.
import { SfdxFalconDebug }  from "../debug/index.mjs";              // Internal debug module.

// Set the File Local Debug Namespace
const dbgNs = 'UTILITY:general';
SfdxFalconDebug.msg(`${dbgNs}`, `Debugging initialized for ${dbgNs}`);

// ────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    sleep
 * @param       {number} ms  Required. The number of milliseconds to sleep.
 * @returns     {Promise<void>}  Resolves after the specified delay.
 * @summary     Pauses execution for the specified number of milliseconds.
 * @description Returns a Promise that resolves after the specified delay,
 *              allowing `await sleep(ms)` to pause async execution inline.
 * @public
 * @example
 * ```
 * await sleep(5000); // Wait 5 seconds.
 * ```
 */
// ────────────────────────────────────────────────────────────────────────────────────────────────┘
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}