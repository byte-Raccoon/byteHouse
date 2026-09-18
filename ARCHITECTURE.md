# ARCHITECTURE.md — ByteHouse Architecture

> **Canonical vision:** `ANALYSIS.md`
>
> This document translates that vision into an architecture that can be implemented incrementally.
>
> It describes both:
>
> 1. the architecture ByteHouse is growing toward, and
> 2. the currently active implementation boundary.
>
> It must never claim that a future subsystem exists before it has actually been built.

---

# 1. What ByteHouse Is

ByteHouse is a **personal AI operating layer**.

It is intended to become a persistent intelligence system that:

```text
remembers the user
understands context
uses tools
performs controlled actions
learns from repeated use
works across devices
and eventually becomes proactive
```

The final product should not feel like a collection of unrelated mini-apps.

Its capabilities should be connected through shared:

```text
memory
context
reasoning
tools
events
policies
```

---

# 2. Architecture Philosophy

ByteHouse grows from a small, stable core.

The long-term architecture is:

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

This is the target architecture, not a claim about current implementation.

---

# 3. Architecture Layers

## 3.1 Experience Layer

Interfaces through which the user interacts with ByteHouse.

Future surfaces include:

```text
Mac
Mobile
Voice
Visual presence
Notifications
```

The experience layer should consume capabilities from the core.

It should not create separate AI brains per device.

---

## 3.2 AI / Intelligence Layer

Responsible for:

```text
conversation
reasoning
planning
summarization
natural-language understanding
tool selection
response generation
```

The AI model is only one component of intelligence.

ByteHouse intelligence emerges from:

```text
LLM
+
memory
+
context
+
tools
+
events
+
feedback
```

---

## 3.3 Memory Layer

Memory should evolve in stages.

### Initial

```text
explicit user memory
```

### Later

```text
historical events
semantic knowledge
behavioral patterns
personal model
```

### Still later

```text
richer context relationships
```

The architecture should not pretend these later layers exist during early development.

---

## 3.4 Context Layer

The context engine turns raw application state into relevant context.

Long-term context can include:

```text
current time
recent conversation
tasks
deadlines
calendar
relevant memories
projects
goals
preferences
events
device context
location, when permitted
```

The core principle:

> Do not dump the entire database into the model.

Instead:

```text
request
  ↓
relevance selection
  ↓
context assembly
  ↓
reasoning model
```

---

## 3.5 Tool Layer

Tools expose capabilities to the AI.

Every tool should have:

```text
name
description
input schema
output schema
side effects
```

Future tools may additionally define:

```text
permission
risk level
```

Conceptual flow:

```text
AI
 ↓
tool request
 ↓
schema validation
 ↓
policy / permission
 ↓
executor
 ↓
system / DB / API
 ↓
result
```

The AI never directly manipulates internal application state.

---

## 3.6 Event Layer

Later versions will treat meaningful changes as events.

Examples:

```text
TASK_CREATED
TASK_COMPLETED
TASK_OVERDUE
MEMORY_ADDED
MEMORY_DELETED
CALENDAR_EVENT_STARTED
ATTENDANCE_RECORDED
FINANCE_TRANSACTION_ADDED
DEVICE_CONNECTED
```

These events eventually feed the proactive system.

The event layer is a future capability, not an assumption in the initial implementation.

---

## 3.7 Policy / Permission Layer

Eventually, side-effecting tools need explicit policy.

Long-term risk model:

```text
L0 — informational
L1 — reversible low-risk
L2 — user-state modification
L3 — external communication
L4 — irreversible / financial
```

Early low-risk tools can operate with simpler validation.

A full permission/risk engine belongs to the phase where meaningful external side effects are introduced.

---

# 4. Current Implementation Boundary

The initial ByteHouse implementation is intentionally small:

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

The first user journey is:

```text
open ByteHouse
    ↓
talk to ByteHouse
    ↓
remember something explicitly
    ↓
retrieve it later
    ↓
create a task using natural language
    ↓
list tasks
    ↓
complete a task
    ↓
restart application
    ↓
conversation/data persists
```

This is the foundation that later versions build on.

---

# 5. Initial Domain Models

The first implementation needs only a small set of core data concepts.

## Conversation

```text
id
created_at
updated_at
```

## Message

```text
id
conversation_id
role
content
created_at
```

## Memory

```text
id
content
created_at
source
user_confirmed
```

## Task

```text
id
title
description
status
priority
created_at
due_at
completed_at
```

## Tool execution

A trace of an AI-requested tool operation.

Conceptually:

```text
id
tool_name
input
output
status
created_at
```

The exact implementation can evolve with the chosen stack.

---

# 6. Initial Tool Set

## Task capability

```text
create_task(title, due_at?, priority?)
list_tasks(filter?)
complete_task(task_id)
```

Future task capabilities may include:

```text
update
delete
prioritize
group
search
```

These additions should happen when their phase is active.

---

## Memory capability

```text
remember(content)
recall(query?)
forget(memory_id)
```

Memory remains explicit and user-visible.

Do not silently store model inferences as memories during early development.

---

# 7. Conversation Flow

The core interaction should evolve toward:

```text
User
 ↓
Conversation UI
 ↓
Conversation service
 ↓
Context assembly
 ↓
AI provider
 ↓
Response or tool request
```

When a tool is requested:

```text
AI tool request
 ↓
tool validator
 ↓
tool executor
 ↓
persistent state
 ↓
tool result
 ↓
AI
 ↓
final response
```

When no tool is needed:

```text
AI
 ↓
response
 ↓
conversation persistence
 ↓
UI
```

---

# 8. Provider Architecture

The project should avoid designing all application logic around one model provider.

Conceptually:

```text
AIProvider
├── generate()
├── stream()
├── embed()
└── tool_call()
```

The initial implementation may only use the methods needed now.

The abstraction exists so later experimentation does not force a rewrite of the entire application.

---

# 9. Context Architecture

The long-term `CurrentContext` can contain:

```text
user
now
recent_messages
relevant_memories
active_tasks
upcoming_events
preferences
device_context
```

The initial version should keep this intentionally small.

Context evolves alongside the product.

Do not implement:

```text
embeddings
knowledge graph
behavioral model
full personal model
```

until the corresponding phase requires them.

---

# 10. Memory Architecture

Long-term ByteHouse memory can be understood as:

```text
                 PERSONAL MEMORY
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     EXPLICIT       EPISODIC       SEMANTIC
     MEMORY         HISTORY         KNOWLEDGE
        │              │              │
        └──────────────┼──────────────┘
                       │
                   USER MODEL
                       │
                  CONTEXT BUILDER
```

But implementation proceeds incrementally.

Start with:

```text
explicit memory
```

Later add:

```text
historical events
behavior patterns
personal model
richer relationships
```

Memory should have a lifecycle rather than become an infinite text dump.

Possible later states:

```text
temporary
active
archived
expired
deleted
```

---

# 11. Personal Context Graph — Future Architecture

Long-term relationships may look like:

```text
                 USER
                  │
        ┌─────────┼──────────┐
        ↓         ↓          ↓
      GOALS     PROJECTS    PEOPLE
        │         │          │
        ↓         ↓          ↓
      TASKS     EVENTS    RELATIONSHIPS
        │         │
        ↓         ↓
    DEADLINES   CALENDAR
                   │
                   ↓
                 PLACES
                   │
                   ↓
                ROUTINES
```

Do not start by building a graph database.

Begin with straightforward domain models and introduce richer traversal only when a real use case requires it.

---

# 12. Device Architecture

The long-term device model is:

```text
                     BYTEHOUSE CORE
                           │
               ┌───────────┴───────────┐
               │                       │
             MAC                    MOBILE
               │                       │
        deep interaction         quick interaction
        keyboard/mouse           voice/camera
        files                    notifications
        development              mobile context
```

Mac and mobile are clients of shared intelligence.

They should not develop independent copies of the AI logic.

---

# 13. Mac Architecture — Future

Mac is intended to become the deep-work surface.

Potential capabilities:

```text
main ByteHouse interface
large conversation UI
task management
file interaction
browser assistance
development workflows
notifications
system events
background services
visual presence
voice
```

System integrations should always be exposed through controlled capabilities/tools.

Never give an LLM unrestricted shell or system access.

---

# 14. Mobile Architecture — Future

Mobile is intended to emphasize immediacy.

Potential capabilities:

```text
quick interaction
voice
quick logging
camera
notifications
location context
quick tasks
daily check-in
mobile timeline
```

Mobile should not simply duplicate every desktop surface.

---

# 15. Presence / Character Architecture — Future

The interface can eventually respond to core state:

```text
IDLE
LISTENING
THINKING
WORKING
WAITING
SUCCESS
WARNING
ERROR
SPEAKING
SLEEPING
```

The visual layer should consume state from the core.

Example:

```text
CORE_STATE = THINKING
        ↓
UI animation = THINKING
```

Business logic must not be duplicated inside visual effects.

Mental model:

```text
Model       = brain
Memory      = long-term knowledge
Context     = awareness
Tools       = hands
Permissions = boundaries
UI          = body
Voice       = expression
Events      = senses
```

---

# 16. Event Architecture — Future

Eventually:

```text
event
 ↓
context update
 ↓
possible trigger
 ↓
decision
 ↓
action
```

The system must support "no action" as a valid outcome.

This architecture enables the proactive assistant without requiring every future feature to implement its own notification logic.

---

# 17. Proactive Architecture — Future

The proactive engine will eventually evaluate:

```text
usefulness
urgency
confidence
permission
timing
interruption cost
whether the user already handled it
```

Then choose:

```text
IGNORE
NOTIFY
ASK
ACT
```

The default should not be constant interruption.

---

# 18. Domain Architecture — Future

Future capabilities are domain modules connected to the shared ByteHouse core.

### Productivity

```text
Tasks
Journal
Calendar
Goals
```

### Personal domains

```text
Attendance
Finance
Watchlist / Content
```

### System capabilities

```text
Files
Browser
Notifications
Messaging
Device control
```

Each domain should own its deterministic business rules.

AI provides natural-language interaction and reasoning around those rules.

---

# 19. Finance Architecture — Future

Finance should initially be informational.

Potential capabilities:

```text
manual transaction entry
categories
monthly summaries
budgets
spending trends
```

Calculations should be deterministic.

Autonomous spending is outside the safe default model; financial actions require explicit confirmation.

---

# 20. Attendance Architecture — Future

Potential entities:

```text
course
class
schedule
location
attendance event
attendance percentage
```

Attendance policy calculations should be deterministic where possible.

The AI interprets and explains the results instead of being the source of mathematical truth.

---

# 21. Automation Architecture — Future

Controlled automation will eventually be modeled as:

```text
TRIGGER
  ↓
CONDITIONS
  ↓
ACTIONS
```

Examples:

```text
When X happens → do Y
Every weekday → perform Z
When project reaches state → create task
```

Automations must be inspectable and disableable.

---

# 22. Plugin / Capability Architecture — Future

A future capability can expose:

```text
manifest
name
version
permissions
tools
events
UI components
settings
```

The goal is to make ByteHouse extensible without turning the core into an unmaintainable monolith.

Plugin architecture belongs near the platform stage, not the initial implementation.

---

# 23. AI-Native System Layer — Final Direction

The farthest architectural phase is an AI-native system layer.

Potential capabilities:

```text
system-wide assistant
global command interface
app awareness
cross-app context
unified notifications
system actions
AI-driven workflows
```

This is the final direction of the project, not the initial implementation target.

It should only be attempted after the ByteHouse core is stable.

---

# 24. Data Architecture Progression

## Early

```text
local relational storage
```

Core data:

```text
conversations
messages
memories
tasks
tool traces
```

## Middle

Potential additions:

```text
embeddings
semantic retrieval
event streams
audit logs
sync metadata
```

## Later

Only when justified:

```text
knowledge graph
advanced vector infrastructure
distributed event processing
local model hosting
```

Do not introduce complex infrastructure just because it appears in the final architecture.

---

# 25. Repository Architecture

The long-term repository may grow toward:

```text
bytehouse/
│
├── apps/
│   ├── mac/
│   ├── mobile/
│   └── web/
│
├── packages/
│   ├── core/
│   ├── ai/
│   ├── memory/
│   ├── context/
│   ├── tools/
│   ├── events/
│   ├── permissions/
│   ├── sync/
│   ├── ui/
│   └── shared/
│
├── server/
│   ├── api/
│   ├── domain/
│   ├── services/
│   ├── workers/
│   └── infrastructure/
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── docs/
├── scripts/
├── tests/
├── .env.example
├── README.md
├── ANALYSIS.md
├── ARCHITECTURE.md
├── DECISIONS.md
├── PROGRESS.md
└── AGENTS.md
```

This is a **long-term shape**.

Do not create every directory before the code needs it.

---

# 26. Observability

AI systems are difficult to debug without useful traces.

Long-term observability should record safe metadata such as:

```text
request ID
conversation ID
tool chosen
tool result
latency
error
permission decision
model/provider
```

Avoid logging sensitive personal content unnecessarily.

The system should eventually help answer:

```text
Why did ByteHouse do that?
Why did it choose that tool?
Why did it answer that?
Why did it fail?
```

---

# 27. Testing Architecture

## Unit tests

Examples:

```text
task logic
memory logic
tool validation
context selection
permission rules
risk classification
```

## Integration tests

Examples:

```text
conversation → memory
conversation → task tool
tool → database
event → proactive engine
```

## End-to-end tests

Examples:

```text
remember something
→ restart
→ recall it
```

and:

```text
create task
→ task stored
→ task appears in UI
→ complete task
```

## AI behavior evaluations

As AI tool use grows, also test:

```text
correct tool selection
correct arguments
no unauthorized memory writes
correct interpretation of tool results
failure recovery
```

The exact evaluation harness can evolve with the implementation.

---

# 28. Architecture Rule

Keep the core boring.

Prefer:

```text
clear modules
explicit interfaces
typed contracts
small services
deterministic business logic
good tests
simple data models
observable actions
```

The "magic" should live in the experience, context, and orchestration — not in opaque architecture.

---

# 29. Version / Phase Growth Model

The project should be understood as a sequence of capability eras.

The exact phase definitions remain those in `ANALYSIS.md`.

A useful version grouping is:

```text
FOUNDATION
  Core conversation + persistence + explicit memory + tasks

INTELLIGENCE
  Context + richer retrieval + daily understanding

EXPERIENCE
  Presence + voice + interaction polish

DEVICE
  Mac integration + mobile + sync

DOMAIN
  Attendance + finance + watchlist/content + broader personal modules

PROACTIVE
  Events + proactive decisions + pattern learning

AUTOMATION
  Controlled workflows

PLATFORM
  Plugins/capabilities

SYSTEM
  AI-native system layer
```

These labels are organizing groups for implementation tracking. They do not replace the canonical phases in `ANALYSIS.md`.

---

# 30. Final Architectural Principle

ByteHouse should grow like this:

```text
reliable core
    ↓
memory
    ↓
context
    ↓
tools
    ↓
devices
    ↓
events
    ↓
proactivity
    ↓
automation
    ↓
platform
    ↓
AI-native system
```

Do not build the fantasy first.

Build the infrastructure that makes the fantasy possible.
