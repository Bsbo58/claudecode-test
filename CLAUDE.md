# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Games

No build step. Open files directly in a browser:

```bash
start shooter.html
start tictactoe.html
```

## Repository Structure

Two standalone single-file browser games. Each file is fully self-contained — HTML, CSS, and JS in one file with no external dependencies, no bundler, no framework.

## shooter.html — Architecture

The game is structured as a classic fixed-timestep game loop inside one `<script>` block, organized in this order:

1. **Constants** (top) — all tunable values (`PLAYER_SPEED`, `ZOMBIE_SPEEDS`, `LEVEL_COUNTS`, etc.). Tweak these to adjust difficulty.
2. **Input state** — `keys {}` (WASD booleans) and `mouse {}` (canvas-relative x/y + down flag). Mouse coords use `getBoundingClientRect` scaling to stay correct if the canvas is CSS-scaled.
3. **Audio** — `playSound(type)` uses Web Audio API oscillators. `AudioContext` is created lazily on first `mousedown` to satisfy autoplay policy. Adding a new sound = add a new `case` in the switch.
4. **Game state** — four module-level arrays/objects: `player`, `bullets[]`, `zombies[]`, `state`. `state.phase` drives the whole game machine: `'PLAYING' → 'LEVEL_TRANSITION' → 'PLAYING'` (repeat) `→ 'WIN'` or `'GAME_OVER'`.
5. **Update functions** — called each frame only when `state.phase === 'PLAYING'`. Dead-entity pattern: set `.dead = true` during loops, then `array.filter()` after — never `splice` inside iteration.
6. **Draw functions** — painter's order: background → zombies → player → bullets → HUD → overlay. Every rotated entity uses `ctx.save() / ctx.translate() / ctx.rotate() / ctx.restore()`. Text labels that must not rotate (e.g. "YUSUF", HP pips) are drawn **after** `ctx.restore()`.
7. **Game loop** — `requestAnimationFrame`, delta-time clamped to 50 ms to prevent physics tunnelling on tab-switch resume.

### Level progression flow
```
initGame() → spawnZombies(1)
  ↓ all zombies dead
checkLevelComplete() → state.phase = 'LEVEL_TRANSITION'
  ↓ transitionTimer expires
initLevel(n) → spawnZombies(n)  [or WIN if level > 3]
```

### Adding a new level
- Append to `LEVEL_COUNTS` and `ZOMBIE_SPEEDS`.
- Update the win condition check `state.level >= 3` in `checkLevelComplete()` and `update()`.

## Visual / Style Conventions

- Dark palette: body background `#0d0d1a` / `#1a1a2e`, accent colors cyan `#00ccff`, green `#22cc44`, red `#ee2222`.
- Font: `'Courier New', monospace` throughout both games.
- `shadowBlur` is only used on bullets; always reset to `0` immediately after to avoid polluting subsequent draw calls.
- `image-rendering: pixelated` on the canvas for the retro look.

## Git Workflow

Remote: `https://github.com/Bsbo58/claudecode-test` (branch `master`).

After every meaningful change:
```bash
git add <files>
git commit -m "concise imperative message"
git push
```

Commit message style: imperative, present tense, lowercase subject (e.g. `add dash ability to shooter`, `fix diagonal speed normalisation`).
