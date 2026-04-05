const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://betacloud.is-cool.dev';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Show the most recent Windows builds')
    .addStringOption(option =>
      option
        .setName('windows')
        .setDescription('Windows version')
        .setRequired(false)
        .addChoices(
          { name: 'Windows 11', value: 'windows-11' },
          { name: 'Windows 10', value: 'windows-10' },
          { name: 'Windows Server 2025', value: 'server-2025' },
          { name: 'Windows Server 2022', value: 'server-2022' },
          { name: 'Windows 8.1', value: 'windows-8.1' },
          { name: 'Windows 8', value: 'windows-8' },
          { name: 'Windows 7', value: 'windows-7' },
          { name: 'Windows Vista', value: 'windows-vista' },
          { name: 'Windows XP', value: 'windows-xp' },
          { name: 'Windows 2000', value: 'windows-2000' },
          { name: 'Windows ME', value: 'windows-me' },
          { name: 'Windows 98', value: 'windows-98' },
          { name: 'Windows 95', value: 'windows-95' },
          { name: 'Windows NT 4.0', value: 'windows-nt-4' }
        )
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const version = interaction.options.getString('windows') || 'windows-11';

    try {
      // Build query map
      const queries = {
        'windows-11': '22',
        'windows-10': '19',
        'server-2025': '26',
        'server-2022': '20',
        'windows-8.1': '6.3',
        'windows-8': '6.2',
        'windows-7': '6.1',
        'windows-vista': '6.0',
        'windows-xp': '5.1',
        'windows-2000': '5.0',
        'windows-me': '4.90',
        'windows-98': '4.10',
        'windows-95': '4.00',
        'windows-nt-4': '4.0'
      };

      const buildPrefix = queries[version];
      // Usiamo il nuovo endpoint /latest/ che chiamerai nel server backend
      const url = `${API_BASE}/api/public/latest/${version}`;
      
      console.log(`[Discord Bot] Searching recent builds for: ${version} (Prefix: ${buildPrefix})`);
      
      const response = await axios.get(url, {
        timeout: 90000 // Impostato a 90 secondi per non andare in timeout
      }).catch(err => {
         console.error(`[API FAIL] GET ${url} fallita:`, err.message);
         throw err;
      });

      const data = response.data;

      // Extract builds from BetaWiki
      let betaWikiBuilds = [];
      if (data.betawiki?.found) {
        if (data.betawiki.matches && Array.isArray(data.betawiki.matches)) {
          betaWikiBuilds = data.betawiki.matches;
        } else {
          betaWikiBuilds = [data.betawiki];
        }
      }

      // Extract builds from UUP Dump
      let uupBuilds = [];
      if (data.uupdump?.builds && Array.isArray(data.uupdump.builds)) {
        uupBuilds = data.uupdump.builds.slice(0, 10);
      }

      // Create embed for BetaWiki
      const embeds = [];

      if (betaWikiBuilds.length > 0) {
        embeds.push(
          new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📋 BetaWiki - ${version.replace(/-/g, ' ').toUpperCase()}`)
            .addFields(
              ...betaWikiBuilds.slice(0, 5).map((build, idx) => ({
                name: `${idx + 1}. ${build.build_page_title}`,
                value: [
                  `**OS:** ${build.operating_system}`,
                  `**Compiled:** ${build.compiled || 'N/A'}`,
                  `**Status:** ${build.tags?.confirmed ? '✓ Confirmed' : build.tags?.leaked ? '🔓 Leaked' : '❓'}`
                ].join('\n'),
                inline: false
              }))
            )
        );
      }

      // Create embed for UUP Dump
      if (uupBuilds.length > 0) {
        const buildList = uupBuilds
          .map(b => {
            const date = new Date(b.created * 1000);
            return `• **[${b.build}](https://uupdump.net/selectlang.php?id=${b.uuid})** (${b.arch}) - ${date.toLocaleDateString('en-US')}`;
          })
          .join('\n');

        embeds.push(
          new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle(`📦 UUP Dump - ${version.replace(/-/g, ' ').toUpperCase()}`)
            .setDescription(`The 10 most recent builds`)
            .addFields({
              name: 'Recent Builds',
              value: buildList,
              inline: false
            })
        );
      }

      if (embeds.length === 0) {
        await interaction.editReply({
          content: `❌ No builds found for ${version}`
        });
        return;
      }

      await interaction.editReply({ embeds });

    } catch (error) {
      console.error('API Error:', error.message);
      let errorMessage = error.response?.data?.error || error.message;
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = "La ricerca globale per questa versione sta richiedendo troppo tempo per via dell'elevato numero di build. Riprova tra qualche minuto!";
      }

      await interaction.editReply({
        content: `❌ Impossibile recuperare le build: ${errorMessage}`
      });
    }
  }
};
