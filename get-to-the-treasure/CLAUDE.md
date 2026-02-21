# Get To The Treasure

A 2D side-scrolling car game built with Phaser 3, inspired by a kid's drawing of a car driving along a road past houses.

## Tech Stack

- **Phaser 3** — 2D game engine (arcade physics, sprites, camera, input)
- **Vite** — dev server with hot module reload
- No image assets — all graphics are drawn programmatically using Phaser's Graphics API

## Project Structure

```
get-to-the-treasure/
├── index.html            # Entry point, loads src/main.js
├── package.json
├── design/               # Reference drawings (kid's original inspiration art)
├── src/
│   ├── main.js           # Phaser game config (800x450, arcade physics, orange bg)
│   └── scenes/
│       └── GameScene.js  # Main game scene — all gameplay in one file
```

## How It Works

### Rendering
- **Road**: Gray rectangle with black edge lines, pinned to camera (`scrollFactor(0)`) so it always fills the screen
- **Yellow dashes**: A TileSprite with a small repeating dash texture. `tilePositionX` is updated each frame to match camera scroll, creating the illusion of road movement
- **Car**: Drawn with Graphics API (body, cabin, window, wheels, headlight), then baked into a texture via `generateTexture()` and used as a physics sprite

### Side-Scrolling
- Camera follows the car horizontally with an offset so the car sits in the left third of the screen
- World bounds allow infinite rightward movement but block leftward movement past x=0
- Road surface + edges use `scrollFactor(0)` — they stay fixed on screen since they look identical everywhere

### Houses
- Procedurally generated above the road using a seeded random chunk system (CHUNK_WIDTH = 500px)
- Each chunk has a ~60% chance of spawning a house with a random color, random Y offset, and a wide random X offset (0 to CHUNK_WIDTH) for organic, irregular spacing
- Seeded randomness means the same chunk always produces the same house — no need to store state
- 6 house color variants, each with a triangular roof, door with doorknob, and cross-pane windows
- Houses that scroll off-screen to the left are destroyed to keep memory bounded

### House Entry
- **Detection**: AABB overlap check each frame — car's 60px width vs house's 82px width
- **Enter indicator**: Yellow bouncing triangle (▲) between house and road, animated via `Math.sin(time)`. Rendered at depth 10
- **Enter animation** (up arrow): `Cubic.easeIn` tween — car moves to house center, shrinks to 20%, fades to 0. Physics body disabled during animation
- **Occupied state**: House gets warm tint (`0xffdd88`) simulating lit windows. Exit indicator (▼) bounces below house
- **Exit animation** (down arrow): `Cubic.easeOut` tween — car appears from house, grows to full size, swoops back to road position. Physics re-enabled on completion
- **State machine**: Three states (driving / animating / inside) gate input — prevents driving while mid-animation or entering two houses
- **Safety**: `cleanupHouses()` skips the occupied house to prevent destroying it while the car is inside

### Treasure Chests
- Spawned on the road using a separate chunk system (~12% of chunks), placed on the car's driving line
- **Texture**: Layered Graphics drawing — wood body with grain lines, darker lid, gold trim band, vertical straps, clasp with keyhole, and a bright golden glow line at the lid crack
- **Idle animation**: Gentle 3px vertical bob via `Math.sin()` with per-chest phase offset; golden shimmer via dynamic tint oscillation
- **Collection**: AABB overlap triggers collection when car drives into chest
- **Collection animation**: Chest flashes white + scales to 1.6x, 20 golden sparkle particles burst radially, 6 tiny stars float upward — all with timed cleanup/destroy
- **HUD**: Top-right counter (dark rounded pill bg, chest icon, gold "×N" text) pinned with `scrollFactor(0)` at depth 20. Icon + text punch-scale with `Back.easeOut` on collection
- Off-screen chests are destroyed via `cleanupTreasures()`

### Weather (Rain & Snow)
- Both use Phaser's particle emitter system with `scrollFactor(0)` so they're pinned to the viewport
- **Rain**: Blue 2x8px rectangles falling fast (300–500 speedY), slight wind slant (speedX -30 to -60), 1200ms lifespan, fading alpha
- **Snow**: White 8px circles drifting gently (40–90 speedY), random horizontal sway (speedX -20 to +20), 6000ms lifespan, varied scale (0.3–1.0) for depth
- Timed cycle: clear (10–40s) → rain (20–30s) → clear → snow → clear → rain...
- Emitters call `stop()` when weather ends so particles fade out naturally; destroyed after 6s cleanup delay

### Physics & Input
- Right arrow key applies acceleration (500 px/s²)
- Drag (400 px/s²) decelerates the car when the key is released, creating a roll-to-stop effect
- Max velocity capped at 300 px/s
- Leftward velocity is clamped to 0 — the car can only move forward
- Up arrow enters a nearby house, down arrow exits

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build
