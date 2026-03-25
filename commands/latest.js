const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://betacloud.is-cool.dev';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latest')
    .setDescription('Mostra i build Windows più recenti')
    .addStringOption(option =>
      option
        .setName('windows')
        .setDescription('Versione Windows')
        .setRequired(false)
        .addChoices(
          { name: 'Windows 11', value: 'windows-11' },
          { name: 'Windows 10', value: 'windows-10' },
          { name: 'Windows Server 2025', value: 'server-2025' },
          { name: 'Windows Server 2022', value: 'server-2022' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const version = interaction.options.getString('windows') || 'windows-11';

    try {
      // Mappe per le query di build
      const queries = {
        'windows-11': '22',
        'windows-10': '19',
        'server-2025': '26',
        'server-2022': '20'
      };

      const buildPrefix = queries[version];
      
      // Chiama l'API con multiple query
      const url = `${API_BASE}/api/public/build-info?build=${buildPrefix}&betawiki=true&uupdump=true&all-os=true`;
      
      console.log(`[Discord Bot] Cercando build recenti per: ${version}`);
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      const data = response.data;

      // Estrai i build da BetaWiki
      let betaWikiBuilds = [];
      if (data.betawiki?.found) {
        if (data.betawiki.matches && Array.isArray(data.betawiki.matches)) {
          betaWikiBuilds = data.betawiki.matches;
        } else {
          betaWikiBuilds = [data.betawiki];
        }
      }

      // Estrai i build da UUP Dump
      let uupBuilds = [];
      if (data.uupdump?.builds && Array.isArray(data.uupdump.builds)) {
        uupBuilds = data.uupdump.builds.slice(0, 10);
      }

      // Crea embed per BetaWiki
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
                  `**Compilato:** ${build.compiled || 'N/A'}`,
                  `**Stato:** ${build.tags?.confirmed ? '✓ Confermato' : build.tags?.leaked ? '🔓 Leaked' : '❓'}`
                ].join('\n'),
                inline: false
              }))
            )
        );
      }

      // Crea embed per UUP Dump
      if (uupBuilds.length > 0) {
        const buildList = uupBuilds
          .map(b => {
            const date = new Date(b.created * 1000);
            return `• **${b.build}** (${b.arch}) - ${date.toLocaleDateString('it-IT')}`;
          })
          .join('\n');

        embeds.push(
          new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle(`📦 UUP Dump - ${version.replace(/-/g, ' ').toUpperCase()}`)
            .setDescription(`I 10 build più recenti`)
            .addFields({
              name: 'Build Recenti',
              value: buildList,
              inline: false
            })
        );
      }

      if (embeds.length === 0) {
        await interaction.editReply({
          content: `❌ Nessun build trovato per ${version}`
        });
        return;
      }

      await interaction.editReply({ embeds });

    } catch (error) {
      console.error('Errore API:', error.message);
      await interaction.editReply({
        content: `❌ Errore: ${error.response?.data?.error || error.message}`
      });
    }
  }
};
