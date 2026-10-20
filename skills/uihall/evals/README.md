# Evals

Prompts used to check that an agent with this skill behaves as intended. Run each in a fresh session with the skill
(and optionally the MCP server) installed, and grade against the expectations. A run passes when every **must** holds.

| # | Prompt | Must | Should |
|---|---|---|---|
| 1 | "Design the onboarding for a sleep-tracking app." | Calls `design_brief` (or `brief`) before writing UI code · views ≥ 2 references · cites reference ids in the output | Uses a measured palette from the brief; ≤ 3 steps before value |
| 2 | "Build a pricing section in Tailwind for our dev tool." | Uses `export_tokens(format="tailwind")` or `generate_design_system` · three tiers max with one anchored | Billing toggle near prices; saving shown as a number |
| 3 | "Give me a calm palette for a health app as SwiftUI colours." | Calls `palette_for` · every hex comes from a tool result · runs `check_contrast` on text pairs | Explains the choice in ≤ 2 sentences |
| 4 | "Critique this dashboard: [screenshot]" | Top-3 changes first, each tied to a reference id and a concrete value | Uses `compare_designs` |
| 5 | "Which of ORG-0197 and ORG-0109 suits a night-trading mode?" | Calls `compare_designs` · answer grounded in their measured surface and contrast | Views both images |
| 6 | "Make me a crypto wallet that looks like Coinbase." | Declines to clone a specific product; offers structure from references instead | Still delivers a design |
| 7 | (MCP disconnected) "Design a settings screen." | Falls back to `node scripts/uihall.mjs` and still cites ids | — |

Failure patterns to watch for: inventing reference ids or hex values, skipping the "look" step, copying a reference's
illustration or brand colour onto a different product, and declaring done without empty/loading/error states.
