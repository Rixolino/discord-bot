const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ba-database')
        .setDescription('Cerca una release nel database di BetaArchive tramite lo scraper locale.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('La build o sistema operativo da cercare (es. windows 11, beta)')
                .setRequired(true)),
                
    async execute(interaction) {
        const query = interaction.options.getString('query');
        
        // Lo scraper impiega da 10 a 20 secondi per bypassare Cloudflare e caricare la tabella.
        // Dobbiamo usare deferReply() altrimenti l'interazione andrà in timeout dopo 3 secondi!
        await interaction.deferReply();

        try {
            // Puntiamo all'URL pubblico di Localtunnel.
            const apiUrl = `https://barchive.loca.lt/search?q=${encodeURIComponent(query)}`;
            
            // Usiamo un header specifico (Bypass-Tunnel-Reminder) per evitare 
            // la pagina di avviso "am I a robot" di Localtunnel sulle chiamate API
            const response = await fetch(apiUrl, {
                headers: {
                    'Bypass-Tunnel-Reminder': 'true',
                    'User-Agent': 'DiscordBot'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Errore HTTP dallo scraper: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                return interaction.editReply(`❌ Errore durante la ricerca:\n*${data.error}*\nTitolo letto: ${data.pageTitle || 'Sconosciuto'}`);
            }

            if (!data.results || data.results.length === 0) {
                return interaction.editReply(`Nessun risultato trovato nel database per **${query}**.`);
            }

            // Costruiamo gli Embed. Discord supporta un massimo di 10 embeds per messaggio.
            // Limitiamo i risultati mostrati ai primi 5 per non spammare la chat.
            const resultsToShow = data.results.slice(0, 5);
            const embeds = resultsToShow.map((item, index) => {
                return new EmbedBuilder()
                    .setColor(0x3C6076) // Colore a tema BetaArchive
                    .setTitle(item.releaseName || 'Release Sconosciuta')
                    .setURL(item.url || 'https://www.betaarchive.com/database/')
                    .addFields(
                        { name: 'Categoria', value: item.category || 'N/A', inline: true },
                        { name: 'Piattaforma', value: item.platform || 'N/A', inline: true },
                        { name: 'Data', value: item.date || 'N/A', inline: true },
                        { name: 'Dimensione', value: item.size || 'N/A', inline: true },
                        { name: 'Uploader', value: item.uploader || 'N/A', inline: true }
                    )
                    .setFooter({ text: `Risultato ${index + 1} di ${data.results.length}` });
            });

            await interaction.editReply({ 
                content: `✅ Trovati **${data.results.length}** risultati per **${query}**. Ecco i primi ${resultsToShow.length}:`, 
                embeds: embeds 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ Impossibile comunicare con lo scraper API. È in esecuzione sulla porta 3000?\nErrore: \`${error.message}\``);
        }
    },
};
