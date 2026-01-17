const { DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { getEvents } = require('../utils/storage');

// Get the start of the current week (Monday 00:00)
function getWeekStart(now) {
  const dayOfWeek = now.weekday; // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1; // Days since Monday
  return now.minus({ days: daysToSubtract }).startOf('day');
}

async function handleWeeklySchedule(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const events = getEvents(); // ✅ Get live reference
    const now = DateTime.now().setZone(config.timezone);
    const weekStart = getWeekStart(now);
    const weekEnd = weekStart.plus({ days: 7 });

    // Get all events for the next 7 days (both scheduled and posted)
    const upcomingEvents = Object.values(events)
      .filter(event => {
        if (event.cancelled) return false;
        const eventTime = DateTime.fromMillis(event.datetime).setZone(config.timezone);
        return eventTime >= now && eventTime < weekEnd;
      })
      .sort((a, b) => a.datetime - b.datetime);

    if (upcomingEvents.length === 0) {
      const noEventsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📅 Weekly Schedule')
        .setDescription('No events scheduled for the next 7 days.')
        .addFields({
          name: 'ℹ️ Info',
          value: 'Use `/generate` to create a weekly schedule, or `/createevent` to add individual events.',
          inline: false
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [noEventsEmbed] });
    }

    // Group events by day
    const eventsByDay = {};
    upcomingEvents.forEach(event => {
      const eventDate = DateTime.fromMillis(event.datetime).setZone(config.timezone);
      const dayKey = eventDate.toFormat('yyyy-MM-dd');
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      eventsByDay[dayKey].push(event);
    });

    // Build embed
    const embed = new EmbedBuilder()
      .setColor('#00B0F4')
      .setTitle('📅 Weekly Schedule')
      .setDescription(`Showing all events for the next 7 days\n**${weekStart.toFormat('MMM d')}** - **${weekEnd.minus({ days: 1 }).toFormat('MMM d, yyyy')}**`)
      .setTimestamp();

    // Add fields for each day
    Object.keys(eventsByDay).sort().forEach(dayKey => {
      const dayEvents = eventsByDay[dayKey];
      const firstEvent = dayEvents[0];
      const eventDate = DateTime.fromMillis(firstEvent.datetime).setZone(config.timezone);
      
      const eventList = dayEvents.map(event => {
        const dt = DateTime.fromMillis(event.datetime).setZone(config.timezone);
        const time = dt.toFormat('h:mm a');
        
        // Determine status
        let status = '';
        if (event.messageId) {
          status = '✅ Posted'; // Posted to Discord
        } else if (event.scheduled) {
          status = '📅 Scheduled'; // In JSON, not posted yet
        } else {
          status = '❓ Unknown';
        }
        
        // Count signups if posted
        let signupInfo = '';
        if (event.messageId && event.signups) {
          const totalSignups = Object.values(event.signups).reduce((sum, arr) => sum + arr.length, 0);
          signupInfo = ` • ${totalSignups} signup${totalSignups !== 1 ? 's' : ''}`;
        }
        
        // Manual or auto-generated
        const eventType = event.manuallyCreated ? '✏️' : '🤖';
        
        return `${eventType} ${status} • **${event.title}** at ${time}${signupInfo}`;
      }).join('\n');

      embed.addFields({
        name: `${eventDate.toFormat('EEEE, MMMM d')}`,
        value: eventList,
        inline: false
      });
    });

    // Add legend
    embed.addFields({
      name: 'Legend',
      value: '✅ Posted - In Discord with signups active\n📅 Scheduled - Created but not posted yet\n✏️ Manual - Created via `/createevent`\n🤖 Auto - Generated via `/generate`',
      inline: false
    });

    // Add summary
    const scheduledCount = upcomingEvents.filter(e => e.scheduled && !e.messageId).length;
    const postedCount = upcomingEvents.filter(e => e.messageId).length;

    embed.addFields({
      name: '📊 Summary',
      value: `Total Events: **${upcomingEvents.length}**\nScheduled: **${scheduledCount}** • Posted: **${postedCount}**`,
      inline: false
    });

    return await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in weeklyschedule command:', error);
    console.error('Error stack:', error.stack);

    const errorMessage = {
      content: `❌ An error occurred while fetching the weekly schedule.\n\`\`\`${error.message}\`\`\``,
      ephemeral: true
    };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

module.exports = { handleWeeklySchedule };