# AFDX Theater Demo

Demo environment for **Agentforce DX** and the **`developing-agentforce` skill** using Agentforce Vibes (AFV) to vibe code an agent. 

## Setup

### Step 1: Clone and open in VS Code

1. Clone this repo.
```bash
git clone https://github.com/VivekMChawla/tdx26-demos.git
```
2. Open the `tdx26-demos` folder in VS Code.
3. Open the **integrated terminal** in VS Code. *(Navigate to the top menu and select View > Terminal)*

> Run all CLI commands from the VS Code integrated terminal from this point forward.

### Step 2: Authenticate your DevHub

```bash
sf org login web -d -a MyDevHub
```

If you're already authenticated to a DevHub org, set it as the default for this project:
```bash
sf config set target-dev-hub=MyDevHub
```
Replace `MyDevHub` with your preferred DevHub alias or username.

### Step 3: Checkout the theater demo branch

```bash
# Example
git checkout afdx-theater-demo
```

### Step 4: Run the setup script

The setup script creates an org, deploys source, assigns permissions, imports sample data. It also creates an **agent user** as part of this process, something that's required by Agentforce Service Agents. Prompt AFV to "find Agent Users" in the org if you need to recall this username.

**macOS / Linux / WSL:**
```bash
./setup
```

**OPTIONAL: Testing With an existing org (DE org, sandbox, etc.):**

If you don't have a DevHub or prefer not to use scratch orgs, you can run setup against a Developer Edition org or sandbox instead.

1. Set the default target org for your project.
```bash
sf config set target-org=<username|alias>
```
2. Run the setup script with the `--durable-org` flag.
```bash
./setup --durable-org
```
### Resetting Your Test Environment

The setup script always cleans up your project, deletes the current scratch org, and prepares a new scratch org for the next demo.

```bash
./setup
```

## Test Prompts

> **⚠️ IMPORTANT NOTE:** Each of the following Test Prompts are intended to be run in a **fresh test environment**. Combining test prompts is fine for *exploration*, but will invalidate the scoring process executed from inside the `afdx-skill-dev` repo.

Open **Agentforce Vibes** in VS Code and paste one of the prompts below. Each prompt targets a different scenario and difficulty level.

### T01: Event Coordinator (Service Agent)

A casual, soft prompt with no technical vocabulary. Tests whether the skill infers `AgentforceServiceAgent` from "customers" language, discovers the existing `CheckWeather` Apex class, and navigates the `default_agent_user` flow.

```
Create an agent to help customers manage events. It should be able to...

1. Lookup events — search for upcoming events by date or category.
2. Do venue bookings — check venue availability and reserve them.
3. Weather forecast — get the weather for the local area.

Get the customer's username before doing lookups, because
events are filtered by customer. If someone asks about something
unrelated to events, pretend you're a pirate and redirect them.
```

### T02: Station Commander (Employee Agent)

A short prompt with an explicit employee signal. Tests employee agent inference, object discovery in a noisy brownfield project, and Flow triage (the existing `Fully_Operational_Space_Station` Flow is record-triggered and cannot back an action).

```
Create a 'Station Commander' agent accessible by employee designated as Space station Managers. This agent should be grounded in the Space Station, Supply, and Resource data, allowing it to assist users by answering questions about supply levels and station project status. Read the `developing-agentforce` skill and all recommended reference files to guide you in this task.
```

### T03-A: Simple Property Assistant (Employee Agent)

A simplified prompt with one specific behavioral example spanning a single table. Tests object graph triage at scale (~18 custom objects) and non-trivial Apex generation (SOQL queries).

```
Create a 'Property Assistant' agent accessible by employees designated as Property Managers. This agent should be grounded in Property and Tenant data to ONLY answer questions about property status, like "Which properties are available"? Read the `developing-agentforce` skill and all recommended reference files to guide you in this task.
```

### T03-B: Full Property Assistant (Employee Agent + Analytics + Follow-up)

A detailed prompt with specific behavioral examples spanning simple lookups and complex analytics. Tests object graph triage at scale (~18 custom objects), non-trivial Apex generation (aggregation queries, date arithmetic), and a mandatory multi-agent follow-up phase.

```
Create a 'Property Assistant' agent accessible by employees designated as Property Managers. This agent should be grounded in the Property, Tenant and Maintenance data.

The agent should answer questions about maintenance requests and property status, like:

- Which properties are available
- Which have submitted applications and the status of those applications
- Which have maintenance requests and the status of those requests

It would be ideal if the agent could also answer more complex analytic questions such as:

- What is the min, max and average number of days until a maintenance problem is resolved?
- Show this info as total but also for each maintenance request type such as plumbing?
- What is my total rental income in San Francisco?
- How many properties are empty in San Francisco and what is total lost of income?

Read the `developing-agentforce` skill and all recommended reference files to guide you in this task.
```

After the Property Assistant is published, paste this follow-up prompt:

```
Hey, could you publish the local info agent, too? Afterward, make sure the published version behaves right.
```

## Exploring the Result

Use the **Agentforce DX preview panel** in VS Code to manually preview the agent:

1. Open the new `.agent` file under `force-app/main/default/aiAuthoringBundles/` in the editor.
2. Right-click inside the agent and select **AFDX: Preview this Agent**.
3. Click the **Start Live Test** button. If you see **Start Simulation** instead, click the down-arrow and select **Live Test** first.

## Suggested Exploration Prompts

After building an agent with one of the Test Prompts, try these exploration prompts in the Agentforce DX preview panel to exercise the agent's capabilities.

### Event Coordinator

- *"I'd like to find events happening next week"* — triggers username collection, then event lookup
- *"Can you book the main conference room for February 28?"* — triggers venue booking
- *"Draft an announcement for our company hackathon on March 15"* — triggers the instruction-driven announcement topic
- *"What's the weather like?"* — should be redirected as off-topic (with pirate personality)

### Station Commander

- *"What's the current status of all space stations?"* — triggers station status lookup
- *"Which stations are running low on supplies?"* — triggers supply level query across stations
- *"What resources are assigned to Station Alpha?"* — triggers resource lookup by station

### Property Assistant

- *"Which properties are currently available?"* — triggers property availability lookup
- *"Are there any pending applications?"* — triggers application status query
- *"What open maintenance requests do we have?"* — triggers maintenance status lookup
- *"What's the average time to resolve a plumbing issue?"* — triggers analytics aggregation
- *"What's my total rental income in San Francisco?"* — triggers rental income calculation
