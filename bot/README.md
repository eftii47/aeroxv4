# AeroX AIO V3 - Ultimate Discord Bot

AeroX is a feature-rich Discord bot built with **discord.js v14**, featuring advanced hybrid sharding for scalability, high-quality music streaming via Lavalink, and a modular architecture.

[![Support Server](https://img.shields.io/discord/1070267471958614057?color=7289da&label=Support%20Server&logo=discord)](https://discord.gg/aerox)

## 🚀 Features

- **Multi-Platform Music**: Play music from YouTube, Spotify, Apple Music, and SoundCloud.
- **Advanced Sharding**: Powered by `discord-hybrid-sharding` for maximum stability and performance.
- **Persistent Storage**: Uses **Better-SQLite3** for lightning-fast data management.
- **Extensive Command List**: Over 190+ prefix commands and 120+ slash commands.
- **Music Filters**: Enhance your audio with Bassboost, Nightcore, Vaporwave, and more.
- **Module Categories**:
    - 🎵 **Music**: Full playback control, playlists, and 24/7 mode.
    - 🛡️ **Moderation**: Advanced tools like ban, kick, mute, and warn.
    - 🎫 **Tickets**: Comprehensive ticket system for support.
    - 🎉 **Giveaways**: Professional giveaway management.
    - 🎮 **Fun & Utility**: Rank cards, memes, image processing, and more.

## 📁 Project Structure

```text
├── src/
│   ├── commands/       # Categorized bot commands
│   ├── config/         # Configuration files & emoji maps
│   ├── database/       # SQLite managers and repository pattern
│   ├── events/         # Discord, Node, and Lavalink event handlers
│   ├── structures/     # Core classes (Client, Command, etc.)
│   ├── utils/          # Helper functions and registration logic
│   ├── index.js        # Main bot entry point
│   └── shard.js        # Cluster/Sharding manager
├── database/data/      # Persistent .bread database files
├── docsweb/            # Static documentation files
└── LICENSE             # Custom non-commercial license
```

## 🛠️ Requirements

- **Node.js**: v18 or higher
- **Lavalink**: An active Lavalink node for music features
- **Database**: SQLite3 (automatically initialized)

## 📜 License

This project is licensed under a custom agreement. It is free for **personal, non-commercial use**. Redistribution for profit or creating video tutorials/showcases of the source code without permission is strictly prohibited. See [LICENSE](./LICENSE) for full details.

## 🙌 Credits

- **Developers**: Shinchan & **AeroX Development**
- **Base Code**: This project uses [Yukihana](https://github.com/bre4d777/Yukihana) by **bre4d777** as its foundation.

---

### 📞 Support

Join our support server for help and updates: [discord.gg/aerox](https://discord.gg/aerox)
