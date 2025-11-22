# Missing Local Assets

This document lists all assets that were referenced from external APIs but are not found locally.

## 🎵 Audio Files (CRITICAL - Race will be silent without these)

Create directory: `/public/audio/`

Missing audio files:

- `/public/audio/rat-racer.mp3` - Race soundtrack #1
- `/public/audio/neon-skys.mp3` - Race soundtrack #2

**Where referenced:**

- `app/race/[id]/page.tsx` (lines 6-8)
- `components/racetrack.tsx` (lines 24-27)

**Note:** The app will work without these, but there will be no audio during races. The audio player component will show but won't play anything.

---

## 🖼️ Optional Assets

### Race Banner Image

- Original: `https://api.metafuse.me/assets/metacade/rat-race/race-banner.png`
- Current placeholder: Using `/images/white.png`
- Location: `lib/mock-data.ts` (line 129)

If you want a custom race banner, create one and update the `contentUrl` in `lib/mock-data.ts`.

---

## ✅ Assets Already Local

These assets are properly configured and found locally:

### Rat Images

- `/public/images/white.png` ✓
- `/public/images/pink.png` ✓
- `/public/images/brown.png` ✓

### 3D Models

- `/public/models/rat-1/` through `/public/models/rat-6/` ✓
  - Each contains: `rat.gltf`, `scene.bin`, and textures

### City/Track Models

- `/public/city/city.gltf` ✓
- `/public/road/scene.gltf` ✓

---

## 🔧 Quick Fix

To add the audio files:

1. Create the audio directory:

   ```bash
   mkdir -p public/audio
   ```

2. Add your MP3 files:
   - `public/audio/rat-racer.mp3`
   - `public/audio/neon-skys.mp3`

The app will automatically pick them up after restart.
