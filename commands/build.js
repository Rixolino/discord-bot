const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://betacloud.is-cool.dev';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Search information on a Windows build')
    .addStringOption(option =>
      option
        .setName('numero')
        .setDescription('Build number (e.g.: 22621 or 4.10.1526)')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('all-os')
        .setDescription('Show from all OS (default: no)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const buildNumber = interaction.options.getString('numero');
    const allOs = interaction.options.getBoolean('all-os') || false;

    try {
      // Call the API
      const url = `${API_BASE}/api/public/build-info?build=${buildNumber}&betawiki=true&uupdump=true${allOs ? '&all-os=true' : ''}`;
      
      console.log(`[Discord Bot] Searching build: ${buildNumber}, all-os: ${allOs}`);
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      const data = response.data;

      if (!data.betawiki?.found && (!data.uupdump?.builds || data.uupdump.builds.length === 0)) {
        await interaction.editReply({
          content: `❌ Build **${buildNumber}** not found`
        });
        return;
      }

      const embeds = [];

      // BetaWiki Section
      if (data.betawiki?.found) {
        if (data.betawiki.matches_count > 1) {
          // Multiple results
          embeds.push(
            new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle(`📋 BetaWiki - Build ${buildNumber}`)
              .setDescription(`**${data.betawiki.matches_count}** results found`)
              .addFields(
                ...data.betawiki.matches.map((match, idx) => ({
                  name: `${idx + 1}. ${match.build_page_title}`,
                  value: `OS: ${match.operating_system || 'N/A'}\nCompiled: ${match.compiled || 'N/A'}\nTag: ${match.tags?.confirmed ? '✓' : '❌'} Confirmed`,
                  inline: false
                }))
              )
              .setFooter({ text: `Source: ${data.betawiki.matches[0].source}` })
          );
        } else {
          // Single result
          const match = data.betawiki.matches?.[0] || data.betawiki;
          embeds.push(
            new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle(`📋 BetaWiki - ${match.build_page_title}`)
              .setURL(match.url)
              .addFields(
                { name: 'OS', value: match.operating_system || 'N/A', inline: true },
                { name: 'OS Version', value: match.os_version || 'N/A', inline: true },
                { name: 'Manufacturer', value: match.produced_by || 'Microsoft', inline: true },
                { name: 'Compiled', value: match.compiled || 'N/A', inline: true },
                { name: 'Timebomb', value: match.timebomb || 'N/A', inline: true },
                { name: 'Status', value: match.tags?.confirmed ? '✓ Confirmed' : match.tags?.leaked ? '🔓 Leaked' : '❓ Unknown', inline: true }
              )
              .setFooter({ text: `Source: ${data.betawiki.source || 'BetaWiki'}` })
          );
        }
      }

      // UUP Dump Section
      if (data.uupdump?.builds && data.uupdump.builds.length > 0) {
        const topBuilds = data.uupdump.builds.slice(0, 5);
        embeds.push(
          new EmbedBuilder()
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
            .setFooter({ text: `Visit: https://uupdump.net` })
        );
      }

      await interaction.editReply({ embeds });

    } catch (error) {
      console.error('API Error:', error.message);
      await interaction.editReply({
        content: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    }
  }
};
