const config = require('../config.json');

/**
 * Normalize role names for safe comparison
 */
function normalize(str) {
  return str.toLowerCase().trim();
}

/**
 * Determine if a member is allowed to sign up for a role
 */
function canSignup(member, signupRole) {
  if (!member || !signupRole) return false;

  const memberRoles = member.roles.cache.map(r => normalize(r.name));
  const targetRole = normalize(signupRole);

  // Direct role match
  if (memberRoles.includes(targetRole)) {
    return true;
  }

  // Flex signup roles (e.g. Manager → Bartender)
  const flexRoles = config.flexSignupRoles || {};
  for (const [baseRole, allowedRoles] of Object.entries(flexRoles)) {
    if (
      memberRoles.includes(normalize(baseRole)) &&
      allowedRoles.map(normalize).includes(targetRole)
    ) {
      return true;
    }
  }

  return false;
}

module.exports = {
  canSignup
};
