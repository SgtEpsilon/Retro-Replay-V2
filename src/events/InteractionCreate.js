const { client } = require('../client');
const createEventHandler = require('../commands/createEvent');
const mySignupsHandler = require('../commands/mySignups');
const nextShiftHandler = require('../commands/nextShift');
const areWeOpenHandler = require('../commands/areWeOpen');
const cancelEventHandler = require('../commands/cancelEvent');
const editEventTimeHandler = require('../commands/editEventTime');
const setStatusHandler = require('../commands/setStatus');
const statusClearHandler = require('../commands/statusClear');
const blackoutHandlers = require('../commands/blackout');
const roleHandlers = require('../commands/roleManagement');
const helpHandler = require('../commands/help');
const refreshHandler = require('../commands/refresh');
const repostHandler = require('../commands/repost');
const weeklyScheduleHandler = require('../commands/weeklySchedule');
const generateHandler = require('../commands/generate');
const postHandler = require('../commands/post');

client.on('interactionCreate', async i => {
  try {
    // Handle create event modal
    if (i.isChatInputCommand() && i.commandName === 'createevent') {
      return await createEventHandler.showModal(i);
    }

    if (i.isModalSubmit() && i.customId === 'createEventModal') {
      return await createEventHandler.handleSubmit(i);
    }

    if (!i.isChatInputCommand()) return;

    // Route commands to handlers
    switch (i.commandName) {
      case 'mysignups':
        return await mySignupsHandler(i);
      case 'nextshift':
        return await nextShiftHandler(i);
      case 'areweopen':
        return await areWeOpenHandler(i);
      case 'cancelevent':
        return await cancelEventHandler(i);
      case 'editeventtime':
        return await editEventTimeHandler(i);
      case 'setstatus':
        return await setStatusHandler(i);
      case 'statusclear':
        return await statusClearHandler(i);
      case 'addblackout':
        return await blackoutHandlers.add(i);
      case 'removeblackout':
        return await blackoutHandlers.remove(i);
      case 'listblackouts':
        return await blackoutHandlers.list(i);
      case 'enable':
        return await roleHandlers.enable(i);
      case 'disable':
        return await roleHandlers.disable(i);
      case 'help':
        return await helpHandler(i);
      case 'refresh':
        return await refreshHandler(i);
      case 'repost':
        return await repostHandler(i);
      case 'weeklyschedule':
        return await weeklyScheduleHandler.handleWeeklySchedule(i);
      case 'generate':
        return await generateHandler(i);
      case 'post':
        return await postHandler(i);;
    }

  } catch (err) {
    console.error(`❌ Error handling command ${i.commandName}:`, err);
    
    try {
      const errorMsg = { content: '❌ An error occurred processing your command.', ephemeral: true };
      if (i.replied || i.deferred) {
        await i.followUp(errorMsg);
      } else {
        await i.reply(errorMsg);
      }
    } catch (replyErr) {
      console.error('❌ Could not send error message:', replyErr.message);
    }
  }
});