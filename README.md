# AFDX Breakout Demo

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

### Step 3: Checkout the breakout demo branch

```bash
# Example
git checkout afdx-breakout-demo
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

Details TBD

## Suggested Exploration Prompts

Details TBD - Must update what's below

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
