const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://betacloud.is-cool.dev';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Cerca informazioni su un build Windows')
    .addStringOption(option =>
      option
        .setName('numero')
        .setDescription('Numero build (es: 22621 o 4.10.1526)')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('all-os')
        .setDescription('Mostra da tutti gli OS (default: no)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const buildNumber = interaction.options.getString('numero');
    const allOs = interaction.options.getBoolean('all-os') || false;

    try {
      // Chiama l'API
      const url = `${API_BASE}/api/public/build-info?build=${buildNumber}&betawiki=true&uupdump=true${allOs ? '&all-os=true' : ''}`;
      
      console.log(`[Discord Bot] Cercando build: ${buildNumber}, all-os: ${allOs}`);
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      const data = response.data;

      if (!data.betawiki?.found && (!data.uupdump?.builds || data.uupdump.builds.length === 0)) {
        await interaction.editReply({
          content: `❌ Build **${buildNumber}** non trovato`
        });
        return;
      }

      const embeds = [];

      // Sezione BetaWiki
      if (data.betawiki?.found) {
        if (data.betawiki.matches_count > 1) {
          // Multipli risultati
          embeds.push(
            new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle(`📋 BetaWiki - Build ${buildNumber}`)
              .setDescription(`**${data.betawiki.matches_count}** risultati trovati`)
              .addFields(
                ...data.betawiki.matches.map((match, idx) => ({
                  name: `${idx + 1}. ${match.build_page_title}`,
                  value: `OS: ${match.operating_system || 'N/A'}\nCompilato: ${match.compiled || 'N/A'}\nTag: ${match.tags?.confirmed ? '✓' : '❌'} Confermato`,
                  inline: false
                }))
              )
              .setFooter({ text: `Fonte: ${data.betawiki.matches[0].source}` })
          );
        } else {
          // Un risultato
          const match = data.betawiki.matches?.[0] || data.betawiki;
          embeds.push(
            new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle(`📋 BetaWiki - ${match.build_page_title}`)
              .setURL(match.url)
              .addFields(
                { name: 'OS', value: match.operating_system || 'N/A', inline: true },
                { name: 'Versione OS', value: match.os_version || 'N/A', inline: true },
                { name: 'Produttore', value: match.produced_by || 'Microsoft', inline: true },
                { name: 'Compilato', value: match.compiled || 'N/A', inline: true },
                { name: 'Timebomb', value: match.timebomb || 'N/A', inline: true },
                { name: 'Stato', value: match.tags?.confirmed ? '✓ Confermato' : match.tags?.leaked ? '🔓 Leaked' : '❓ Sconosciuto', inline: true }
              )
              .setFooter({ text: `Fonte: ${data.betawiki.source || 'BetaWiki'}` })
          );
        }
      }

      // Sezione UUP Dump
      if (data.uupdump?.builds && data.uupdump.builds.length > 0) {
        const topBuilds = data.uupdump.builds.slice(0, 5);
        embeds.push(
          new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle(`📦 UUP Dump - Build ${buildNumber}`)
            .setDescription(`**${data.uupdump.total}** build disponibili`)
            .addFields({
              name: 'Top 5 Build',
              value: topBuilds
                .map(b => `• **${b.build}** - ${b.arch} - <t:${b.created}:d>`)
                .join('\n'),
              inline: false
            })
            .setFooter({ text: `Visita: https://uupdump.net` })
        );
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
