const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://betacloud.is-cool.dev';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Search information on a Windows build')
    .addStringOption(option =>
      option
        .setName('number')
        .setDescription('Build number (e.g.: 22621 or 4.10.1526)')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('all-os')
        .setDescription('Show from all OS (default: yes)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // deferReply must not have a timeout, but the API response does.
    // The global search API can take up to 30-40 seconds.
    await interaction.deferReply();

    const buildNumber = interaction.options.getString('number');
    const allOs = interaction.options.getBoolean('all-os') ?? true;

    // If user requests all-os, warn that it might take time
    if (allOs) {
      await interaction.editReply(`🔍 Deep search for **${buildNumber}** in progress... (may take up to 45 seconds)`);
    }

    try {
      // Call the API
      const url = `${API_BASE}/api/public/build-info?build=${buildNumber}&betawiki=true&uupdump=true${allOs ? '&all-os=true' : ''}`;
      
      console.log(`[Discord Bot] Searching build: ${buildNumber}, all-os: ${allOs}`);
      
      const response = await axios.get(url, {
        timeout: 45000 // Aumentato a 45 secondi
      });

      const data = response.data;

      if (!data.betawiki?.found && (!data.uupdump?.builds || data.uupdump.builds.length === 0)) {
        await interaction.editReply({
          content: `❌ Build **${buildNumber}** not found`
        });
        return;
      }

      // Handle Pagination for BetaWiki matches
      let matches = [];
      if (data.betawiki?.found) {
        if (data.betawiki.matches_count > 1) {
          matches = data.betawiki.matches;
        } else {
          matches = [data.betawiki.matches?.[0] || data.betawiki];
        }
      }

      // UUP Dump Embed (static)
      let uupEmbed = null;
      if (data.uupdump?.builds && data.uupdump.builds.length > 0) {
        const topBuilds = data.uupdump.builds.slice(0, 5);
        uupEmbed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle(`📦 UUP Dump - Build ${buildNumber}`)
            .setDescription(`**${data.uupdump.total}** builds available`)
            .addFields({
              name: 'Top 5 Builds',
              value: topBuilds
                .map(b => `• **[${b.build}](https://uupdump.net/selectlang.php?id=${b.uuid})** - ${b.arch} - <t:${b.created}:d>`)
                .join('\n'),
              inline: false
            })
            .setFooter({ text: `Visit: https://uupdump.net` });
      }

      let currentIndex = 0;

      const generateEmbed = (index) => {
          const match = matches[index];
          return new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle(`📋 BetaWiki - ${match.build_page_title} (${index + 1}/${matches.length})`)
              .setURL(match.url)
              .addFields(
                { name: 'OS', value: match.operating_system || 'N/A', inline: true },
                { name: 'OS Version', value: match.os_version || 'N/A', inline: true },
                { name: 'Manufacturer', value: match.produced_by || 'Microsoft', inline: true },
                { name: 'Compiled', value: match.compiled || 'N/A', inline: true },
                { name: 'Timebomb', value: match.timebomb || 'N/A', inline: true },
                { name: 'Status', value: match.tags?.confirmed ? '✓ Confirmed' : match.tags?.leaked ? '🔓 Leaked' : '❓ Unknown', inline: true }
              )
              .setFooter({ text: `Source: ${match.source || data.betawiki?.source || 'BetaWiki'}` });
      };

      const getPayload = (index) => {
          const contentEmbeds = [];
          // Show UUP Dump first so BetaWiki is at the bottom, right above the buttons
          if (uupEmbed) contentEmbeds.push(uupEmbed);
          if (matches.length > 0) contentEmbeds.push(generateEmbed(index));
          
          const components = [];
          if (matches.length > 1) {
              const row = new ActionRowBuilder()
                  .addComponents(
                      new ButtonBuilder()
                          .setCustomId('prev')
                          .setLabel('◀️ Previous')
                          .setStyle(ButtonStyle.Primary)
                          .setDisabled(index === 0),
                      new ButtonBuilder()
                          .setCustomId('next')
                          .setLabel('Next ▶️')
                          .setStyle(ButtonStyle.Primary)
                          .setDisabled(index === matches.length - 1)
                  );
              components.push(row);
          }
          return { content: '', embeds: contentEmbeds, components: components };
      };

      const message = await interaction.editReply(getPayload(currentIndex));

      if (matches.length > 1) {
          const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

          collector.on('collect', async i => {
              if (i.user.id !== interaction.user.id) {
                  return i.reply({ content: 'Only the command user can navigate matches.', ephemeral: true });
              }
              
              if (i.customId === 'prev') {
                  currentIndex = currentIndex > 0 ? currentIndex - 1 : 0;
              } else if (i.customId === 'next') {
                  currentIndex = currentIndex < matches.length - 1 ? currentIndex + 1 : matches.length - 1;
              }
              
              await i.update(getPayload(currentIndex));
          });

          collector.on('end', () => {
              const disabledPayload = getPayload(currentIndex);
              disabledPayload.components.forEach(row => row.components.forEach(btn => btn.setDisabled(true)));
              interaction.editReply({ components: disabledPayload.components }); 
          });
      }

    } catch (error) {
      console.error('API Error:', error.message);
      await interaction.editReply({
        content: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    }
  }
};
