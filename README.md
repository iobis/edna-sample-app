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

Create a `.env` file with:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## PWA Icons

Add the following icon files to the `public` directory:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)

These are referenced in `vite.config.ts` for the PWA manifest.

