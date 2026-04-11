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
 * @file          setup-tasks.mjs
 * @summary       Shared task definitions for durable-org and scratch-org build scripts.
 * @description   Each exported function adds one task to a TaskRunner. Build scripts
 *                (build-durable-org-env.mjs, build-scratch-env.mjs) import the tasks
 *                they need and compose them into a sequence.
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
import { $, fs }               from "zx";
import { SfdxTask }            from './sfdx-falcon/task-runner/sfdx-task.mjs';
import { isDuplicatePermSetAssignment,
         isPermSetGroupNotUpdated }
                               from './sfdx-falcon/utilities/sfdx.mjs';

// ── Baseline & cleanup ──────────────────────────────────────────────────────

/** Reset all tracked files to the baseline tag. */
export function resetToBaseline(tr, baselineTag) {
  tr.addTask({
    title: `Reset tracked files to baseline (${baselineTag})`,
    task: async () => { await $`git checkout ${baselineTag} -- .`; }
  });
}

/** Remove empty directories left over from a baseline reset. */
export function cleanEmptyDirs(tr) {
  tr.addTask({
    title: `Clean up empty directories`,
    task: async () => { await $`./scripts/clean-files-and-dirs.sh`; }
  });
}

/** Reset tracked files back to the baseline tag after setup completes. */
export function postSetupReset(tr, baselineTag) {
  tr.addTask({
    title: `Reset files modified during setup to baseline (${baselineTag})`,
    task: async () => { await $`git checkout ${baselineTag} -- .`; }
  });
}

// ── Scratch org lifecycle ───────────────────────────────────────────────────

/** Delete an existing scratch org (errors suppressed). */
export function deleteScratchOrg(tr, devOrgAlias) {
  tr.addTask(new SfdxTask(
    `Delete existing scratch org`,
    `sf org delete scratch -p -o ${devOrgAlias}`,
    {suppressErrors: true}
  ));
}

/** Create a new scratch org. */
export function createScratchOrg(tr, devOrgAlias, devOrgConfigFile) {
  tr.addTask(new SfdxTask(
    `Create new scratch org`,
    `sf org create scratch -d -a ${devOrgAlias} -f config/${devOrgConfigFile}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

/** Open a page in the scratch org's browser. */
export function openOrgPage(tr, pagePath, alternativeBrowser) {
  const cmd = alternativeBrowser
    ? `sf org open -b ${alternativeBrowser} -p ${pagePath}`
    : `sf org open -p ${pagePath}`;
  tr.addTask(new SfdxTask(
    `Open ${pagePath}`,
    cmd,
    {suppressErrors: false}
  ));
}

// ── Permissions ─────────────────────────────────────────────────────────────

/** Assign one or more permission sets (space-separated -n flags). */
export function assignPermSets(tr, title, permSetFlags, opts = {}) {
  tr.addTask(new SfdxTask(
    title,
    `sf org assign permset ${permSetFlags}`,
    {
      suppressErrors: opts.suppressErrors ?? isDuplicatePermSetAssignment,
      renderStdioOnError: opts.renderStdioOnError ?? true,
      ...(opts.retry && { retry: opts.retry })
    }
  ));
}

// ── Deployment ──────────────────────────────────────────────────────────────

/** Deploy a manifest. */
export function deployManifest(tr, title, manifestPath) {
  tr.addTask(new SfdxTask(
    title,
    `sf project deploy start --manifest ${manifestPath}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

// ── Data import ─────────────────────────────────────────────────────────────

/** Import data using a plan file. */
export function importDataPlan(tr, title, planPath) {
  tr.addTask(new SfdxTask(
    title,
    `sf data import tree --plan ${planPath}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

/** Import data using individual files. */
export function importDataFiles(tr, title, filesArg) {
  tr.addTask(new SfdxTask(
    title,
    `sf data import tree --files ${filesArg}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

// ── Agent user ──────────────────────────────────────────────────────────────

/** Query for the Einstein Agent User profile ID (stores result in ctx.profileId). */
export function queryAgentUserProfileId(tr) {
  tr.addTask(new SfdxTask(
    `Query for Einstein Agent User profile ID`,
    `sf data query -q "SELECT Id FROM Profile WHERE Name='Einstein Agent User'"`,
    {suppressErrors: false, renderStdioOnError: true,
      onSuccess: async (processPromise, ctx, task) => {
        ctx.profileId = processPromise.stdoutJson.result.records[0].Id;
        task.title = `Query for Einstein Agent User profile ID (${ctx.profileId})`;
      }
    }
  ));
}

/** Update data-import/User.json with the profile ID and agent username. */
export function updateAgentUserJson(tr, agentUsername, agentNickname) {
  tr.addTask({
    title: `Update User.json (${agentUsername})`,
    task: async (ctx) => {
      const userJson = fs.readJsonSync('data-import/User.json');
      userJson.records[0].ProfileId = ctx.profileId;
      userJson.records[0].Username = agentUsername;
      userJson.records[0].CommunityNickname = agentNickname;
      fs.writeJsonSync('data-import/User.json', userJson, { spaces: 4 });
    }
  });
}

/** Create the agent user from data-import/User.json. */
export function createAgentUser(tr, agentUsername) {
  tr.addTask(new SfdxTask(
    `Create agent user (${agentUsername})`,
    `sf data import tree --files data-import/User.json`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

// ── Agent lifecycle ─────────────────────────────────────────────────────────

/** Replace the placeholder agent user in an authoring bundle with the actual username. */
export function setAgentBundleUser(tr, agentName, agentUsername) {
  const agentFilePath = `force-app/main/default/aiAuthoringBundles/${agentName}/${agentName}.agent`;
  tr.addTask({
    title: `Update ${agentName} default_agent_user (${agentUsername})`,
    task: async () => {
      const content = fs.readFileSync(agentFilePath, 'utf8');
      fs.writeFileSync(agentFilePath, content.replace('UPDATE_WITH_YOUR_DEFAULT_AGENT_USER', agentUsername));
    }
  });
}

/** Publish an agent's authoring bundle. */
export function publishAgent(tr, agentName) {
  tr.addTask(new SfdxTask(
    `Publish the ${agentName}`,
    `sf agent publish authoring-bundle -n ${agentName}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

/** Activate a published agent. */
export function activateAgent(tr, agentName, version = 1) {
  tr.addTask(new SfdxTask(
    `Activate the ${agentName}`,
    `sf agent activate -n ${agentName} --version ${version}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}
