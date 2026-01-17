// src/commands/weeklySchedule.js
const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');

/**
 * Shows all events scheduled for the next 7 days
 */
async function handleWeeklySchedule(interaction) {
  try {
    await interaction.deferReply();

    console.log('WeeklySchedule: Command started');
    
    const events = storage.events;
    console.log('WeeklySchedule: Events object type:', typeof events);
    console.log('WeeklySchedule: Events keys:', Object.keys(events || {}));

    const now = Date.now();
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000);

    // Convert events object to array and filter events happening in the next week
    const eventsList = events && typeof events === 'object' ? Object.values(events) : [];
    console.log('WeeklySchedule: Total events:', eventsList.length);
    
    const upcomingEvents = eventsList.filter(event => {
      if (!event || event.cancelled) return false;
      const eventTime = event.datetime;
      return eventTime >= now && eventTime <= oneWeekFromNow;
    });

    console.log('WeeklySchedule: Upcoming events:', upcomingEvents.length);

    // Sort events by time (earliest first)
    upcomingEvents.sort((a, b) => a.datetime - b.datetime);

    // Build the embed
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📅 Weekly Schedule')
      .setDescription(`Events scheduled for the next 7 days`)
      .setTimestamp();

    if (upcomingEvents.length === 0) {
      embed.setDescription('No events scheduled for the next 7 days.');
      embed.setColor('#FF9900');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Group events by day
    const eventsByDay = {};
    
    upcomingEvents.forEach(event => {
      const eventDate = new Date(event.datetime);
      const dayKey = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      eventsByDay[dayKey].push(event);
    });

    // Add fields for each day
    for (const [day, dayEvents] of Object.entries(eventsByDay)) {
      const eventList = dayEvents.map(event => {
        const time = new Date(event.datetime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        // Get signup counts
        const signupCounts = {};
        if (event.signups) {
          for (const [role, users] of Object.entries(event.signups)) {
            signupCounts[role] = users.length;
          }
        }
        
        const signupInfo = Object.entries(signupCounts)
          .map(([role, count]) => `${role}: ${count}`)
          .join(' | ');
        
        return `**${time}** - ${event.shift || 'Shift'}\n${signupInfo || 'No signups yet'}`;
      }).join('\n\n');

      embed.addFields({
        name: day,
        value: eventList,
        inline: false
      });
    }

    embed.setFooter({ text: `Total: ${upcomingEvents.length} event${upcomingEvents.length !== 1 ? 's' : ''}` });

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in weeklySchedule command:', error);
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