<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

## DoorStep CRM Development Context

AI-assisted work in this repo starts with [CLAUDE.md](CLAUDE.md). The spec-driven workflow lives in:

- [AGENTS.md](AGENTS.md)
- [SCRATCHPAD.md](SCRATCHPAD.md)
- [decisions.md](decisions.md)
- [ENVIRONMENT.md](ENVIRONMENT.md)
- [DO_NOT_TOUCH.md](DO_NOT_TOUCH.md)
- [specs/](specs/)

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/975a9fff-6636-420d-9ff5-37b46de7e91e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
