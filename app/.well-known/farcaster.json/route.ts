import { METADATA } from "../../../lib/utils";

export async function GET() {
  const config = {
    accountAssociation: {
        header: "eyJmaWQiOjE0NDA3MTYsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg4MzJlMjJFOEM0REQwNjZmNTdDMzA4N2NDNzcxNWExNzdiOTEyNEVmIn0",
        payload: "eyJkb21haW4iOiJyYXQtcmFjZS1nYW1tYS52ZXJjZWwuYXBwIn0",
        signature: "/wFtMX3clnXxUbuNBUW29NERhCUe6vIJfIvAmzP70qEB6bQdOgCpr+PxqsoLo4MKpdO/87ioTooQRcpnuQVCqBs="
    },
      "miniapp": {
        "version": "1",
        "name": METADATA.name,
        "iconUrl": METADATA.iconImageUrl,
        "homeUrl": METADATA.homeUrl,
        "imageUrl": METADATA.bannerImageUrl,
        "splashImageUrl": METADATA.iconImageUrl,
        "splashBackgroundColor": METADATA.splashBackgroundColor,
        "description": METADATA.description,
        "ogTitle": METADATA.name,
        "ogDescription": METADATA.description,
        "ogImageUrl": METADATA.bannerImageUrl,
        "canonicalDomain": "https://rat-race-gamma.vercel.app/",
        "noindex": false,
        "tags": ["base", "baseapp", "miniapp", "demo", "basepay"]
      },
      "baseBuilder": {
        "allowedAddresses": ["0x8342A48694A74044116F330db5050a267b28dD85"],
      }
  };

  return Response.json(config);
}