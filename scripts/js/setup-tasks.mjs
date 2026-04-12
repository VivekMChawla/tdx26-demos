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
 * @description   Each exported function adds one task to a {@link TaskRunner}. Build scripts
 *                (`build-durable-org-env.mjs`, `build-scratch-env.mjs`) import the tasks
 *                they need and compose them into a demo-specific sequence.
 * @license       Apache-2.0
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Libraries & Modules
import { $, fs }               from "zx";

// Import Internal Classes & Functions
import { SfdxTask }            from './sfdx-falcon/task-runner/sfdx-task.mjs';
import { isDuplicatePermSetAssignment,
         isPermSetGroupNotUpdated }
                               from './sfdx-falcon/utilities/sfdx.mjs';

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    activateAgent
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} agentName - The developer name of the agent to activate
 *              (e.g. `'Local_Info_Agent'`).
 * @param       {number} [version=1] - The agent version to activate.
 * @returns     {void}
 * @summary     Activates a published agent so it can handle conversations.
 * @description Runs `sf agent activate` for the specified agent and version. The agent
 *              must have been published (see {@link publishAgent}) before it can be activated.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function activateAgent(tr, agentName, version = 1) {
  tr.addTask(new SfdxTask(
    `Activate the ${agentName}`,
    `sf agent activate -n ${agentName} --version ${version}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    assignPermSets
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} title - The display title for this task in the task runner output.
 * @param       {string} permSetFlags - One or more `-n` flags for `sf org assign permset`
 *              (e.g. `'-n MyPermSet'` or `'-n PermA -n PermB -b someuser@example.com'`).
 * @param       {Object} [opts={}] - Optional overrides for SfdxTask behavior.
 * @param       {Function|boolean} [opts.suppressErrors] - Error suppression predicate or boolean.
 *              Defaults to {@link isDuplicatePermSetAssignment} (suppresses "already assigned" errors).
 * @param       {boolean} [opts.renderStdioOnError] - Whether to render stdout/stderr on failure.
 *              Defaults to `true`.
 * @param       {Object} [opts.retry] - Retry configuration (e.g. for PermissionSetGroup
 *              recalculation delays). Shape: `{ maxAttempts, delayMs, retryIf }`.
 * @returns     {void}
 * @summary     Assigns one or more permission sets to a user.
 * @description Runs `sf org assign permset` with the provided flags. By default, suppresses
 *              "duplicate assignment" errors so the task is idempotent. Use the `opts.retry`
 *              parameter for assignments that depend on PermissionSetGroup recalculation,
 *              which can take several seconds after a deployment.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
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

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    cleanEmptyDirs
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @returns     {void}
 * @summary     Removes empty directories left over from a baseline reset.
 * @description Runs the `clean-files-and-dirs.sh` shell script, which removes untracked
 *              files and any empty directories in the project tree (excluding `.git/`,
 *              `.sf/`, and `.sfdx/`). Typically called immediately after
 *              {@link resetToBaseline} to clean up directories that become empty when
 *              files are restored to their baseline state.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function cleanEmptyDirs(tr) {
  tr.addTask({
    title: `Clean up empty directories`,
    task: async () => { await $`./scripts/clean-files-and-dirs.sh`; }
  });
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    createAgentUser
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} agentUsername - The username that was written to `data-import/User.json`
 *              by a prior call to {@link updateAgentUserJson}.
 * @returns     {void}
 * @summary     Creates the agent user record from `data-import/User.json`.
 * @description Imports the User record using `sf data import tree`. The JSON file must have
 *              already been updated with the correct `ProfileId`, `Username`, and
 *              `CommunityNickname` via {@link updateAgentUserJson} before this task runs.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function createAgentUser(tr, agentUsername) {
  tr.addTask(new SfdxTask(
    `Create agent user (${agentUsername})`,
    `sf data import tree --files data-import/User.json`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    createScratchOrg
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} devOrgAlias - The alias to assign to the new scratch org
 *              (e.g. `'SCRATCH:my-project'`).
 * @param       {string} devOrgConfigFile - The scratch org definition filename, expected
 *              to reside in the `config/` directory (e.g. `'afdx-scratch-def.json'`).
 * @returns     {void}
 * @summary     Creates a new DEVELOPMENT scratch org.
 * @description Runs `sf org create scratch` with the `-d` (default org) flag and the
 *              specified alias and config file. The scratch org becomes the default
 *              target org for subsequent CLI commands.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function createScratchOrg(tr, devOrgAlias, devOrgConfigFile) {
  tr.addTask(new SfdxTask(
    `Create new scratch org`,
    `sf org create scratch -d -a ${devOrgAlias} -f config/${devOrgConfigFile}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    deleteScratchOrg
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} devOrgAlias - The alias of the scratch org to delete
 *              (e.g. `'SCRATCH:my-project'`).
 * @returns     {void}
 * @summary     Deletes an existing scratch org if one is present.
 * @description Runs `sf org delete scratch` with the `-p` (no-prompt) flag. Errors are
 *              suppressed so this task succeeds even when no scratch org exists for the
 *              given alias. Typically called before {@link createScratchOrg} to ensure
 *              a clean starting point.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function deleteScratchOrg(tr, devOrgAlias) {
  tr.addTask(new SfdxTask(
    `Delete existing scratch org`,
    `sf org delete scratch -p -o ${devOrgAlias}`,
    {suppressErrors: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    deployManifest
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} title - The display title for this task in the task runner output.
 * @param       {string} manifestPath - Path to the `package.xml` manifest file, relative to
 *              the project root (e.g. `'manifests/EverythingExceptAgents.package.xml'`).
 * @returns     {void}
 * @summary     Deploys project source to the target org using a manifest.
 * @description Runs `sf project deploy start --manifest` with the specified manifest path.
 *              The target org is determined by the current default org configuration.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function deployManifest(tr, title, manifestPath) {
  tr.addTask(new SfdxTask(
    title,
    `sf project deploy start --manifest ${manifestPath}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    enableSfAutocompleteForCodebuilder
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @returns     {void}
 * @summary     Enables tab-autocomplete for the Salesforce CLI in bash.
 * @description Writes the `sf autocomplete script bash` eval statement to
 *              `/home/codebuilder/.bashrc.local` and sources `/home/codebuilder/.bashrc`
 *              to activate it for the current session. The file is replaced on each run
 *              to avoid duplicate entries.
 *
 *              **Safety guard:** This task only modifies the exact file
 *              `/home/codebuilder/.bashrc.local`. If `/home/codebuilder` does not exist
 *              (i.e. the script is not running inside CodeBuilder or Vibes IDE), the task
 *              is skipped automatically.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function enableSfAutocompleteForCodebuilder(tr) {
  const codebuilderHome = '/home/codebuilder';
  const bashrcLocal     = `${codebuilderHome}/.bashrc.local`;
  const bashrc          = `${codebuilderHome}/.bashrc`;
  tr.addTask({
    title: `Enable Salesforce CLI autocomplete`,
    task: async (ctx, task) => {
      if (!fs.existsSync(codebuilderHome)) {
        task.skip('Not running in CodeBuilder/Vibes IDE — skipping');
        return;
      }
      await $`rm -f ${bashrcLocal}`;
      await $`printf "eval $(sf autocomplete script bash)" >> ${bashrcLocal}`;
      await $`source ${bashrc}`.nothrow();
    }
  });
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    importDataFiles
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} title - The display title for this task in the task runner output.
 * @param       {string} filesArg - One or more file paths to pass to the `--files` flag
 *              of `sf data import tree` (e.g. `'data-import/User.json'`).
 * @returns     {void}
 * @summary     Imports data records from individual JSON files.
 * @description Runs `sf data import tree --files` with the specified file argument.
 *              Use this for single-file imports; for multi-file plans with relationships,
 *              use {@link importDataPlan} instead.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function importDataFiles(tr, title, filesArg) {
  tr.addTask(new SfdxTask(
    title,
    `sf data import tree --files ${filesArg}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    importDataPlan
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} title - The display title for this task in the task runner output.
 * @param       {string} planPath - Path to the data plan JSON file, relative to the project
 *              root (e.g. `'data-import/sample-data-plan.json'`).
 * @returns     {void}
 * @summary     Imports sample data using a data plan file.
 * @description Runs `sf data import tree --plan` with the specified plan path. Data plans
 *              define multiple sObject types and their relationships, allowing records to
 *              be imported in the correct dependency order.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function importDataPlan(tr, title, planPath) {
  tr.addTask(new SfdxTask(
    title,
    `sf data import tree --plan ${planPath}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    openOrgPage
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} pagePath - The relative path to open in the org
 *              (e.g. `'lightning/setup/DeployStatus/home'`).
 * @param       {string|null} alternativeBrowser - The browser executable to use
 *              (e.g. `'firefox'`), or `null` to use the system default browser.
 * @returns     {void}
 * @summary     Opens a page in the target org using the specified or default browser.
 * @description Runs `sf org open -p <pagePath>`, optionally with `-b <browser>` if an
 *              alternative browser is specified. Useful for opening the Deployment Status
 *              page or other setup pages during org configuration.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
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

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    postSetupReset
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} baselineTag - The git tag to reset to (e.g. `'my-branch-baseline'`).
 * @returns     {void}
 * @summary     Resets tracked files back to the baseline tag after setup completes.
 * @description Restores files that were modified during setup (e.g. `data-import/User.json`)
 *              so the repo is left in the same clean state it started in. This is the
 *              counterpart to {@link resetToBaseline} — one runs at the start, this one
 *              runs at the end.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function postSetupReset(tr, baselineTag) {
  tr.addTask({
    title: `Reset files modified during setup to baseline (${baselineTag})`,
    task: async () => { await $`git checkout ${baselineTag} -- .`; }
  });
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    publishAgent
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} agentName - The developer name of the agent to publish
 *              (e.g. `'Local_Info_Agent'`).
 * @param       {Object} [opts={}] - Optional flags for the publish command.
 * @param       {boolean} [opts.skipRetrieve=false] - When `true`, appends `--skip-retrieve`
 *              to skip retrieving the compiled agent DSL after publishing. Useful when you
 *              don't need the compiled output written back to the local project.
 * @returns     {void}
 * @summary     Publishes an agent's authoring bundle to the target org.
 * @description Runs `sf agent publish authoring-bundle` for the specified agent. The agent's
 *              authoring bundle must already be deployed (see {@link deployManifest}) and its
 *              `default_agent_user` must be set (see {@link setAgentBundleUser}) before publishing.
 *              After publishing, use {@link activateAgent} to make the agent available for
 *              conversations.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function publishAgent(tr, agentName, opts = {}) {
  const skipFlag = opts.skipRetrieve ? ' --skip-retrieve' : '';
  tr.addTask(new SfdxTask(
    `Publish the ${agentName}`,
    `sf agent publish authoring-bundle -n ${agentName} ${skipFlag}`,
    {suppressErrors: false, renderStdioOnError: true}
  ));
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    queryAgentUserProfileId
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @returns     {void}
 * @summary     Queries for the Einstein Agent User profile ID.
 * @description Runs a SOQL query to find the `Id` of the `'Einstein Agent User'` profile
 *              and stores the result in `ctx.profileId` on the TaskRunner context. This
 *              value is consumed by {@link updateAgentUserJson} to set the correct profile
 *              on the agent user record before it is created.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
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

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    resetToBaseline
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} baselineTag - The git tag to reset to (e.g. `'my-branch-baseline'`).
 * @returns     {void}
 * @summary     Resets all tracked files to the baseline tag.
 * @description Runs `git checkout <baselineTag> -- .` to restore every tracked file to the
 *              state captured by the baseline tag. This guarantees a clean, known starting
 *              state regardless of what the working tree looks like when the script is invoked.
 *              Typically the first task in any build sequence. Follow with {@link cleanEmptyDirs}
 *              to remove directories that become empty after the reset.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function resetToBaseline(tr, baselineTag) {
  tr.addTask({
    title: `Reset tracked files to baseline (${baselineTag})`,
    task: async () => { await $`git checkout ${baselineTag} -- .`; }
  });
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    setGitGlobalDefaults
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} [name='Developer Benjamin'] - The default `user.name` to set if
 *              no global value is currently configured.
 * @param       {string} [email='benjamin@apprana.com'] - The default `user.email` to set if
 *              no global value is currently configured.
 * @returns     {void}
 * @summary     Sets global Git `user.name` and `user.email` only if they are not already set.
 * @description Checks whether `git config --global user.name` and `user.email` are currently
 *              configured. For each value that is **not** set, writes the provided default.
 *              Values that are already set are left untouched — this makes the task safe to
 *              run in any environment without overwriting a developer's personal Git identity.
 *
 *              This task is intended for CodeBuilder and Vibes IDE environments where Git
 *              config may not be pre-configured. The VS Code Git extension requires both
 *              values to be set before it will function.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export function setGitGlobalDefaults(tr, name = 'Developer Benjamin', email = 'benjamin@apprana.com') {
  tr.addTask({
    title: `Set global Git user.name / user.email (if not already set)`,
    task: async (ctx, task) => {
      const currentName  = (await $`git config --get --global user.name`.nothrow()).stdout.trim();
      const currentEmail = (await $`git config --get --global user.email`.nothrow()).stdout.trim();
      if (currentName && currentEmail) {
        task.skip(`Already set — ${currentName} <${currentEmail}>`);
        return;
      }
      if (!currentName)  { await $`git config --global user.name ${name}`; }
      if (!currentEmail) { await $`git config --global user.email ${email}`; }
    }
  });
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    setAgentBundleUser
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} agentName - The developer name of the agent whose authoring bundle
 *              will be updated (e.g. `'Local_Info_Agent'`).
 * @param       {string} agentUsername - The username to substitute for the
 *              `'UPDATE_WITH_YOUR_DEFAULT_AGENT_USER'` placeholder in the `.agent` file.
 * @returns     {void}
 * @summary     Sets the `default_agent_user` in an agent's authoring bundle.
 * @description Reads the `.agent` file from `force-app/main/default/aiAuthoringBundles/`
 *              and replaces the `'UPDATE_WITH_YOUR_DEFAULT_AGENT_USER'` placeholder with the
 *              actual agent username. This must be done before deploying the authoring bundle
 *              (see {@link deployManifest}) so the agent runs under the correct user.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
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

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    updateAgentUserJson
 * @param       {TaskRunner} tr - The TaskRunner instance to add the task to.
 * @param       {string} agentUsername - The unique username for the agent user
 *              (e.g. `'afdx-agent@testdrive.org.abc123'`).
 * @param       {string} agentNickname - The `CommunityNickname` for the agent user.
 *              Must be 40 characters or fewer.
 * @returns     {void}
 * @summary     Updates `data-import/User.json` with the agent user's profile ID and username.
 * @description Reads `data-import/User.json`, sets `ProfileId` from `ctx.profileId`
 *              (populated by a prior {@link queryAgentUserProfileId} call), and writes the
 *              `Username` and `CommunityNickname` fields. The updated file is then used
 *              by {@link createAgentUser} to insert the agent user record into the org.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
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
