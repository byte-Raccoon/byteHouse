# BYTIE — 3D Spirit Presence Specification

## Status

**Project:** ByteHouse  
**Feature:** Bytie — the living 3D spirit presence of ByteHouse  
**Rendering:** Three.js + WebGL  
**Primary environment:** React frontend on macOS  
**Backend changes:** None required for this feature

------------------------------------------------------------------------

## 1. Core Concept

Bytie is the visual spirit/entity of ByteHouse.

ByteHouse is the system/home. Bytie is the presence that lives inside
it.

The goal is **not** to create a normal animated orb, a spinning 3D
sphere, or a decorative mascot. The goal is to create a **living digital
spirit** whose appearance and movement communicate state.

Bytie should feel:

- alive
- intelligent
- calm
- mysterious
- digital
- ethereal
- responsive
- premium
- futuristic without becoming generic cyberpunk UI

Avoid:

- generic chatbot avatars
- cartoon animals
- simple gradient circles
- loading spinners
- generic glowing AI orbs
- humanoid robots
- excessive neon/gaming aesthetics

------------------------------------------------------------------------

## 2. Visual Source of Truth

The existing ByteHouse/Stitch visual direction remains the source of
truth for overall composition.

The supplied Bytie concept image is a **visual reference for the
creature**, not a texture that should simply be displayed.

Recreate the visual language procedurally with Three.js/WebGL.

Important characteristics:

- spherical translucent energy body
- cyan / blue / violet / magenta / pink / green energy
- soft white internal light
- translucent flowing spirit structures
- curved ribbon-like energy forms
- subtle particles
- soft bloom
- glass-like depth
- volumetric feeling
- asymmetric organic motion
- subtle floating movement

Do not simply place the reference PNG inside the application.

------------------------------------------------------------------------

## 3. Technical Direction

Use:

- Three.js
- WebGL
- the existing React integration
- GLSL shaders where they materially improve the effect
- controlled post-processing/bloom

If React Three Fiber already exists, use the existing setup rather than
creating a second rendering architecture.

Before installing anything:

1.  Inspect `package.json`.
2.  Inspect the current frontend architecture.
3.  Check whether Three.js/R3F already exists.
4.  Reuse existing dependencies where possible.
5.  Add only necessary dependencies.

Do not modify the backend for this feature.

------------------------------------------------------------------------

## 4. Architecture

Keep Bytie isolated as a visual/presence subsystem.

Recommended structure:

``` text
client/src/
└── presence/
    └── bytie/
        ├── Bytie.jsx
        ├── BytieScene.jsx
        ├── BytieRenderer.jsx
        ├── BytieBody.jsx
        ├── BytieEnergy.jsx
        ├── BytieRibbons.jsx
        ├── BytieParticles.jsx
        ├── BytieLighting.jsx
        ├── BytiePostProcessing.jsx
        ├── bytieStates.js
        ├── bytieConfig.js
        ├── shaders/
        │   ├── body.vert
        │   ├── body.frag
        │   ├── energy.vert
        │   └── energy.frag
        └── hooks/
            └── useBytieState.js
```

Adapt this to the existing project instead of blindly creating duplicate
directories.

The rest of ByteHouse should interact with Bytie through a small API
such as:

``` jsx
<Bytie state="idle" />
```

or:

``` js
setBytieState("thinking");
```

The AI/core layer must not know how Three.js works.

------------------------------------------------------------------------

## 5. Rendering Boundary

Keep this separation:

``` text
ByteHouse Core
      │
      │ semantic state
      ▼
Bytie Controller
      │
      ▼
Three.js Renderer
      │
      ├── Body
      ├── Energy
      ├── Ribbons
      ├── Particles
      ├── Lighting
      └── Post Processing
```

The core provides semantic state.

The renderer converts semantic state into visual behavior.

Example:

``` text
CORE: thinking

↓

BYTIE:
increase energy activity
increase internal flow
slightly increase brightness
increase particle movement
change ribbon motion
```

Do not put AI/business logic inside the renderer.

------------------------------------------------------------------------

## 6. States

Implement:

``` js
export const BYTIE_STATES = {
  IDLE: "idle",
  LISTENING: "listening",
  THINKING: "thinking",
  SPEAKING: "speaking",
  ALERT: "alert",
};
```

Use smooth interpolation between states.

A state can map to visual targets such as:

``` js
{
  energy: 0.4,
  glow: 0.35,
  movement: 0.2,
  particleSpeed: 0.15,
  ribbonSpeed: 0.2,
  pulse: 0.1
}
```

The renderer should interpolate current values toward target values
rather than abruptly changing them.

------------------------------------------------------------------------

## 7. IDLE

Idle is the baseline state.

Bytie should appear alive even when nothing is happening.

Use:

- slow vertical floating
- extremely subtle scale breathing
- slow internal energy movement
- very slow ribbon movement
- occasional particle movement
- subtle highlight movement
- low/moderate glow
- no aggressive rotation

The animation should never feel completely dead, but it must be subtle
enough for normal computer usage.

------------------------------------------------------------------------

## 8. LISTENING

Listening means the user is actively talking to Bytie.

Use:

- slightly brighter body
- more attentive ribbon motion
- subtle forward movement
- increased internal energy
- increased particle activity
- gentle pulse
- optional audio-reactive response when microphone data is available

The effect should communicate:

> “I’m listening.”

It should not look like an alarm.

------------------------------------------------------------------------

## 9. THINKING

Thinking should make Bytie visually interesting.

Increase:

- internal energy movement
- color flow
- ribbon movement
- particle velocity
- subtle distortion
- glow
- light movement

Do **not** simply rotate the entire model faster.

The energy inside the entity should appear to reorganize, communicating
internal computation.

------------------------------------------------------------------------

## 10. SPEAKING

Prepare the visual system for TTS/audio amplitude.

Architecture:

``` text
TTS audio
   ↓
Audio analyser
   ↓
amplitude / frequency / smoothing
   ↓
Bytie animation parameters
```

Possible reactions:

- body breathing
- glow intensity
- internal energy amplitude
- ribbon movement
- small scale changes

Use smoothing to prevent jitter.

If audio data is not available yet, use a simulated speaking rhythm
behind a local feature flag/state.

------------------------------------------------------------------------

## 11. ALERT

Alert should be rare.

Use:

- slightly stronger brightness
- tighter energy movement
- short pulse
- subtle color emphasis

Avoid red flashing or emergency-style effects unless a real urgent
system event later requires it.

------------------------------------------------------------------------

## 12. Body

Use a high-resolution sphere or similarly smooth geometry.

The body must NOT look like:

``` text
simple sphere
+
flat gradient
+
white dot
```

Combine:

1.  base translucent material
2.  procedural color field
3.  internal light
4.  Fresnel/rim effect
5.  subtle surface distortion
6.  internal energy layers
7.  controlled bloom
8.  optional refraction/transmission if performance allows

------------------------------------------------------------------------

## 13. Procedural Color

Target palette:

- cyan
- electric blue
- violet
- magenta
- pink
- subtle green
- white highlight

Colors must blend organically rather than forming hard stripes.

Useful shader uniforms:

``` glsl
uTime
uState
uEnergy
uNoiseScale
uNoiseStrength
uColorA
uColorB
uColorC
uColorD
```

Use procedural noise/layered functions to create slow-moving internal
color fields.

------------------------------------------------------------------------

## 14. Internal White Light

The strong white light in the reference should feel like it exists
**inside** Bytie.

Do not implement it as a flat white circle over the sphere.

Possible approaches:

- emissive inner sphere
- shader-based radial light
- additive transparent geometry
- point light + bloom
- volumetric-looking gradient

The light should be slightly offset from the exact center and drift
slowly.

------------------------------------------------------------------------

## 15. Spirit Ribbons

Spirit ribbons are one of Bytie’s defining features.

They should resemble:

- energy ribbons
- translucent fins
- spirit tails
- flowing membranes
- curved plasma

Avoid mechanical-looking wings.

Possible implementation techniques:

### Option A — TubeGeometry

Use curves and `TubeGeometry`.

### Option B — Shader planes

Use curved transparent geometry with animated shader distortion.

### Option C — Custom ribbon geometry

Generate ribbon surfaces around curves for maximum control.

Start with the simplest technique that achieves the required visual
quality.

------------------------------------------------------------------------

## 16. Ribbon Motion

Each ribbon must have slightly different motion.

Example:

``` text
Ribbon A: speed 0.35, amplitude 0.12
Ribbon B: speed 0.28, amplitude 0.18
Ribbon C: speed 0.42, amplitude 0.09
Ribbon D: speed 0.31, amplitude 0.15
```

Do not synchronize everything.

Use multiple frequencies, phases, and subtle noise to create organic
movement.

------------------------------------------------------------------------

## 17. Particles

Add a small number of particles around Bytie.

Particles should:

- drift slowly
- occasionally orbit
- fade
- vary slightly in size
- respond to state

Avoid particle overload. The goal is atmosphere, not a particle demo.

------------------------------------------------------------------------

## 18. Orbital Energy

Optional thin glowing curves can orbit Bytie.

They should remain subtle.

They may:

- appear occasionally
- change speed by state
- fade in/out
- partially disappear behind the body

They should support the creature, not become the main visual.

------------------------------------------------------------------------

## 19. Lighting and Bloom

Bytie should feel like it generates its own light.

Use:

- soft ambient lighting
- internal emissive light
- subtle rim/Fresnel lighting
- controlled bloom

Avoid harsh directional lighting that makes Bytie look like a normal 3D
toy.

Bloom should create:

``` text
object
  ↓
soft light
  ↓
subtle bloom
  ↓
atmospheric glow
```

not:

``` text
object
  ↓
massive white neon blob
```

------------------------------------------------------------------------

## 20. Camera

Use a fixed camera initially.

Do not constantly orbit around Bytie.

Possible subtle behavior:

- tiny breathing movement
- slight response to pointer position
- very small parallax

Do not turn Bytie into a rotating 3D product showcase.

------------------------------------------------------------------------

## 21. Interaction

Pointer movement can subtly affect Bytie.

Example:

``` text
pointer moves right
       ↓
internal light shifts slightly right
       ↓
ribbons react subtly
```

Bytie should not chase the cursor.

On click/tap:

- short energy pulse
- temporary brightness
- ripple through internal energy
- state transition if appropriate

------------------------------------------------------------------------

## 22. Performance

ByteHouse should remain responsive.

Requirements:

- avoid unnecessary geometry complexity
- avoid hundreds/thousands of expensive transparent objects
- reuse geometries and materials
- dispose resources correctly
- never create expensive objects every animation frame
- use delta time
- avoid React state updates every frame
- keep frame animation inside the Three.js loop/ref
- reduce/pause animation when not visible

Do not cause the entire React component tree to re-render every frame.

Clamp pixel ratio:

``` js
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);
```

Adjust only if testing requires it.

------------------------------------------------------------------------

## 23. Reduced Motion

Respect:

``` css
@media (prefers-reduced-motion: reduce) {
  /* reduce Bytie movement */
}
```

Reduced-motion mode should:

- reduce floating
- reduce pulses
- reduce particle movement
- retain the Bytie identity

------------------------------------------------------------------------

## 24. Component API

Keep the API small:

``` jsx
<Bytie
  state="idle"
  size="medium"
  interactive={true}
/>
```

Possible props:

``` ts
type BytieProps = {
  state?: BytieState;
  size?: "small" | "medium" | "large";
  interactive?: boolean;
  audioLevel?: number;
  className?: string;
};
```

Do not expose dozens of visual parameters to the rest of ByteHouse.

------------------------------------------------------------------------

## 25. Size Modes

### Compact

For:

- Command Centre
- menu bar/presence
- compact assistant UI

### Standard

For normal ByteHouse interaction.

### Expanded

For deep interaction and the main ByteHouse interface.

The same identity must remain recognizable at every size.

------------------------------------------------------------------------

## 26. Persistent Presence

ByteHouse is not fundamentally:

``` text
open app → talk to AI
```

The intended experience is:

``` text
Mac
 │
 └── ByteHouse
      ├── persistent presence
      ├── Bytie
      └── expanded interface
```

Bytie represents that persistent presence.

Eventually:

``` text
Mac Command Centre
       ↓
     Bytie
       ↓
Expanded ByteHouse
```

The full application is the deep interaction surface.

------------------------------------------------------------------------

## 27. State Machine

Use a clear state model:

``` text
                 ┌──────────┐
                 │   IDLE   │
                 └────┬─────┘
                      │
                user invokes
                      ↓
               ┌────────────┐
               │ LISTENING  │
               └─────┬──────┘
                     │
                input ends
                     ↓
               ┌────────────┐
               │ THINKING   │
               └─────┬──────┘
                     │
               response starts
                     ↓
               ┌────────────┐
               │ SPEAKING   │
               └─────┬──────┘
                     │
                response ends
                     ↓
                    IDLE
```

ALERT can temporarily interrupt any state.

Transitions must be interpolated.

------------------------------------------------------------------------

## 28. Development Phases

Do not attempt the whole visual system in one pass.

### Phase 1 — Three.js foundation

Implement:

- canvas
- camera
- renderer
- responsive sizing
- basic sphere
- cleanup

Verify the app runs without console errors or leaks.

### Phase 2 — Energy body

Implement:

- procedural gradient
- multiple colors
- internal light
- Fresnel/rim effect
- subtle distortion

### Phase 3 — Spirit ribbons

Implement:

- 3–5 ribbon structures
- transparency
- glow
- independent movement
- depth

### Phase 4 — Particles and atmosphere

Implement:

- particles
- orbital energy
- floating elements
- subtle bloom

### Phase 5 — State animation

Implement:

- idle
- listening
- thinking
- speaking
- alert

### Phase 6 — Interaction

Implement:

- pointer response
- click response
- optional audio reactivity

### Phase 7 — ByteHouse integration

Replace the current orb/presence component.

Connect ByteHouse state → Bytie state.

Do not rewrite unrelated UI.

------------------------------------------------------------------------

## 29. Visual Fidelity Workflow

Antigravity MUST use this loop:

``` text
inspect
→ implement one visual layer
→ run app
→ screenshot
→ compare with reference
→ identify 3 largest mismatches
→ fix them
→ repeat
```

Prioritize:

1.  silhouette
2.  overall composition
3.  body proportions
4.  ribbon shape
5.  color distribution
6.  internal light
7.  depth
8.  glow
9.  particle density
10. micro-details

Do not continuously add random effects.

------------------------------------------------------------------------

## 30. Critical Visual Rule

Do NOT implement:

``` text
gradient sphere
+
white dot
+
CSS glow
+
rotation
```

and call it Bytie.

The required visual system is:

``` text
BODY
+
INTERNAL ENERGY
+
SPIRIT RIBBONS
+
LIGHT
+
DEPTH
+
PARTICLES
+
ORGANIC MOTION
+
STATE REACTIVITY
```

Animation should communicate meaning:

``` text
IDLE       → calm breathing
LISTENING  → attention
THINKING   → internal computation
SPEAKING   → expression
ALERT      → awareness
```

Every major animation should answer:

> What is Bytie communicating?

------------------------------------------------------------------------

## 31. Engineering Rules for Antigravity

Before modifying code:

1.  Read `AGENTS.md`.
2.  Read `ANALYSIS.md`.
3.  Read `ARCHITECTURE.md`.
4.  Read `PROGRESS.md`.
5.  Read `DECISIONS.md`.
6.  Inspect the existing ByteHouse frontend.
7.  Identify the current orb/presence implementation.
8.  Inspect existing dependencies.

Then:

``` text
inspect
→ plan
→ implement
→ run
→ screenshot
→ compare
→ fix
→ verify
→ update PROGRESS.md
```

Do not:

- modify backend code
- modify API contracts
- rewrite unrelated components
- replace architecture without justification
- add unnecessary packages
- create duplicate render systems
- hardcode application business logic into Bytie
- put AI logic inside the renderer

------------------------------------------------------------------------

## 32. Definition of Done

For the current milestone:

- [ ] Bytie renders correctly
- [ ] body has depth
- [ ] body contains multiple blended colors
- [ ] internal light exists
- [ ] spirit ribbons exist
- [ ] ribbons have independent organic movement
- [ ] particles exist but remain subtle
- [ ] bloom/glow is controlled
- [ ] idle state feels alive
- [ ] listening state is visually distinct
- [ ] thinking state communicates internal activity
- [ ] speaking state is implemented or prepared for audio input
- [ ] alert state exists
- [ ] transitions are smooth
- [ ] pointer interaction is subtle
- [ ] reduced-motion behavior exists
- [ ] responsive sizing works
- [ ] resources are cleaned up
- [ ] no frame-by-frame React re-render loop exists
- [ ] no console errors
- [ ] existing ByteHouse functionality remains intact
- [ ] screenshot comparison has been performed
- [ ] PROGRESS.md has been updated

------------------------------------------------------------------------

## 33. Future Direction

Do not implement these prematurely, but preserve room for:

- real voice-reactive animation
- local LLM state integration
- memory-aware visual states
- proactive presence
- Mac Command Centre integration
- global invocation
- menu bar presence
- native macOS overlay
- mobile presence
- synchronized Bytie state across devices
- event-driven reactions
- personality-driven micro-behaviors

Long-term:

``` text
                    BYTEHOUSE CORE
                          │
                 ┌────────┴────────┐
                 │                 │
              INTELLIGENCE      MEMORY
                 │                 │
                 └────────┬────────┘
                          │
                       CONTEXT
                          │
                        TOOLS
                          │
                        EVENTS
                          │
                    BYTIE PRESENCE
                 ┌────────┼────────┐
                 │        │        │
                MAC     MOBILE   OTHER
              PRESENCE  PRESENCE  CLIENTS
```

Bytie should eventually become the recognizable visual identity of the
entire ByteHouse system.

------------------------------------------------------------------------

# Final Instruction to Antigravity

Build Bytie as a **living 3D digital spirit**, not a decorative orb.

Use Three.js/WebGL where it materially improves:

- depth
- translucency
- procedural energy
- particle systems
- organic motion
- shader effects
- visual state transitions

Keep the implementation modular.

Keep ByteHouse core independent from the renderer.

Do not attempt to finish the entire future Bytie system in one pass.

Start with the smallest verifiable milestone, make it visually
convincing, compare it against the reference, then continue layer by
layer.

The final experience should make the user feel:

> **“Bytie is here.”**

rather than:

> **“There is an animated 3D object on my screen.”**
