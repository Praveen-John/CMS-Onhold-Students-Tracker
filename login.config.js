/**
 * LOGIN CONFIGURATION
 *
 * Use this file to easily switch between different login methods.
 *
 * Options:
 * - 'oauth': Google OAuth 2.0 authentication (recommended for production)
 * - 'simple': Simple email-based login (for testing/development)
 *
 * To switch login methods, change the LOGIN_TYPE value below.
 */

const LOGIN_TYPE = 'oauth'; // Change to 'simple' for email-only login , Change to 'oauth' for easy login

export default LOGIN_TYPE;
