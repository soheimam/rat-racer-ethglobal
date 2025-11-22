# Metadata & Blob Storage Setup Guide

## Overview

This guide explains how the NFT metadata system works end-to-end.

## Architecture

```
User mints NFT
    ↓
RatNFT.mint() emits RatMinted event
    ↓
Webhook calls /api/rat-mint
    ↓
API generates random metadata
    ↓
Metadata uploaded to Vercel Blob → rats/metadata/{tokenId}.json
    ↓
URL stored in MongoDB
    ↓
tokenURI(tokenId) returns: BLOB_BASE_URL/{tokenId}.json
```

## Environment Variables

Add these to your `.env.local`:

```bash
# Vercel Blob Storage (get from Vercel dashboard)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxx
BLOB_BASE_URL=https://your-project.public.blob.vercel-storage.com/rats/metadata

# MongoDB
MONGO_CONNECTION=mongodb+srv://...

# Contract addresses (after deployment)
RAT_NFT_ADDRESS=0x...
```

## Contract Setup

### 1. Deploy RatNFT Contract

```bash
cd contracts/rat
npx hardhat ignition deploy ignition/modules/RatNFT.ts --network <network>
```

### 2. Set Base URI

After deployment, set the base URI to match your Blob storage location:

```bash
RAT_NFT_ADDRESS=0x... BLOB_BASE_URL=https://your-project.public.blob.vercel-storage.com/rats/metadata npx hardhat run scripts/set-base-uri.ts --network <network>
```

**Important:** The `BLOB_BASE_URL` should NOT include a trailing slash. The script will add it.

Example:
- ✅ Good: `https://xxx.public.blob.vercel-storage.com/rats/metadata`
- ❌ Bad: `https://xxx.public.blob.vercel-storage.com/rats/metadata/`

## Metadata Structure

The webhook generates OpenSea-compatible metadata:

```json
{
  "name": "Street Rat #1",
  "description": "A racing rat from the underground...",
  "image": "https://xxx.blob.vercel-storage.com/rats/images/1.png",
  "external_url": "https://ratracer.xyz/rat/1",
  "attributes": [
    { "trait_type": "Bloodline", "value": "Speed Demon" },
    { "trait_type": "Stamina", "value": 85 },
    { "trait_type": "Agility", "value": 92 },
    { "trait_type": "Speed", "value": 88 },
    { "trait_type": "Gender", "value": "male" },
    { "trait_type": "Model", "value": 3 }
  ],
  "properties": {
    "stats": {
      "stamina": 85,
      "agility": 92,
      "speed": 88,
      "bloodline": "Speed Demon"
    },
    "speeds": [85, 88, 90, 87, 89],
    "gender": "male",
    "modelIndex": 3,
    "color": "Brown",
    "dob": "2025-11-22T..."
  }
}
```

## Upload Locations

### Metadata Files
- **Path:** `rats/metadata/{tokenId}.json`
- **Example:** `rats/metadata/1.json`
- **Full URL:** `https://xxx.public.blob.vercel-storage.com/rats/metadata/1.json`

### Image Files (optional, for future)
- **Path:** `rats/images/{tokenId}.png`
- **Example:** `rats/images/1.png`

## Verification Steps

### 1. Check Contract Base URI

```bash
npx hardhat console --network <network>
```

```javascript
const ratNFT = await ethers.getContractAt("RatNFT", "0x...");
await ratNFT.baseURI();
// Should return: "https://xxx.public.blob.vercel-storage.com/rats/metadata/"
```

### 2. Mint a Test Rat

```javascript
const tx = await ratNFT.mint("0xYourAddress");
await tx.wait();
const tokenId = await ratNFT.nextTokenId() - 1n;
console.log("Minted token:", tokenId);
```

### 3. Wait for Webhook Processing

The webhook should:
1. Receive the `RatMinted` event
2. Generate random metadata
3. Upload to Blob Storage
4. Store in MongoDB

Check webhook logs at: `https://vercel.com/your-project/deployments/[latest]/functions`

### 4. Verify Metadata URL

```javascript
const uri = await ratNFT.tokenURI(tokenId);
console.log("Token URI:", uri);
// Should return: "https://xxx.public.blob.vercel-storage.com/rats/metadata/1.json"
```

### 5. Check Blob Storage

Visit the URL in your browser - you should see the JSON metadata.

### 6. Verify on OpenSea

Go to OpenSea testnet (if using testnet):
`https://testnets.opensea.io/assets/<network>/<contract>/<tokenId>`

OpenSea will fetch the metadata from the URL returned by `tokenURI()`.

## Common Issues

### Issue: tokenURI() returns empty string
**Solution:** Run the `set-base-uri.ts` script to set the base URI on the contract.

### Issue: Metadata not uploaded to Blob
**Solution:** Check that `BLOB_READ_WRITE_TOKEN` is set in your environment variables.

### Issue: Webhook not triggered
**Solution:** Verify webhook is configured in your deployment platform (Vercel, etc.).

### Issue: tokenURI() returns wrong URL
**Solution:** Ensure `BLOB_BASE_URL` matches the actual Blob storage location and ends with `/rats/metadata`

## Testing Locally

For local development, you can:

1. Run a local Hardhat node:
```bash
npx hardhat node
```

2. Deploy contracts:
```bash
npx hardhat ignition deploy ignition/modules/RatNFT.ts --network localhost
```

3. Set up ngrok to expose your webhook:
```bash
ngrok http 3000
```

4. Configure webhook to call: `https://your-ngrok-url.ngrok.io/api/rat-mint`

5. Mint a rat and watch the logs

## Production Checklist

- [ ] `BLOB_READ_WRITE_TOKEN` set in Vercel environment
- [ ] `BLOB_BASE_URL` set in Vercel environment
- [ ] RatNFT contract deployed
- [ ] Base URI set on contract (matches BLOB_BASE_URL)
- [ ] Webhook configured to call `/api/rat-mint`
- [ ] Test mint verified (metadata appears on OpenSea)
- [ ] MongoDB storing rat data correctly

## Support

If metadata isn't showing up:
1. Check Vercel function logs
2. Verify BLOB_BASE_URL is correct
3. Test the tokenURI URL in browser
4. Check OpenSea's metadata refresh button

