const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ba-database')
        .setDescription('Search for a release in the BetaArchive database via the local scraper.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The build or operating system to search for (e.g., windows 11, beta)')
                .setRequired(true)),
                
    async execute(interaction) {
        const query = interaction.options.getString('query');
        
        // The scraper takes 10-20 seconds to bypass Cloudflare and load the table.
        // We must use deferReply() otherwise the interaction will time out after 3 seconds!
        await interaction.deferReply();

        try {
            // Point to the public Localtunnel URL.
            const apiUrl = `https://barchive.loca.lt/search?q=${encodeURIComponent(query)}`;
            
            // We use a specific header (Bypass-Tunnel-Reminder) to bypass
            // the "am I a robot" warning page from Localtunnel on API calls
            const response = await fetch(apiUrl, {
                headers: {
                    'Bypass-Tunnel-Reminder': 'true',
                    'User-Agent': 'DiscordBot'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error from scraper: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                return interaction.editReply(`❌ Error during search:\n*${data.error}*\nPage Title read: ${data.pageTitle || 'Unknown'}`);
            }

            if (!data.results || data.results.length === 0) {
                return interaction.editReply(`No results found in the database for **${query}**.`);
            }

            // Build the Embeds. Discord supports a maximum of 10 embeds per message.
            // We limit the results shown to the first 5 to not spam the chat.
            const resultsToShow = data.results.slice(0, 5);
            const embeds = resultsToShow.map((item, index) => {
                return new EmbedBuilder()
                    .setColor(0x3C6076) // BetaArchive theme color
                    .setTitle(item.releaseName || 'Unknown Release')
                    .setURL(item.url || 'https://www.betaarchive.com/database/')
                    .addFields(
                        { name: 'Category', value: item.category || 'N/A', inline: true },
                        { name: 'Platform', value: item.platform || 'N/A', inline: true },
                        { name: 'Date', value: item.date || 'N/A', inline: true },
                        { name: 'Size', value: item.size || 'N/A', inline: true },
                        { name: 'Uploader', value: item.uploader || 'N/A', inline: true }
                    )
                    .setFooter({ text: `Result ${index + 1} of ${data.results.length}` });
            });

            await interaction.editReply({ 
                content: `✅ Found **${data.results.length}** results for **${query}**. Here are the first ${resultsToShow.length}:`, 
                embeds: embeds 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ Unable to communicate with the scraper API. Make sure the proxy is running.\nError: \`${error.message}\``);
        }
    },
};
