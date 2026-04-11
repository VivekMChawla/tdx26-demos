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
 * @file          build-durable-org-env.mjs
 * @author        Vivek M. Chawla <@VivekMChawla> (original 2023)
 * @summary       Implements a series of CLI commands that set up a durable org for this project.
 * @description   Deploys source and configures users and permissions for the AFDX Pro-Code
 *                Testdrive project in a durable org (DE, sandbox, etc.).
 * @version       1.0.0
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Libraries & Modules
import { $, fs }               from "zx";

// Import Internal Classes & Functions
import { agentUsername, agentNickname,
         baselineTag }          from './setup.mjs';
import { TaskRunner }           from './sfdx-falcon/task-runner/index.mjs';
import { SfdxTask }             from './sfdx-falcon/task-runner/sfdx-task.mjs';
import { SfdxFalconError }      from './sfdx-falcon/error/index.mjs';
import { SfdxFalconDebug }      from './sfdx-falcon/debug/index.mjs';
import { isDuplicatePermSetAssignment,
         isPermSetGroupNotUpdated }
                                from './sfdx-falcon/utilities/sfdx.mjs';

// Set the File Local Debug Namespace
const dbgNs = 'BuildDurableOrgEnv';
SfdxFalconDebug.msg(`${dbgNs}`, `Debugging initialized for ${dbgNs}`);
//─────────────────────────────────────────────────────────────────────────────────────────────────┐
//─────────────────────────────────────────────────────────────────────────────────────────────────┘

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    buildDurableOrgEnv
 * @returns     {Promise<void>}
 * @summary     Sets up a durable org for the AFDX Pro-Code Testdrive project.
 * @description Deploys project source using the manifest, configures permissions,
 *              creates the agent user, and assigns agent permissions.
 * @public
 * @example
 * ```
 * await buildDurableOrgEnv();
 * ```
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export async function buildDurableOrgEnv() {

  const ctx = {};
  const tr  = TaskRunner.getInstance();
  tr.ctx    = ctx;

  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Reset all tracked files to the baseline tag before anything else runs.
  // This guarantees a clean, known state regardless of what the working tree
  // looks like when the script is invoked.
  tr.addTask({
    title: `Reset tracked files to baseline (${baselineTag})`,
    task: async (ctx, task) => {
      await $`git checkout ${baselineTag} -- .`;
    }
  });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Remove any empty directories left over from the baseline reset.
  tr.addTask({
    title: `Clean up empty directories`,
    task: async (ctx, task) => {
      await $`./clean-files-and-dirs.sh`;
    }
  });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign Prompt Template perm sets before deployment.
  // Without these, AiAuthoringBundle deployment fails validation because it can't
  // "see" the GenAiPromptTemplate metadata even though it's already in the org.
  tr.addTask(new SfdxTask(
    `Assign Prompt Template perm sets`,
    `sf org assign permset -n EinsteinGPTPromptTemplateManager -n EinsteinGPTPromptTemplateUser`,
    {suppressErrors: isDuplicatePermSetAssignment, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy project source to the org.
  tr.addTask(new SfdxTask(
    `Deploy everything except agent authoring bundles`,
    `sf project deploy start --manifest manifests/EverythingExceptAgents.package.xml`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Assign Space Station permissions to admin user before data import.
  tr.addTask(new SfdxTask(
    `Assign "Space_Station_Permset" to admin user`,
    `sf org assign permset -n Space_Station_Permset`,
    {suppressErrors: isDuplicatePermSetAssignment, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Import space station sample data (stations, resources, supplies).
  tr.addTask(new SfdxTask(
    `Import space station sample data`,
    `sf data import tree --plan data-import/sample-data-plan.json`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Assign Property Management permissions to admin user before data import.
  tr.addTask(new SfdxTask(
    `Assign "Property_Management_Access" to admin user`,
    `sf org assign permset -n Property_Management_Access`,
    {suppressErrors: isDuplicatePermSetAssignment, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Import property manager sample data.
  tr.addTask(new SfdxTask(
    `Import property manager sample data`,
    `sf data import tree --plan data-import/property-manager-data/data-plan.json`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Query for the Einstein Agent User profile ID.
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
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Update data-import/User.json with the profile ID and a unique username.
  tr.addTask({
    title: `Update User.json (${agentUsername})`,
    task: async (ctx, task) => {
      const userJson = fs.readJsonSync('data-import/User.json');
      userJson.records[0].ProfileId = ctx.profileId;
      userJson.records[0].Username = agentUsername;
      userJson.records[0].CommunityNickname = agentNickname;
      fs.writeJsonSync('data-import/User.json', userJson, { spaces: 4 });
    }
  });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Create the agent user from data-import/User.json.
  tr.addTask(new SfdxTask(
    `Create agent user (${agentUsername})`,
    `sf data import tree --files data-import/User.json`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign admin permissions to the current user.
  tr.addTask(new SfdxTask(
    `Assign "AFDX_User_Perms" to admin user`,
    `sf org assign permset -n AFDX_User_Perms`,
    {suppressErrors: isDuplicatePermSetAssignment, renderStdioOnError: true,
      retry: { maxAttempts: 6, delayMs: 10000, retryIf: isPermSetGroupNotUpdated }}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign agent permissions to the agent user.
  tr.addTask(new SfdxTask(
    `Assign "AFDX_Agent_Perms" to ${agentUsername}`,
    `sf org assign permset -n AFDX_Agent_Perms -b ${agentUsername}`,
    {suppressErrors: isDuplicatePermSetAssignment, renderStdioOnError: true,
      retry: { maxAttempts: 6, delayMs: 10000, retryIf: isPermSetGroupNotUpdated }}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Replace the placeholder agent user in the Local Info Agent authoring bundle
  // with the actual agent username so the agent runs under the correct user.
  tr.addTask({
    title: `Update Local_Info_Agent default_agent_user (${agentUsername})`,
    task: async (ctx, task) => {
      const agentFilePath = 'force-app/main/default/aiAuthoringBundles/Local_Info_Agent/Local_Info_Agent.agent';
      const content = fs.readFileSync(agentFilePath, 'utf8');
      fs.writeFileSync(agentFilePath, content.replace('UPDATE_WITH_YOUR_DEFAULT_AGENT_USER', agentUsername));
    }
  });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy the authoring bundle with the agent user set.
  tr.addTask(new SfdxTask(
    `Deploy authoring bundle with agent user set`,
    `sf project deploy start --manifest manifests/AuthoringBundles.package.xml`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Publish the Local Info Agent.
  tr.addTask(new SfdxTask(
    `Publish the Local Info Agent`,
    `sf agent publish authoring-bundle -n Local_Info_Agent`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Activate the Local Info Agent.
  tr.addTask(new SfdxTask(
    `Activate the Local Info Agent`,
    `sf agent activate -n Local_Info_Agent --version 1`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy agent tests.
  tr.addTask(new SfdxTask(
    `Deploy agent tests`,
    `sf project deploy start --manifest manifests/AgentTests.package.xml`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Reset all tracked files back to the baseline tag after setup completes.
  // This restores files that were modified during setup (e.g. data-import/User.json)
  // so the repo is left in the same clean state it started in.
  tr.addTask({
    title: `Reset files modified during setup to baseline (${baselineTag})`,
    task: async (ctx, task) => {
      await $`git checkout ${baselineTag} -- .`;
    }
  });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘

  // Run the tasks.
  try {
    return tr.runTasks();
  } catch (ListrRuntimeError) {
    console.error(SfdxFalconError.renderError(ListrRuntimeError));
  }
}
