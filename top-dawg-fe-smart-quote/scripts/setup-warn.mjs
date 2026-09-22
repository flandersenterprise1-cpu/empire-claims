/**
 * Runs only when the build-time database setup failed.
 *
 * It exits 0 on purpose. A failed setup used to fail the whole deploy, which
 * left the previous (often broken) build serving and gave the operator a red
 * cross and a build log to interpret. Deploying anyway is more useful: the
 * site comes up, and GET /api/health names the missing variable or the
 * unreachable host in one line.
 *
 * Nothing unsafe is published by doing this. Carrier data is loaded by setup,
 * so if setup did not run there is no rate data to quote from, and the quoter
 * reports "Rate unavailable" rather than inventing a premium.
 */
console.error('');
console.error('='.repeat(72));
console.error('  DATABASE SETUP DID NOT RUN.');
console.error('');
console.error('  The site will still deploy, but it has no carrier or rate data,');
console.error('  so /quote cannot return premiums yet.');
console.error('');
console.error('  Open /api/health on the deployed site. It names the cause:');
console.error('    "not_configured" -> DATABASE_URL is missing from this project');
console.error('    "unreachable"    -> the value is set but the database refused it');
console.error('    schemaReady false -> connected, but the tables were never created');
console.error('');
console.error('  Fix the setting, then redeploy.');
console.error('='.repeat(72));
console.error('');
