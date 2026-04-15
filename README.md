# AFDX Breakout Demo

### Retrieve the `Order_Management_Agent`
```bash
sf project retrieve start -m AiAuthoringBundle:Order_Management_Agent
```
### Ask Agentforce Vibes to explain the Order Management agent
```
I want to understand the `Order_Management_Agent`. Please create an agent spec. Use the `developing-agentforce` skill for guidance.
```
### Test drive the Order Management agent with VS Code
```
I'd like a refund for my last apparel purchase. My email is elijah@salesforce.com
```
### Test drive the Order Management agent with the CLI
```bash
sf agent preview --authoring-bundle Order_Management_Agent --use-live-actions
```
### Ask Agentforce Vibes to review trace files
```
Review the trace files for the last Order_Management_Agent session. I expected Elijah to be escalated but he was denied instead. Please explain why. Use the developing-agentforce skill for guidance.
```
### Ask Agentforce Vibes to modify the Order Management agent
```
Please add a condition to the Order_Management_Agent to escalate when a customer who has the `Premium` tier requests a refund.  Use the developing-agentforce skill for guidance.
```
### Ask Agentforce Vibes to test the changes
```
Please test by using elijah@salesforce.com for the email and ask for a refund of your last purchase.
```
