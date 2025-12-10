export function buildMenu(botName = "Wesker-MD") {
  return {
    title: "Selection",
    text: "Pilih salah satu kategori:",
    footer: `${botName} • Free Edition`,
    buttonText: "Select",
    sections: [
      {
        title: "⬇️ Downloader",
        rows: [{ title: "TikTok", description: "Unduh video tanpa watermark", rowId: "dl_tiktok" }]
      },
      {
        title: "🧩 Sticker",
        rows: [{ title: "Buat Sticker", description: "Kirim/reply gambar + ketik /sticker", rowId: "sticker_info" }]
      },
      {
        title: "👑 Owner",
        rows: [{ title: "Kontak Owner", description: "Info & kontak pemilik bot", rowId: "owner_info" }]
      }
    ]
  };
}
