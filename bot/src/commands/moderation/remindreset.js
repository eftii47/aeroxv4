import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { db } from "#database/DatabaseManager";
import { config } from "#config/config";
import emoji from "#config/emoji";

export default {
  name: "remindreset",
  description: "Clear all your active reminders",
  usage: "remindreset",
  aliases: ["rreset", "clearreminders"],
  category: "moderation",
  cooldown: 5,

  async execute({ client, message, args }) {
    try {
      const reminders = db.getReminders(message.author.id);
      
      if (reminders.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("info")} No Reminders`)
          .setDescription("You have no active reminders to clear.");

        return message.reply({ embeds: [embed] });
      }

      db.resetReminds(message.author.id);

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("reset")} Reminders Cleared`)
        .setDescription(
          `**Reminders Cleared:** ${reminders.length}\n` +
          `All your active reminders have been deleted.`
        );

      return message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Error`)
        .setDescription(`Failed to clear reminders: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
