// Canonical values win even when empty/false. Only absence permits fallback.
function readEnvironment(env, name) {
  if (env[name] !== undefined) return env[name];
  return env[name.replace("SETTLEHEX_", "SETTLEX_")];
}
module.exports = { readEnvironment };
