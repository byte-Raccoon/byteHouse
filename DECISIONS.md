# DECISIONS.md — ByteHouse Decision Log

> **Canonical product truth:** `ANALYSIS.md`
>
> This file is an append-only record of implementation and architecture decisions derived from that vision.
>
> Never silently change an active decision. If a decision changes, append a new entry that supersedes the previous one.

---

# How to Use This File

Every decision should contain:

```text
Decision:
Reason:
Alternatives considered:
Date:
Status:
```

Possible status values:

```text
active
superseded by [N]
```

`ANALYSIS.md` defines the final project direction.

This file defines how that direction is being implemented at a given point in time.

---

# [1] ANALYSIS.md is the Single Source of Truth

**Decision:** `ANALYSIS.md` is the canonical source for ByteHouse's complete product vision and long-term development plan.

**Reason:** The project is intentionally much larger than the current implementation. Agents need a stable description of the destination without treating every future feature as current scope.

**Alternatives considered:** Treat each governance document as an independent specification — rejected because it creates contradictory definitions of the product.

**Date:** 2026-09-18

**Status:** active

---

# [2] Current Docs Are Derived Execution Layers

**Decision:** `ARCHITECTURE.md`, `DECISIONS.md`, and `PROGRESS.md` are execution/governance layers derived from `ANALYSIS.md`.

**Reason:** The vision should remain stable while implementation state changes frequently.

**Alternatives considered:** Copy the complete vision into every document — rejected because duplicated truth drifts.

**Date:** 2026-09-18

**Status:** active

---

# [3] Build the Full Vision Incrementally

**Decision:** ByteHouse is developed phase-by-phase rather than as one giant implementation.

**Reason:** The full system includes intelligence, memory, context, tools, devices, events, proactivity, automation, extensibility and eventually an AI-native system layer. Building all of it together would create an uncontrolled project.

**Alternatives considered:** Build the entire assistant in one coding session — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [4] Initial Focus Is the Core Loop

**Decision:** The first implementation focuses on a Mac/Desktop client with conversation, one AI provider, task capability, memory capability and persistent storage.

**Reason:** The first goal is to prove the central ByteHouse interaction loop before expanding to additional devices and domains.

**Alternatives considered:** Build mobile and Mac together — rejected for the initial focus because it multiplies surface area before the core works.

**Date:** 2026-09-18

**Status:** active

---

# [5] ByteHouse Is More Than a Chatbot

**Decision:** ByteHouse architecture must treat conversation as one interface to shared intelligence rather than the whole product.

**Reason:** The product's long-term value comes from the combination of memory, context, tools, actions, events and device presence.

**Alternatives considered:** Build a chatbot-first product with disconnected feature screens — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [6] Memory Is Explicit and User-Visible

**Decision:** Early ByteHouse memory is explicit. The system must not silently convert an inference into permanent memory.

**Reason:** Trust, transparency and debuggability.

**Alternatives considered:** Automatically store all inferred information — rejected for the early system.

**Date:** 2026-09-18

**Status:** active

---

# [7] Memory and Observation Are Separate Concepts

**Decision:** As later learning features appear, explicit memories, historical events, observations, patterns and personal-model information must remain conceptually distinguishable.

**Reason:** These categories have different confidence, trust and lifecycle characteristics.

**Alternatives considered:** One undifferentiated memory store — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [8] Tools Are the Action Boundary

**Decision:** The model never directly manipulates the application's database or system state. All actions go through explicit tools/capabilities.

**Reason:** Tools provide schema validation, controlled side effects, observability and a future insertion point for policy and permissions.

**Alternatives considered:** Give the model direct database/system access — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [9] Tool Interfaces Must Be Explicit

**Decision:** A tool exposes a name, description, input schema, output schema and side effects.

**Reason:** AI-generated actions must remain inspectable and testable.

**Alternatives considered:** Let the model invent arbitrary function calls — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [10] Permission and Risk Controls Grow With Real Capabilities

**Decision:** A full permission/risk-tier engine is introduced when ByteHouse gains meaningful side-effecting tools.

**Reason:** Risk controls should be designed against actual capabilities instead of hypothetical ones.

**Alternatives considered:** Build the entire permission hierarchy before any real side-effecting capability exists — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [11] Deterministic Rules Stay Outside the LLM

**Decision:** Calculations, authorization, permission checks, database integrity and other correctness-critical rules must be deterministic.

**Reason:** An LLM is useful for interpretation and reasoning but should not be the source of mathematical or security truth.

**Alternatives considered:** Let the model perform all domain logic — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [12] Personalization Comes From Memory + Context + Tools

**Decision:** ByteHouse does not initially depend on custom model training or fine-tuning for personalization.

**Reason:** The project's early personalization needs can be served by persistent memory, context construction, tool use and retrieval layered over a base model.

**Alternatives considered:** Train/fine-tune a custom foundation model early — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [13] Provider Logic Must Be Abstractable

**Decision:** Core product logic should not be inseparably coupled to one AI provider.

**Reason:** Later provider changes, experimentation, cost control, fallbacks and local-model experiments should not require rewriting ByteHouse.

**Alternatives considered:** Put provider-specific calls throughout the application — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [14] Context Is a First-Class System

**Decision:** ByteHouse must eventually construct a compact, relevant context rather than passing the entire data store into every model call.

**Reason:** Personal intelligence depends on relevance, not maximum data volume.

**Alternatives considered:** Give the model raw access to all stored data for every request — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [15] Cross-Device Intelligence Is Shared

**Decision:** Mac and mobile are clients of shared ByteHouse intelligence rather than separate assistant implementations.

**Reason:** The final product is intended to feel like one persistent assistant across devices.

**Alternatives considered:** Build independent Mac and mobile AI systems — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [16] Mobile Is a Later Surface, Not an Initial Constraint

**Decision:** Mobile is part of the final architecture but is not required for the initial core loop.

**Reason:** The project needs to prove the intelligence core before multiplying client surface area.

**Alternatives considered:** Develop mobile and Mac simultaneously from the beginning — rejected for the initial stage.

**Date:** 2026-09-18

**Status:** active

---

# [17] Presence Is a Core Experience, Not the Initial Core

**Decision:** Visual presence, animation and voice are first-class future parts of ByteHouse but are added after the underlying intelligence works.

**Reason:** Presence should reinforce actual intelligence rather than hide the lack of it.

**Alternatives considered:** Build the sci-fi interface first — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [18] Proactivity Must Include Silence

**Decision:** The future proactive engine must be able to choose IGNORE, NOTIFY, ASK or ACT.

**Reason:** An assistant that interrupts constantly increases cognitive load rather than reducing it.

**Alternatives considered:** Notify the user about every detected event — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [19] Pattern Learning Should Precede Automation Carefully

**Decision:** Behavior patterns should initially be observed and surfaced as insights before they become automatic actions.

**Reason:** Prevent confident but incorrect assumptions from turning into automation.

**Alternatives considered:** Detect a pattern and immediately automate from it — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [20] The Personal Context Graph Is a Future Capability

**Decision:** Relationships between users, goals, projects, tasks, deadlines, events, places and routines are part of the long-term vision, but a graph database is not required at the beginning.

**Reason:** The relationships are valuable; premature graph infrastructure is not.

**Alternatives considered:** Start with a graph database — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [21] Event-Driven Architecture Is a Future Expansion

**Decision:** Meaningful system events should eventually become first-class objects that can feed proactive behavior.

**Reason:** Event-driven design supports cross-domain context and future automation.

**Alternatives considered:** Let every future feature implement its own isolated notification/trigger logic — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [22] Automation Must Be Inspectable and Disableable

**Decision:** Future automations are represented as:

```text
TRIGGER
  ↓
CONDITIONS
  ↓
ACTIONS
```

and users must be able to inspect and disable them.

**Reason:** Powerful automation requires user control.

**Alternatives considered:** Hide autonomous workflows behind the AI — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [23] Plugins Are a Platform-Level Capability

**Decision:** Third-party/plugin capability architecture belongs after the core intelligence and major device/domain layers are stable.

**Reason:** Extensibility is valuable, but introducing it too early would multiply the complexity of the core.

**Alternatives considered:** Build a plugin marketplace/framework first — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [24] AI-Native System Layer Is the Final Direction

**Decision:** The eventual system-wide AI layer is a long-term destination, not an early implementation constraint.

**Reason:** It depends on a stable core, tools, memory, context, devices, policies and automation.

**Alternatives considered:** Start by modifying the operating-system experience before the core exists — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [25] Keep the Core Boring

**Decision:** Core infrastructure should prefer clear modules, explicit interfaces, typed contracts, deterministic logic, simple data models and strong tests.

**Reason:** The product already contains enough complexity at the experience level. The foundation should remain understandable and debuggable.

**Alternatives considered:** Use highly distributed or abstract infrastructure from the beginning — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [26] Small, Verifiable Vibe-Coding Steps

**Decision:** AI coding work proceeds through inspect → plan → implement → verify → self-review → documentation → commit.

**Reason:** This is the project's primary mechanism for controlling AI-generated code.

**Alternatives considered:** Large one-shot implementation prompts — rejected.

**Date:** 2026-09-18

**Status:** active

---

# [27] Documentation Is Part of the Architecture

**Decision:** Governance files are maintained as part of the build, not as optional commentary.

**Reason:** Long-running AI coding needs persistent project memory outside the model context.

**Alternatives considered:** Rely on the coding agent's conversational history — rejected.

**Date:** 2026-09-18

**Status:** active

---

# Append-Only Rule

New decisions go below this line.

Do not delete old decisions.

If an old choice changes, append:

```text
# [N] <new decision>

Decision:
Reason:
Alternatives considered:
Date:
Status: active

Supersedes: [old decision number]
```

---

# [28] Technology Stack for Stage 0 Core Loop

**Decision:** The Stage 0 Core Loop is implemented using TypeScript (Node.js 24), SQLite (`better-sqlite3`), and a compact Electron Companion HUD with native macOS menu bar tray integration and global hotkeys (`Option+Space`). Pluggable AI Provider architecture supports Gemini API and offline deterministic Mock providers.

**Reason:** Aligns with the modular package blueprint in `ARCHITECTURE.md`, leverages the existing Node 24 toolchain, achieves the Siri/Friday-style always-present companion experience, and enables fast, deterministic automated testing.

**Alternatives considered:** Native Swift/macOS SwiftUI app (strong native performance, but slower for multi-package TypeScript sharing and web-based animation iteration); Python FastAPI backend (dual-runtime complexity).

**Date:** 2026-09-18

**Status:** superseded by [29]

---

# [29] Native Swift WebKit Host + React UI Architecture

**Decision:** ByteHouse adopts a Native WebKit Shell architecture: **Swift** (Swift 6.1.2) as the native macOS desktop companion host, system integration layer, and core engine (AppKit `NSPanel`, `NSStatusItem` menu bar tray, global hotkeys `Control+Option+Space`, native `libsqlite3` persistence), and **React** (React 19 + Vite) as the companion HUD interface running in an embedded `WKWebView` via two-way `WKScriptMessageHandler` communication.

**Reason:** Eliminates Electron and bundled Chromium overhead completely, lowering idle RAM from ~200MB to ~35MB and binary size to ~5MB. Provides 100% native macOS floating window behavior (`.nonactivatingPanel` that floats over all desktop spaces and full-screen apps) while preserving modern React component development, state management, and rapid styling.

**Alternatives considered:** Electron + TypeScript (heavier resource footprint, slower startup); Pure SwiftUI (harder web animation sharing and cross-device React components).

**Date:** 2026-09-18

**Status:** active

---

# [30] Versioned SQLite Migrations, .env Configuration, and Structured Logging

**Decision:** ByteHouse adopts SQLite native `PRAGMA user_version` for atomic, transaction-wrapped database migrations (`MigrationRunner`), custom `.env` loader with typed `AppConfig` avoiding third-party dependencies, and an asynchronous leveled `AppLogger` with automatic secret redacting writing to `~/Library/Logs/ByteHouse/bytehouse.log`.

**Reason:** Preserves existing user database integrity through automatic schema version tracking and performance indexing without corrupting SQLite state across updates. Protects sensitive API credentials from ever being printed or written to persistent logs.

**Alternatives considered:** Third-party migration tools (unnecessary dependency bloat); Unversioned `CREATE TABLE IF NOT EXISTS` string execution (cannot handle future column alterations or schema evolutions safely).

**Date:** 2026-09-18

**Status:** active

---

# [31] Multi-Provider Live AI Architecture with Native Tool Calling & Offline Fallback

**Decision:** ByteHouse implements a multi-provider AI architecture supporting live Google Gemini models (`gemini-2.0-flash` via `GeminiAIProvider`) and OpenAI-compatible endpoints (`OpenAIProvider` for GPT-4o, Ollama, Groq) with native function/tool calling schemas. Provider selection is managed by `AIProviderFactory` driven by `.env` / environment variables, with graceful automatic fallback to `MockAIProvider` when offline or when no API keys are present.

**Reason:** Unlocks true generative reasoning, natural language comprehension, and autonomous tool invocation for user memory and tasks while guaranteeing that tests and offline environments run reliably with zero configuration.

**Alternatives considered:** Direct SDK dependencies (GoogleGenerativeAI, OpenAI-Swift); single-vendor lock-in. Native URLSession-based REST integration keeps binary size minimal and eliminates third-party supply chain vulnerabilities.

**Date:** 2026-09-18

**Status:** active

---

# [32] Real-Time Token Streaming Over Native WebKit Bridge

**Decision:** ByteHouse implements real-time Server-Sent Events (SSE) token streaming using native `URLSession.bytes(for:)` across all supported AI providers (`GeminiAIProvider` with `:streamGenerateContent?alt=sse`, `OpenAIProvider` with `"stream": true` supporting Grok/Groq with `openai/gpt-oss-120b` and OpenAI, and `MockAIProvider` with asynchronous token simulation). Stream deltas are passed through `ConversationService.chatStream` and dispatched across the native WebKit bridge to the React 19 companion HUD with live cursor animations and auto-scrolling.

**Reason:** Greatly improves conversational interactivity and perceived responsiveness (zero wait time before text begins appearing) while preserving deterministic tool execution boundaries and multi-turn reasoning loops.

**Alternatives considered:** WebSockets (unnecessary connection overhead for local IPC); Polling or buffering entire responses (poor perceived latency).

**Date:** 2026-09-18

---

# [33] Window-Based Spotlight HUD & OrbAnimationGen UI/UX

**Decision:** ByteHouse adopts a centered macOS Spotlight-style command window (840x620px, optical top-center positioning) featuring the full pure-CSS **ByteHouse Neural Presence Orb** from Stitch project `OrbAnimationGen` (`projects/2119614306656510916`), complete with 3 concentric acoustic soundwave halos, breathing outer chromatic glow, dynamic energy ribbon, pendulum light dynamics, and live audio amplitude spectrum bars. The companion interface provides macOS traffic lights, quick state toggles (`IDLE`, `LISTENING`, `THINKING`), omnibar input with glowing sparkle slot and return keycaps, interactive suggestion cards, and rich Bento-styled tool execution feedback.

**Reason:** Aligns ByteHouse with native macOS Spotlight/Raycast UX conventions, provides high visual presence and immediate feedback on model state transitions, and creates a unified command center experience that stays fast, lightweight, and 60 FPS GPU-accelerated.

**Alternatives considered:** Fixed right-side menu bar dropdown (too cramped for multi-card inspection and full presence animation); separate detached inspector windows.

**Date:** 2026-09-20

**Status:** active

---

# [34] Dynamic Multi-Intelligence Provider Switching ('Bytie' Spirit of ByteHouse) & HUD Window Maximize

**Decision:** ByteHouse adopts runtime intelligence switching accessible directly from the companion interface footer, allowing the user to seamlessly switch between **Bytie** (the homegrown local spirit of ByteHouse), Google Gemini, Grok OSS (Groq), and OpenAI. The active provider is managed dynamically in `ConversationService` using thread-safe synchronization (`NSLock`) and exposed through the WebKit IPC bridge. Additionally, double-clicking non-interactive areas of the companion window toggles between the default Spotlight size (`840x620` optical top-center) and full-screen maximization (`screen.visibleFrame`).

**Reason:** Gives the user total transparency over "who am I talking to", provides zero-friction offline operation via Bytie, and allows fluid adaptation between compact HUD interaction and expanded full-screen workspaces.

**Alternatives considered:** Requiring application restart or `.env` edits to change AI providers (cumbersome and poor UX); separate settings modal (interrupts flow compared to in-situ pill selector).

**Date:** 2026-09-20

**Status:** active

---

# [35] Complete Bytie 3D Specification Architecture via Three.js & Custom GLSL Shaders

**Decision:** ByteHouse implements **Bytie** as a real-time, living 3D procedural energy presence using direct Three.js (`^0.186.0`) and custom GLSL vertex/fragment shaders, completely replacing the initial 2D CSS orb in accordance with `BYTIE_3D_SPEC.md` and Stitch visual fidelity guidelines.

Key architectural characteristics:
- **Procedural 3D Energy Body:** 64-segment sphere with multi-octave 3D Simplex noise displacement vertex deformation and layered volumetric chromatic fragment shaders (cyan, electric blue, violet, magenta, and subtle emerald accents) with dynamic Fresnel rim translucency.
- **Conscious Binary Byte Eye:** A volumetric internal white light source acting as Bytie's eye, derived from a byte (`1` = bright awake luminous white, `0` = dark slit pupil blink). Supports organic saccadic gaze tracking towards mouse cursor coordinates across the window, and tilts downward toward the prompt bar when the input is focused.
- **Spirit Ribbons & Plasma Fins:** 4 flowing ribbons (dorsal, lateral-left, lateral-right, caudal-tail) with parametric wave propagation, harmonic frequencies, and independent phase kinematics.
- **Atmospheric Particle Cloud & Orbital Filament:** 68 drifting spirit motes with Gaussian bloom and radial boundary fading, alongside an elliptical orbital filament.
- **Semantic State Reactivity:** Continuous delta-time parameter interpolation between `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, and `ALERT` states without triggering React re-renders.
- **Performance & Lifecycle Safety:** 60 FPS requestAnimationFrame loop inside `BytieScene.js`, complete WebGL resource disposal on unmount, and native reduced-motion accessibility support.

**Reason:** Fulfills the canonical vision of a living digital spirit with volumetric depth, genuine procedural energy, and expressive presence that reacts seamlessly to system states, user gaze, and active task sidebars.

**Alternatives considered:** 2D CSS radial gradients (lacked volumetric depth, organic deformation, and true 3D spatial presence); React Three Fiber (introduced unnecessary peer-dependency overhead and React 19 incompatibilities).

**Date:** 2026-09-20

**Status:** active

---

# [36] Bytie Visual Transformation to Celestial Spirit Creature Anatomy

**Decision:** ByteHouse transforms Bytie's 3D anatomical model and shader pipelines to faithfully match the canonical user-provided spirit reference (`bytie_target_spirit.jpg`), following the Stitch Visual Fidelity Rule.

Key architectural and visual components:
- **Celestial Liquid-Glass Head:** Sapphire and electric cyan upper dome, deep midnight violet core, radiant magenta lower rim, subtle emerald caustic glint on the upper-right edge, and a tight, glossy specular highlight on the upper-left crown.
- **Expressive Solid Glowing Crescent Eyes (`⌒   ⌒`):** Two large, joyful glowing white smiling crescent eyes with parabolic top/bottom curves, tapered corners, soft Gaussian bloom, cursor gaze tracking, and natural binary blinking.
- **Buoyant Sea-Angel / Fairy Wing-Fins:** Translucent petal wings with smoothly rounded dome tips (broad fan with circular dome curvature, eliminating sharp triangular spikes), secondary lower flare, cyan-to-hot-pink gradient, and buoyant kinematics.
- **Voluminous 3D Helical Silk Tail:** Dual-ribbon architecture (`mainTailMesh` + `veilTailMesh`) starting neatly tucked beneath the lower sphere rim, expanding from a slender neck into a wide billowing silk sheet with 3D helical twist along Catmull-Rom splines, tapering into a delicate spiraling tip.
- **Jewel-Tone ACES Tonemapping Protection:** Saturated color blending without excessive additive multiplier stacking, preventing ACES tonemapping from washing out the deep violet, hot magenta, and electric cyan into flat white.
- **Floating Petal Sparks & Orbital Filament:** Five floating luminous curved petals drifting and tumbling around the spirit alongside an elliptical neon orbital ring and orbiting tracer bead.

**Reason:** Delivers the exact visual identity, charm, and organic living presence requested by the user, elevating Bytie from an abstract energy sphere into an adorable, expressive, living intelligence companion.

**Alternatives considered:** Procedural particle sprite approximation; flat 2D SVG animations; generic cartoon eyes.

**Date:** 2026-09-20

**Status:** active

