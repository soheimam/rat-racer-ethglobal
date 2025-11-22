# Rat Visual Assets Guide

## Overview

Each rat NFT has two visual representations:
1. **Static Preview Image** - PNG file shown on OpenSea and in metadata
2. **3D Race Model** - GLTF model used during actual races

## Available Colors & Images

### Static Preview Images
Location: `/public/images/`

- `brown.png` - Brown rat
- `pink.png` - Pink rat  
- `white.png` - White rat

**Note:** These are the only colors currently available. The metadata generator randomly assigns one of these three colors to each minted rat.

### 3D Race Models
Location: `/public/models/rat-1/` through `/public/models/rat-6/`

Each model folder contains:
- `rat.gltf` - 3D model file
- `scene.bin` - Binary geometry data
- `textures/` - Texture maps (baseColor, normal, metallicRoughness)

The `modelIndex` (1-6) determines which 3D model is used during races.

## How It Works

When a rat is minted:

1. **Color Assignment** (for static image):
   - Randomly selects: `brown`, `pink`, or `white`
   - This determines the preview PNG: `/images/{color}.png`
   - Shown in OpenSea and metadata `image` field

2. **Model Assignment** (for 3D races):
   - Randomly selects `modelIndex` 1-6
   - This determines the 3D model: `/models/rat-{modelIndex}/`
   - Used during actual race rendering

## Metadata Structure

```json
{
  "name": "Street Rat #42",
  "description": "A Speed Demon racing rat...",
  "image": "https://your-domain.com/images/brown.png",
  "external_url": "https://your-domain.com/rat/42",
  "attributes": [
    { "trait_type": "Color", "value": "Brown" },
    { "trait_type": "3D Model", "value": 3 },
    ...
  ],
  "properties": {
    "color": "brown",
    "modelIndex": 3,
    ...
  }
}
```

## Environment Variables

### NEXT_PUBLIC_URL

This should be set to your deployed domain:

```bash
# .env.local
NEXT_PUBLIC_URL=https://rat-racer.vercel.app
```

The metadata generator uses this to construct:
- Image URLs: `${NEXT_PUBLIC_URL}/images/{color}.png`
- External URLs: `${NEXT_PUBLIC_URL}/rat/{tokenId}`

**Important:** This should NOT have a trailing slash.

## Adding More Colors

To add more rat colors:

### 1. Add PNG Files
Place new PNG files in `/public/images/`:
- `black.png`
- `grey.png`
- `spotted.png`

### 2. Update Color List
Edit `lib/metadata-generator.ts`:

```typescript
const RAT_COLORS = [
    'brown',
    'pink',
    'white',
    'black',    // NEW
    'grey',     // NEW
    'spotted',  // NEW
];
```

### 3. Rebuild
```bash
bun run build
```

That's it! The metadata generator will now randomly assign from all available colors.

## Image Requirements

For best results on OpenSea:

- **Format:** PNG with transparency
- **Dimensions:** 512x512px minimum (1024x1024px recommended)
- **File Size:** Under 1MB per image
- **Background:** Transparent or solid color
- **Style:** Consistent across all variants

## Race Rendering

During races, the 3D model is loaded based on `modelIndex`:

```typescript
// In race component
const modelPath = `/models/rat-${rat.modelIndex}/rat.gltf`;
```

The color from metadata is NOT used during races - only the 3D model is rendered. The static PNG is purely for preview/marketplace display.

## Verification

After minting a test rat:

1. Check the metadata JSON (from Blob storage)
2. Verify `image` field points to correct PNG: `/images/{color}.png`
3. Verify `properties.modelIndex` is between 1-6
4. Visit the image URL - should show the correct colored rat
5. Check OpenSea - should display the static PNG

## Example Flow

**User mints rat #42:**

1. Webhook generates metadata
2. Rolls random color: `brown`
3. Rolls random model: `3`
4. Metadata uploaded with:
   - `image: "https://rat-racer.vercel.app/images/brown.png"`
   - `properties.color: "brown"`
   - `properties.modelIndex: 3`
5. OpenSea displays: Brown rat PNG
6. In races: Uses 3D model from `/models/rat-3/`

## Troubleshooting

### Issue: Image not loading on OpenSea
**Solution:** 
- Verify NEXT_PUBLIC_URL is set correctly
- Check that PNG file exists in `/public/images/`
- Ensure no trailing slash in NEXT_PUBLIC_URL

### Issue: Wrong model in races
**Solution:**
- Check `properties.modelIndex` in metadata
- Verify model folder exists: `/public/models/rat-{modelIndex}/`
- Check console for 3D model loading errors

### Issue: Color doesn't match image
**Solution:**
- This is by design - color is for static preview
- 3D model texture is independent
- To sync them, you'd need to create color variants of each 3D model

