export const API_ROOT = 'http://localhost:3000';

/**
 * Get a fully qualified route for an API request
 */
export const getApiRoute = (relativeUrl) => {
    return API_ROOT + relativeUrl;
}