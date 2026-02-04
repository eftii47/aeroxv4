import { Command } from "#classes/Command";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { config } from "#config/config";
import emoji from "#config/emoji";

export default {
  name: "unlockall",
  description: "Unlock all channels in the server",
  usage: "unlockall",
  aliases: ["massunlock"],
  category: "moderation",
  cooldown: 30,
  userPermissions: [PermissionFlagsBits.Administrator],
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute({ client, message, args }) {
    try {
      const textChannels = message.guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
      );

      if (textChannels.size === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${emoji.get("info")} No Channels`)
          .setDescription("There are no text channels to unlock.");

        return message.reply({ embeds: [embed] });
      }

      const loadingEmbed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("loading")} Unlocking Channels...`)
        .setDescription(`Unlocking ${textChannels.size} channels. This may take a while...`);

      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

      let unlocked = 0;
      let failed = 0;

      for (const [, channel] of textChannels) {
        try {
          await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: null,
          });
          unlocked++;
        } catch {
          failed++;
        }
      }

      const supportButton = new ButtonBuilder()
        .setLabel("Support")
        .setURL(config.links.supportServer)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportButton);

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("unlock")} All Channels Unlocked`)
        .setDescription(
          `**Unlocked:** ${unlocked} channels\n` +
          `**Failed:** ${failed} channels\n` +
          `**Moderator:** ${message.author.tag}`
        );

      return loadingMsg.edit({ embeds: [embed], components: [row] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${emoji.get("cross")} Unlock All Failed`)
        .setDescription(`Failed to unlock all channels: ${error.message}`);

      return message.reply({ embeds: [embed] });
    }
  },
};
