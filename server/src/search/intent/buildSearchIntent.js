const { resolveVoiceIntent } = require("./llmIntentResolver");

async function buildSearchIntent(text, options = {}) {
  return resolveVoiceIntent(text, options);
}

module.exports = {
  buildSearchIntent,
};
