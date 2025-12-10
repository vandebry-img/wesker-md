import { tiktokdl } from "@bochilteam/scraper";

export async function downloadTikTok(url) {
  const res = await tiktokdl(url);
  const dl =
    res?.video?.no_watermark ||
    res?.video?.no_watermark2 ||
    res?.video?.with_watermark;

  if (!dl) throw new Error("Link unduhan tidak ditemukan");
  return { url: dl, meta: res };
}
