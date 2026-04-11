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
 * @summary       Orchestrates durable org setup for this demo branch.
 * @description   Composes shared tasks from setup-tasks.mjs into the sequence needed
 *                to set up a durable org (DE, sandbox, etc.) for this demo.
 *                Edit this file to add, remove, or reorder tasks for your demo.
 *                To disable a task block, remove the leading `/` from the `//*` line
 *                so it becomes `/*`, which turns the block into a comment.
 * @version       1.0.0
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Libraries & Modules
import { agentUsername, agentNickname,
         baselineTag }                    from './setup.mjs';
import { TaskRunner }                     from './sfdx-falcon/task-runner/index.mjs';
import { SfdxFalconError }                from './sfdx-falcon/error/index.mjs';
import { isPermSetGroupNotUpdated }       from './sfdx-falcon/utilities/sfdx.mjs';

// Import Shared Task Definitions
import { resetToBaseline,
         cleanEmptyDirs,
         assignPermSets,
         deployManifest,
         importDataPlan,
         queryAgentUserProfileId,
         updateAgentUserJson,
         createAgentUser,
         setAgentBundleUser,
         publishAgent,
         activateAgent,
         postSetupReset }                 from './setup-tasks.mjs';

// Shared retry options for permission set assignments that depend on
// PermissionSetGroup recalculation, which can take several seconds.
const RETRY_OPTS = { maxAttempts: 6, delayMs: 10000, retryIf: isPermSetGroupNotUpdated };

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    buildDurableOrgEnv
 * @returns     {Promise<void>}
 * @summary     Sets up a durable org for this demo.
 * @description Deploys project source using the manifest, configures permissions,
 *              creates the agent user, and assigns agent permissions.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export async function buildDurableOrgEnv() {

  const tr = TaskRunner.getInstance();
  tr.ctx   = {};

  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Reset all tracked files to the baseline tag before anything else runs.
  // This guarantees a clean, known state regardless of what the working tree
  // looks like when the script is invoked.
  resetToBaseline(tr, baselineTag);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Remove any empty directories left over from the baseline reset.
  cleanEmptyDirs(tr);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign Prompt Template perm sets before deployment.
  // Without these, AiAuthoringBundle deployment fails validation because it can't
  // "see" the GenAiPromptTemplate metadata even though it's already in the org.
  assignPermSets(tr,
    `Assign Prompt Template perm sets`,
    `-n EinsteinGPTPromptTemplateManager -n EinsteinGPTPromptTemplateUser`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy project source to the org.
  deployManifest(tr,
    `Deploy everything except agent authoring bundles`,
    `manifests/EverythingExceptAgents.package.xml`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign Space Station permissions to admin user before data import.
  assignPermSets(tr,
    `Assign "Space_Station_Permset" to admin user`,
    `-n Space_Station_Permset`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Import space station sample data (stations, resources, supplies).
  importDataPlan(tr,
    `Import space station sample data`,
    `data-import/sample-data-plan.json`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign Property Management permissions to admin user before data import.
  assignPermSets(tr,
    `Assign "Property_Management_Access" to admin user`,
    `-n Property_Management_Access`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Import property manager sample data.
  importDataPlan(tr,
    `Import property manager sample data`,
    `data-import/property-manager-data/data-plan.json`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //──────────────────────────────────────────────────────────────���────────────────────────────────┐
  //*
  // Query for the Einstein Agent User profile ID.
  queryAgentUserProfileId(tr);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Update data-import/User.json with the profile ID and a unique username.
  updateAgentUserJson(tr, agentUsername, agentNickname);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Create the agent user from data-import/User.json.
  createAgentUser(tr, agentUsername);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign admin permissions to the current user.
  assignPermSets(tr,
    `Assign "AFDX_User_Perms" to admin user`,
    `-n AFDX_User_Perms`,
    { retry: RETRY_OPTS });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Assign agent permissions to the agent user.
  assignPermSets(tr,
    `Assign "AFDX_Agent_Perms" to ${agentUsername}`,
    `-n AFDX_Agent_Perms -b ${agentUsername}`,
    { retry: RETRY_OPTS });
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Replace the placeholder agent user in the Local Info Agent authoring bundle
  // with the actual agent username so the agent runs under the correct user.
  setAgentBundleUser(tr, 'Local_Info_Agent', agentUsername);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy the authoring bundle with the agent user set.
  deployManifest(tr,
    `Deploy authoring bundle with agent user set`,
    `manifests/AuthoringBundles.package.xml`);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Publish the Local Info Agent.
  publishAgent(tr, 'Local_Info_Agent');
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Activate the Local Info Agent.
  activateAgent(tr, 'Local_Info_Agent');
  //*/
  //─────────────────────────────────────────────────────���─────────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  //*
  // Deploy agent tests.
  deployManifest(tr,
    `Deploy agent tests`,
    `manifests/AgentTests.package.xml`);
  //*/
  //─────────────────────────────────────────────────────────��─────────────────────────────────────┘
  //───────────────────────────────────────────────────────────────────────────────────────────────┐
  /*
  // Reset all tracked files back to the baseline tag after setup completes.
  // This restores files that were modified during setup (e.g. data-import/User.json)
  // so the repo is left in the same clean state it started in.
  postSetupReset(tr, baselineTag);
  //*/
  //───────────────────────────────────────────────────────────────────────────────────────────────┘

  // Run the tasks.
  try {
    return tr.runTasks();
  } catch (ListrRuntimeError) {
    console.error(SfdxFalconError.renderError(ListrRuntimeError));
  }
}
