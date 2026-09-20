# AGENTS.md — ByteHouse AI Coding Agent Instructions

> **Canonical source:** `ANALYSIS.md`
>
> `ANALYSIS.md` is the single source of truth for what ByteHouse is, why it exists, how the complete project is intended to evolve, and the long-term development philosophy.
>
> `ARCHITECTURE.md`, `DECISIONS.md`, and `PROGRESS.md` are execution/governance documents derived from that source. They must never quietly redefine the product vision.

---

# 1. Mission

You are an AI coding agent working on **ByteHouse**.

ByteHouse is a long-term project to build a persistent personal AI system — a cross-device personal intelligence layer inspired by the "Friday/JARVIS" style of interaction.

The final system is intended to combine:

- AI conversation and reasoning
- persistent personal memory
- contextual understanding
- controlled tools and actions
- personal productivity/domain capabilities
- Mac + mobile clients
- visual presence and voice
- event awareness
- selective proactive behavior
- pattern learning
- controlled automation
- extensibility
- eventually, an AI-native system layer

The complete vision is documented in `ANALYSIS.md`.

**Your job is not to build the entire vision in one session.**

Your job is to build the **current phase** correctly while preserving the architecture needed for the final goal.

---

# 2. Source-of-Truth Hierarchy

When working on ByteHouse, use this hierarchy:

```text
ANALYSIS.md
    ↓
current architecture / execution decisions / progress
    ↓
current source code
    ↓
current task prompt
```

However, an explicit instruction from the human for the current task takes precedence for that turn. If it intentionally changes the planned product direction, record that change appropriately.

## 2.1 What each file means

### `ANALYSIS.md`

The canonical product and development vision.

It contains:

- what ByteHouse is
- product philosophy
- long-term architecture
- memory model
- context model
- tool model
- Mac/mobile direction
- presence/voice direction
- proactive system
- automation
- extensibility
- AI-native system direction
- phase roadmap
- vibe-coding methodology
- long-term success criteria

Do not reinterpret or silently replace this vision.

### `ARCHITECTURE.md`

The architecture derived from `ANALYSIS.md`.

It describes:

- what exists now
- what the active phase is allowed to contain
- the intended boundaries between subsystems
- how the current implementation fits the final architecture
- what later phases will add

It must distinguish **implemented/current** from **planned/future**.

### `DECISIONS.md`

The append-only record of important choices.

It records:

- decisions already made
- why they were made
- alternatives considered
- whether they remain active or were superseded

Do not use it to invent a new product direction.

### `PROGRESS.md`

The execution state.

It records:

- current phase/milestone
- completed work
- verification status
- known limitations
- upcoming work
- version/phase progress

Never mark work complete merely because code was written.

---

# 3. Required Reading — Every Coding Session

Before modifying code:

```text
1. ANALYSIS.md
2. ARCHITECTURE.md
3. DECISIONS.md
4. PROGRESS.md
5. relevant source files
```

Why:

```text
ANALYSIS
→ understand the destination

ARCHITECTURE
→ understand the current system and boundaries

DECISIONS
→ avoid repeating rejected choices

PROGRESS
→ understand what is actually active

SOURCE
→ understand the implementation
```

Never treat a single code file as the complete architecture.

---

# 4. Full Project Context

The final ByteHouse system is larger than the active implementation.

The long-term architecture described in `ANALYSIS.md` can be thought of as:

```text
                         BYTEHOUSE
                             │
              ┌──────────────┴──────────────┐
              │                             │
        INTELLIGENCE                   EXPERIENCE
              │                             │
      ┌───────┼────────┐             ┌──────┼──────┐
      │       │        │             │      │      │
   Reasoning Memory  Context       Visual  Voice  Notifications
      │       │        │
      └───────┼────────┘
              │
         ORCHESTRATION
              │
       ┌──────┼───────┐
       │      │       │
     Tools  Events  Policies
       │      │       │
       └──────┼───────┘
              │
       ┌──────┼──────────────┐
       ▼      ▼              ▼
      Mac   Mobile       External APIs
```

This is the destination.

The current implementation may contain only a small subset of this structure.

That is expected.

---

# 5. Current Development Philosophy

ByteHouse is intentionally being built incrementally.

The coding model is:

```text
Human
  ↓
defines outcome
  ↓
AI agent inspects
  ↓
AI agent proposes plan
  ↓
human reviews
  ↓
AI agent implements
  ↓
AI agent verifies
  ↓
AI agent self-reviews
  ↓
human reviews diff
  ↓
commit
  ↓
next milestone
```

Do not attempt:

```text
"Build all of ByteHouse."
```

A large uncontrolled coding session is explicitly contrary to the project's development philosophy.

---

# 6. Current Focus

The initial implementation focus is the **ByteHouse core loop**.

The first useful system is:

```text
Mac/Desktop client
        │
        ▼
Conversation UI
        │
        ▼
AI provider
        │
        ├──────────► Task capability
        │
        └──────────► Memory capability
                         │
                         ▼
                    Persistent DB
```

The first experience should demonstrate that ByteHouse can:

```text
talk
remember
recall
forget
create tasks
list tasks
complete tasks
persist state
```

Do not expand this into mobile, proactive automation, voice, plugins, or system-wide control unless the active roadmap explicitly reaches that phase.

---

# 7. Current Scope Does Not Define the Final Product

The current scope is intentionally small.

That does **not** mean future capabilities are forgotten.

The final direction includes future phases for:

```text
context
daily logging / journal
visual presence
voice
Mac system integration
mobile
sync
attendance
finance
watchlist/content
event bus
proactive assistant
pattern learning
automation
plugins/capabilities
AI-native system layer
```

These are future work, not current implementation requirements.

An agent should preserve clean interfaces so later systems can be added without rebuilding the core unnecessarily.

---

# 8. Full Roadmap Awareness

The roadmap in `ANALYSIS.md` is the canonical phase sequence.

Conceptually:

```text
Foundation
   ↓
ByteHouse Core
   ↓
Memory
   ↓
Context
   ↓
Tool System
   ↓
Tasks
   ↓
Daily Logging / Journal
   ↓
Visual Presence
   ↓
Voice
   ↓
Mac Integration
   ↓
Mobile
   ↓
Sync
   ↓
Attendance
   ↓
Finance
   ↓
Watchlist / Content
   ↓
Event Bus / Proactive Engine
   ↓
Personal Pattern Learning
   ↓
Advanced Proactive Assistant
   ↓
Automation
   ↓
Plugin / Capability System
   ↓
AI-Native System Layer
```

The active phase is always the only phase an agent is implementing.

The future phases are context, not permission to implement them early.

---

# 9. Hard Scope Rule

Build only the active milestone.

If a task appears to require a new subsystem that belongs to a future phase:

1. identify the dependency
2. explain it
3. do not silently build the future subsystem
4. check `DECISIONS.md`
5. ask the human when a product/architecture decision is genuinely required

Examples of future systems that should not be added early merely because they are interesting:

- mobile
- sync
- proactive engine
- event bus
- voice
- animation/presence
- calendar
- attendance
- finance
- browser tools
- messaging
- smart-home tools
- plugin system
- custom model training
- unrestricted computer control

---

# 10. Per-Milestone Workflow

Every meaningful milestone follows these steps separately.

## Step 1 — Inspect

Explain:

- relevant architecture
- relevant source files
- current behavior
- constraints
- dependencies

Do not modify code yet.

## Step 2 — Plan

Create a small implementation plan for the current milestone only.

Do not silently expand the scope.

## Step 3 — Implement

Implement only the agreed milestone.

Prefer existing abstractions over unnecessary new infrastructure.

## Step 4 — Verify

Run applicable:

```text
tests
type checking
lint
build
integration checks
```

Fix failures before calling the milestone complete.

## Step 5 — Self-review

Check for:

- scope creep
- architecture violations
- security issues
- unnecessary dependencies
- duplicated logic
- weak error handling
- accidental future subsystems
- documentation drift

## Step 6 — Update governance

When the milestone is complete:

```text
ARCHITECTURE.md → current reality
PROGRESS.md     → completion + next focus
DECISIONS.md    → only when a real decision was made
```

## Step 7 — Commit

Use a clear, small commit.

Examples:

```text
feat: add conversation persistence
feat: add explicit memory tool
feat: add task tool
test: add memory tool integration coverage
fix: handle failed model request
```

---

# 11. Tool Contract Rules

Tools are boundaries between the AI and the rest of the system.

Every tool should have:

```text
name
description
input schema
output schema
side effects
```

Long-term tools also require:

```text
permissions
risk classification
```

The model never directly manipulates application data.

The conceptual flow is:

```text
AI
 ↓
tool request
 ↓
schema validation
 ↓
policy / permission layer
 ↓
tool executor
 ↓
database / API / device
 ↓
result
 ↓
AI
```

This boundary must remain intact as the project grows.

---

# 12. Memory Rules

Memory is a core part of ByteHouse.

For the initial system:

> **Memory is explicit and user-visible.**

Do not silently turn an inference into permanent memory.

A stored memory should have a clear creation action.

The user must be able to:

```text
list memories
inspect memories
delete memories
```

Later phases may introduce observations and behavioral patterns, but those must remain distinguishable from explicit memories.

Do not collapse:

```text
explicit memory
historical event
observation
pattern
personal model
```

into one undifferentiated memory store.

---

# 13. AI Usage Rules

Use AI for:

```text
conversation
natural-language understanding
summarization
classification
contextual reasoning
planning
tool selection
semantic interpretation
```

Do not rely on an LLM alone for:

```text
permission enforcement
authorization
database integrity
security rules
financial calculations
attendance calculations
irreversible action checks
core data invariants
```

Where correctness is deterministic, use deterministic code.

---

# 14. Security Boundary

Never give an AI model unrestricted access to:

```text
shell
database
filesystem
credentials
network
```

Use explicit capabilities/tools instead.

As ByteHouse expands, maintain clear boundaries between:

```text
system instructions
trusted application state
user data
external/untrusted data
model output
```

The further ByteHouse expands into files, browsers, messaging, devices and external content, the more important this separation becomes.

---

# 15. Permission Philosophy

The long-term project includes a permission/risk model.

Conceptually:

```text
L0 — informational
L1 — reversible low-risk
L2 — user-state modification
L3 — external communication
L4 — irreversible / financial
```

The exact permission system belongs to the phase where real side-effecting tools are introduced.

Do not build a large permission subsystem solely for hypothetical future tools.

Do, however, preserve tool interfaces so permissions can later be inserted between:

```text
tool request
→
execution
```

---

# 16. Proactive AI Philosophy

Eventually ByteHouse will observe meaningful events and decide whether to:

```text
IGNORE
NOTIFY
ASK
ACT
```

The system should have a strong "do nothing" path.

Proactivity must optimize for:

```text
usefulness
urgency
confidence
timing
user permission
interruption cost
```

Do not implement proactive behavior in early phases simply because the final vision contains it.

---

# 17. Vibe-Coding Rules

### Prefer small, verifiable tasks

Bad:

```text
Build memory.
```

Better:

```text
Implement explicit memory creation and retrieval
for the current conversation flow.
```

### Never make broad requests without acceptance criteria

Bad:

```text
Improve ByteHouse.
```

Better:

```text
Add explicit memory retrieval to the existing conversation flow.
Do not add embeddings or inferred memory.
Add integration tests.
```

### Do not rewrite unrelated code

A clean small diff is preferable to a broad refactor.

### Do not add dependencies casually

If a new dependency is important, explain why before introducing it when the decision affects architecture.

### Keep the project recoverable

Small commits and phase-level checkpoints are mandatory.

---

# 18. When to Ask the Human

Stop and ask when uncertainty could materially change:

- product behavior
- scope
- architecture
- security
- data model
- external side effects
- dependency strategy
- a decision recorded in `DECISIONS.md`

Do not ask for trivial implementation preferences.

For low-impact details, make the smallest reasonable choice and report it.

---

# 19. Documentation Integrity

Do not leave documentation describing a system that no longer exists.

After a completed milestone:

```text
ARCHITECTURE.md = what the repo actually does
PROGRESS.md     = what actually happened
DECISIONS.md    = what was consciously decided
ANALYSIS.md     = the enduring project vision
```

If implementation reveals that the architecture must change, surface the discrepancy.

Do not silently rewrite the vision to make the implementation look correct.

---

# 20. Definition of Done

A milestone is complete only when:

```text
[ ] intended user journey works
[ ] tests pass / tests were added where needed
[ ] relevant verification passes
[ ] error cases are handled
[ ] architecture matches implementation
[ ] known limitations are documented
[ ] no unrelated future subsystem was added
[ ] progress is updated
[ ] changes are committed
```

A UI that renders is not enough.

Working code that fails the documented user journey is not done.

---

# 21. Final Reminder to the Agent

The long-term goal is a personal intelligence system.

The immediate job is to build the next reliable piece of that system.

Think:

```text
small implementation
        ↓
stable abstraction
        ↓
verified behavior
        ↓
next capability
```

not:

```text
huge prompt
        ↓
giant codebase
        ↓
uncontrolled AI system
```
## Stitch Visual Fidelity Rule

Stitch is the visual source of truth for ByteHouse.

Do not treat Stitch screenshots as inspiration or as a loose design reference.

When implementing a Stitch design:

1. Preserve the overall composition.
2. Preserve relative positioning and proportions.
3. Preserve spacing and visual hierarchy.
4. Preserve typography scale and weight.
5. Preserve colors and gradients.
6. Preserve borders, shadows, glow, blur, transparency and depth.
7. Recreate complex visual elements as layered components rather than
   simplifying them into generic CSS shapes.
8. Do not replace distinctive visual elements with generic UI patterns.
9. Do not add cards, panels, buttons, labels, or sections that are not
   represented by the source design unless required by functionality.
10. Do not consider the task complete merely because the UI is functional.

### Visual Verification Loop

After implementation:

1. Run the application.
2. Capture the rendered UI.
3. Compare it against the Stitch reference.
4. Identify the largest visual discrepancies.
5. Fix those discrepancies.
6. Repeat until the implementation closely matches the reference.

Prioritize discrepancies in this order:

1. Composition
2. Main visual/orb
3. Scale and positioning
4. Spacing
5. Typography
6. Colors
7. Lighting/glow
8. Borders and surfaces
9. Micro-interactions
10. Minor details

The agent must not declare a Stitch implementation complete without
performing visual verification.

The ByteHouse orb is a primary visual identity element.

Do not implement it as a simple gradient circle with a white dot.

It must be constructed as a layered visual system:

- spherical dark base
- translucent cyan/blue volume
- violet volume
- red/rose-pink translucent energy form
- green/cyan translucent energy form
- central white light source
- secondary reflected highlight
- internal bloom
- external atmospheric glow
- subtle spherical edge/refraction effect

The internal colored forms should have independent movement,
opacity, blur and rotation.

The white light should behave as a light source,
not as a flat white circle.

The result should visually resemble a luminous,
three-dimensional energy sphere rather than a CSS gradient orb.

**Build ByteHouse one controlled layer at a time.**
