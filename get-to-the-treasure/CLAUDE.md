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
├── src/
│   ├── main.js           # Phaser game config (800x450, arcade physics, orange bg)
│   └── scenes/
│       └── GameScene.js  # Main game scene (road, car, input, camera)
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

### Physics & Input
- Right arrow key applies acceleration (500 px/s²)
- Drag (400 px/s²) decelerates the car when the key is released, creating a roll-to-stop effect
- Max velocity capped at 300 px/s
- Leftward velocity is clamped to 0 — the car can only move forward

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build

## Roadmap

- [ ] Houses along the road (above and below, upside-down below like the drawing)
- [ ] Car selection
- [ ] Weather system (rain/snow storms)
- [ ] Treasure destination / win condition
