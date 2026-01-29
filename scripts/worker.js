import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    try {
      const page = await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        },
      );

      const response = new Response(page.body, page);

      const url = new URL(request.url).pathname;

      // HTML – krótki cache
      if (url.endsWith(".html") || url === "/") {
        response.headers.set("Cache-Control", "public, max-age=600");
      }

      // Static assets – długi cache
      else if (url.match(/\.(webp|jpg|jpeg|png|svg|css|js)$/)) {
        response.headers.set(
          "Cache-Control",
          "public, max-age=31536000, immutable",
        );
      }

      // fallback
      else {
        response.headers.set("Cache-Control", "public, max-age=86400");
      }

      return response;
    } catch (e) {
      return new Response("404 Not Found: " + e.message, { status: 404 });
    }
  },
};
