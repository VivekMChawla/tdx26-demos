#!/usr/bin/env node
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
 * @file          setup.mjs
 * @author        Vivek M. Chawla <@VivekMChawla> (original 2022)
 * @summary       Entry point for the AFDX setup script.
 * @description   Automates Salesforce org setup for the AFDX Pro-Code Testdrive project.
 * @version       1.0.0
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
import { $, argv, fs }                from "zx";
import { buildDurableOrgEnv }         from './build-durable-org-env.mjs';
import { buildScratchEnv }            from './build-scratch-env.mjs';
import { SfdxFalconDebug }            from './sfdx-falcon/debug/index.mjs';
import { SfdxFalconError }            from './sfdx-falcon/error/index.mjs';
import  * as SfdxUtils                from './sfdx-falcon/utilities/sfdx.mjs';

// Set the File Local Debug Namespace
const dbgNs = 'Setup';
SfdxFalconDebug.msg(`${dbgNs}`, `Debugging initialized for ${dbgNs}`);
//─────────────────────────────────────────────────────────────────────────────────────────────────┐
//─────────────────────────────────────────────────────────────────────────────────────────────────┘

/**
 * Initialize the SFDX-Falcon Debugger. 
 * To enable debug output, add the `--sfdx-falcon-debug` argument and
 * pass a string with a comma-separated list of debug namespaces that
 * you'd like to see output for. 
 * @example
 * ```
 * $> ./setup --sfdx-falcon-debug "UTIL:SFDX,Setup"
 * ```
 */
SfdxFalconDebug.init(argv);
/**
 * Disable the default quote processor used by ZX, otherwise a string template
 * variable that holds an entire command like `sf org delete scratch -o MyScratchOrg`
 * is seen as a single argument in need of escaping with double-quotes ("").
 * This results in a "command not found" shell error when ZX runs the command.
 */
$.quote = (arg) => {
  return arg;
}
/**
 * The "verbose" feature of ZX outputs too much. Turn it off.
 */
$.verbose = false;
/**
 * Fail fast if required org configuration is missing.
 * Default (scratch org): a default Dev Hub must be set.
 * With `--durable-org`: a default target org must be set.
 */
if (argv['durable-org']) {
  const targetOrgResult = await $`sf config get target-org --json`;
  const targetOrgConfig = JSON.parse(targetOrgResult.stdout);
  if (!targetOrgConfig.result?.[0]?.value) {
    console.error(`\nError: A default target org is required.\nSet one with:  sf config set target-org=<username|alias>\n`);
    process.exit(1);
  }
} else {
  const devHubResult = await $`sf config get target-dev-hub --json`;
  const devHubConfig = JSON.parse(devHubResult.stdout);
  if (!devHubConfig.result?.[0]?.value) {
    console.error(`\nError: A default Dev Hub is required to create a scratch org.\nSet one with:  sf config set target-dev-hub=<username|alias>\n`);
    process.exit(1);
  }
}
/**
 * Parsed JSON representation of `sfdx-project.json` in the directory
 * the setup script was run in.
 */
export const sfdxProjectJson = SfdxUtils.getSfdxProjectJson();
SfdxFalconDebug.obj(`${dbgNs}:sfdxProjectJson`, sfdxProjectJson);
/**
 * The name of the SFDX project in the directory the setup script was run in.
 * Reverts to `packaging-project` if the `name` key in `sfdx-project.json`
 * is `undefined`.
 */
export const sfdxProjectName = SfdxUtils.getSfdxProjectName(sfdxProjectJson);
SfdxFalconDebug.str(`${dbgNs}:sfdxProjectName`, sfdxProjectName);
/**
 * The alias for DEV scratch orgs used by this SFDX project.
 */
export const devOrgAlias = `SCRATCH:${sfdxProjectName}`;
SfdxFalconDebug.str(`${dbgNs}:devOrgAlias`, devOrgAlias);
/**
 * The name of the scratch org configuration file for DEV environments.
 * Please note that the file must be located in the `config` subdirectory
 * at the root of your SFDX project directory.
 */
export const devOrgConfigFile = "afdx-scratch-def.json";
SfdxFalconDebug.str(`${dbgNs}:devOrgConfigFile`, devOrgConfigFile);
/**
 * Optional local overrides loaded from `local-settings.json` at the project root.
 * This file is gitignored — it is never committed and is safe for machine-specific config.
 * Supported keys:
 *   useAlternativeBrowser {boolean} — if true, open scratch org pages in alternativeBrowser
 *   alternativeBrowser    {string}  — browser executable name (e.g. "firefox", "chrome")
 */
const _localSettings = fs.existsSync('local-settings.json')
  ? fs.readJsonSync('local-settings.json')
  : {};
/**
 * The browser to use when opening scratch org pages, or null to use the system default.
 * Populated only when local-settings.json sets both `useAlternativeBrowser: true`
 * and a non-empty `alternativeBrowser` value.
 */
export const alternativeBrowser = (_localSettings.useAlternativeBrowser && _localSettings.alternativeBrowser)
  ? _localSettings.alternativeBrowser
  : null;
/**
 * The path to the Salesforce Setup page that shows the status of a deployment.
 */
export const deploymentStatusPage = "lightning/setup/DeployStatus/home";
/**
 * A unique username for the agent user, generated at startup.
 * Used in task titles, CLI commands, and written to `data-import/User.json`
 * before the agent user is created.
 */
export const agentUsername = SfdxUtils.createUniqueUsername('afdx-agent@testdrive.org');
SfdxFalconDebug.str(`${dbgNs}:agentUsername`, agentUsername);
/**
 * A unique CommunityNickname for the agent user, generated at startup.
 * Written to `data-import/User.json` before the agent user is created.
 */
export const agentNickname = SfdxUtils.createUniqueUsername('afdx@nick.name').substring(0, 40); // CommunityNickname has a max length of 40 characters.
SfdxFalconDebug.str(`${dbgNs}:agentNickname`, agentNickname);
/**
 * The git tag name that marks the baseline state of this repo.
 * Derived at runtime from the current branch name: `<branch>-baseline`.
 * The setup script resets all tracked files to this tag at the start and end
 * of each run: first to guarantee a clean baseline, last to restore any files
 * (e.g. data-import/User.json) that the setup process modifies.
 */
const _currentBranch = (await $`git rev-parse --abbrev-ref HEAD`).stdout.trim();
export const baselineTag = `${_currentBranch}-baseline`;
SfdxFalconDebug.str(`${dbgNs}:baselineTag`, baselineTag);
// Route to the appropriate build script based on the --scratch-org flag.
// Default: build-org-env.mjs (for DE orgs, sandboxes, etc.)
// With --scratch-org: build-scratch-env.mjs (creates and configures a new scratch org)
const buildFn = argv['durable-org'] ? buildDurableOrgEnv : buildScratchEnv;
try {
  await buildFn();
} catch (buildError) {
  // Something failed.
  console.log(SfdxFalconError.renderError(buildError));
  process.exit(1);
}
// Everything succeeded.
process.exit(0);
