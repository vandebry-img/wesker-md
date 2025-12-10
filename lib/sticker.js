import { Sticker, StickerTypes } from "wa-sticker-formatter";

export async function imageToSticker(buffer, pack = "Wesker-MD", author = "Febry") {
  const sticker = new Sticker(buffer, {
    pack,
    author,
    type: StickerTypes.FULL
  });
  return sticker.build(); // Buffer WebP
}
