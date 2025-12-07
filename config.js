global.owner = ["6281510040802"];
global.botName = "𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃";
global.packname = "𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃";
global.author = "𝐅𝐞𝐛𝐫𝐲𝐖𝐞𝐬𝐤𝐞𝐫";
global.prefa = [".", "!", "/", "#", "$"];
global.sessionName = "session-wesker";
global.prefix = ".";

// Database (MongoDB)
global.mongodb = process.env.MONGODB_URI || "";

// API Keys (Add your own)
global.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
global.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
global.DEEPAI_API_KEY = process.env.DEEPAI_API_KEY || "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";

// Settings
global.autoread = false;
global.autobio = false;
global.autotype = false;
global.autorecord = false;
global.autoreaction = false;
global.anticall = true;
global.antispam = true;
global.antilink = false;
global.antibadword = false;

// Pairing mode
global.pairing = true;
global.pairingNumber = "6282343873101";

// Limits
global.limit = {
    sticker: 10,
    download: 5,
    tts: 3,
    translate: 5,
    ai: 3
};

// Messages
global.messages = {
    welcome: "👋 Welcome to *{botName}*!\nType .menu for commands",
    ownerOnly: "❌ This command is for owner only!",
    groupOnly: "❌ This command only works in groups!",
    privateOnly: "❌ This command only works in private chat!",
    wait: "⏳ Please wait...",
    error: "❌ An error occurred!",
    success: "✅ Success!",
    done: "✅ Done!",
    notFound: "❌ Not found!",
    noUrl: "❌ Please provide a URL!",
    noText: "❌ Please provide text!",
    noMedia: "❌ Please send/reply to media!",
    noQuoted: "❌ Please reply to a message!",
    limitExceeded: "❌ Limit exceeded! Try again later."
};

// Emojis
global.emojis = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    loading: "⏳",
    done: "✅",
    wait: "⏳",
    like: "👍",
    love: "❤️",
    wow: "😮",
    sad: "😢",
    angry: "😠"
};

module.exports = {
    owner,
    botName,
    packname,
    author,
    prefa,
    sessionName,
    prefix,
    mongodb,
    OPENAI_API_KEY,
    GOOGLE_API_KEY,
    DEEPAI_API_KEY,
    autoread,
    autobio,
    autotype,
    autorecord,
    autoreaction,
    anticall,
    antispam,
    antilink,
    antibadword,
    pairing,
    pairingNumber,
    limit,
    messages,
    emojis
};
