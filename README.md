# GigFlow — Freelance Automation

Browser extension to monitor Mostaql & Khamsat gigs, match by skill, and generate AI proposals in Arabic or English.

## Quick start

Requirements: Node 18+, npm

Install dependencies:

```bash
npm install
```

Run the build watch (development):

```bash
npm run dev
```

This builds into the `dist/` folder. To load the extension in Chrome/Edge:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project's `dist/` folder.

## Build (production)

```bash
npm run build
```

## Project structure

- `src/` — React source and extension UI
- `background.ts` — service worker / background script
- `public/manifest.json` — extension manifest used for builds
- `dist/` — build output (generated)

## Contributing

1. Fork and clone this repo.
2. Create a feature branch.
3. Open a PR describing changes.

## License

MIT — see `LICENSE`.

## Contact

Repository: https://github.com/SoYama350/Gig-flow.git
