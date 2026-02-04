import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import { config } from "#config/config";
import emoji from "#config/emoji";

export default {
  name: "warnreset",
  description: "Reset warning history for a user",
  usage: "warnreset <user>",
  aliases: ["wreset", "clearwarns"],
  category: "moderation",
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute({ client, message, args }) {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Invalid Usage`)
        .setDescription(`Please mention a user to reset warn history.\n\n**Usage:** \`${this.usage}\``);

      return message.reply({ embeds: [embed] });
    }

    const target = message.mentions.users.first() || 
                   await client.users.fetch(args[0]).catch(() => null);

    if (!target) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} User Not Found`)
        .setDescription("Could not find that user.");

      return message.reply({ embeds: [embed] });
    }

    try {
      const warns = db.getWarns(message.guild.id, target.id);
      
      if (warns.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("info")} No Warnings`)
          .setDescription(`${target.tag} has no warnings to reset.`);

        return message.reply({ embeds: [embed] });
      }

      db.resetWarns(message.guild.id, target.id);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("reset")} Warning History Reset`)
        .setDescription(
          `**User:** ${target.tag}\n` +
          `**Warnings Cleared:** ${warns.length}\n` +
          `**Moderator:** ${message.author.tag}`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Error`)
        .setDescription(`Failed to reset warning history: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
