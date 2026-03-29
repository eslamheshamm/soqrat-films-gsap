# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command           | Action                                  |
| :---------------- | :-------------------------------------- |
| `npm run dev`     | Start dev server at `localhost:4321`    |
| `npm run build`   | Build production site to `./dist/`      |
| `npm run preview` | Preview production build locally        |

No test runner or linter is configured.

## Architecture

Astro 5 static site for **Soqrat Films** — a wedding film portfolio with WebGL pixel-reveal image effects and page transitions. Based on [this Codrops tutorial](https://tympanus.net/codrops/?p=107628).

### Rendering layers

Two parallel rendering layers are composited together:

1. **Astro/HTML layer** — standard DOM content rendered by Astro pages/layouts.
2. **Three.js WebGL layer** — a full-viewport `<canvas id="webgl">` overlaid on the DOM. Each `<img>` on the page gets a corresponding `Media` mesh in the Three.js scene that mirrors its DOM position/size. The mesh uses a custom shader (`src/app/shaders/`) to render a pixel-grid reveal effect driven by scroll progress.

The `Canvas` class (`src/app/components/canvas.ts`) manages the Three.js scene, camera, and renderer. It creates one `Media` instance per `<img>` element. `Media` (`src/app/components/media.ts`) converts DOM bounds to Three.js world coordinates, syncs scroll position each frame, and uses `ScrollTrigger` to animate the `uProgress` shader uniform.

### Page transitions

Barba.js handles SPA-style page transitions. Two transition types are defined in `src/app/main.ts`:

- **default-transition** — text animates out, shader progress reverses on all images, then new page content loads and animates in.
- **home-detail** — when clicking a gallery image on the home page, GSAP Flip animates the clicked image from its grid position to the detail view layout, while other images reverse their shader.

### Scroll system

`ScrollSmoother` (GSAP plugin) wraps `#app` → `#smooth-content` for smooth scrolling. The `Scroll` class (`src/app/components/scroll.ts`) manages smoother lifecycle and provides scroll position to the render loop.

### Text animations

`TextAnimation` (`src/app/components/text-animation.ts`) uses GSAP `SplitText` for line-masked reveal animations. Elements opt in via `data-text-animation` attributes, with configurable duration/delay/stagger via `data-text-animation-*` attributes.

### Key data flow

`src/data.json` → Astro pages read media entries → rendered as `<img>` tags → `Canvas.createMedias()` finds all `<img>` elements and creates WebGL `Media` meshes → each mesh syncs to its DOM counterpart's position every frame via `gsap.ticker`.

### Pages

- `src/pages/index.astro` — home gallery grid
- `src/pages/[index].astro` — detail view (statically generated per media entry)
- `src/pages/films.astro`, `about.astro`, `contact.astro` — additional pages

### GLSL shaders

`vite-plugin-glsl` enables direct `.glsl` imports. The fragment shader implements the pixelated grid reveal: it divides the image into a grid, uses a progress uniform to sweep a reveal band from bottom to top, and mixes between a solid color and the image texture with randomized thresholds per grid cell.

### Fonts

Satoshi (self-hosted TTF, preloaded) loaded via `FontFaceObserver`. Adobe Typekit stylesheet also included. Text animations wait for font load before initializing.
