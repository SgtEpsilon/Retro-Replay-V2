const config = require('../config.json');

function hasEventPermission(member) {
  if (!member) return false;
  return member.roles.cache.some(r =>
    config.eventCreatorRoles.map(x => x.toLowerCase()).includes(r.name.toLowerCase())
  );
}

module.exports = { hasEventPermission };
