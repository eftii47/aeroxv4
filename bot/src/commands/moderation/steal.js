import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";

export default {
  name: "steal",
  description: "Steal an emoji from another server",
  usage: "steal <emoji> [name]",
  aliases: ["addemoji", "stealemoji"],
  category: "moderation",
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageGuildExpressions],
  permissions: [PermissionFlagsBits.ManageGuildExpressions],

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please provide an emoji to steal.\n\n**Usage:** \`${this.usage}\``);

      return message.reply({ embeds: [embed] });
    }

    const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
    const match = args[0].match(emojiRegex);

    if (!match) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Emoji`)
        .setDescription("Please provide a valid custom emoji (not a default emoji).");

      return message.reply({ embeds: [embed] });
    }

    const animated = match[1] === 'a';
    const emojiName = args[1] || match[2];
    const emojiId = match[3];
    const extension = animated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

    try {
      const newEmoji = await message.guild.emojis.create({
        attachment: url,
        name: emojiName,
        reason: `Stolen by ${message.author.tag}`,
      });

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("steal")} Emoji Stolen`)
        .setDescription(
          `**Emoji:** ${newEmoji}\n` +
          `**Name:** ${newEmoji.name}\n` +
          `**Animated:** ${animated ? 'Yes' : 'No'}\n` +
          `**Added By:** ${message.author.tag}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Steal Failed`)
        .setDescription(`Failed to steal the emoji: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
