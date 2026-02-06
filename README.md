# eDNA Sample Metadata App

A Progressive Web App (PWA) for collecting eDNA sample metadata in the field. Works offline, stores samples locally, and syncs when connection is restored.

## Features

- Offline-first architecture with IndexedDB storage
- GPS location tracking with uncertainty visualization
- Interactive map for location selection
- Real-time sync status with sample counts
- Mobile-optimized UI

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Environment Variables

For local development, create a `.env` file to override the API endpoint:

```
VITE_API_BASE_URL=http://192.168.1.9:8000/api
```

**Production**: The app defaults to `https://platform.ednaexpeditions.org/api` when no environment variable is set. For GitHub Pages deployment, set the `VITE_API_BASE_URL` secret in your repository settings.

## PWA Icons

Add the following icon files to the `public` directory:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)

These are referenced in `vite.config.ts` for the PWA manifest.

