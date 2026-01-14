module.exports = async function interactionHandler(interaction) {
  // 🔒 Hard safety guard
  if (!interaction) return;

  // Only handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands?.get(interaction.commandName);

  if (!command) {
    return interaction.reply({
      content: '❌ Unknown command.',
      ephemeral: true
    });
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Command ${interaction.commandName} failed:`, err);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: '❌ There was an error executing this command.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ There was an error executing this command.',
        ephemeral: true
      });
    }
  }
};
