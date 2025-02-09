import { Agent } from 'http';
const debug = require('debug')('utils getUrlByRequestOptions');
export const DEFAULT_PATH = '/';
const DEFAULT_PROTOCOL = 'http:';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 80;
const SSL_PORT = 443;
function getAgent(options) {
    return options.agent instanceof Agent ? options.agent : undefined;
}
function getProtocolByRequestOptions(options) {
    if (options.protocol) {
        return options.protocol;
    }
    const agent = getAgent(options);
    const agentProtocol = agent?.protocol;
    if (agentProtocol) {
        return agentProtocol;
    }
    const port = getPortByRequestOptions(options);
    const isSecureRequest = options.cert || port === SSL_PORT;
    return isSecureRequest ? 'https:' : options.uri?.protocol || DEFAULT_PROTOCOL;
}
function getPortByRequestOptions(options) {
    const agent = getAgent(options);
    const agentPort = agent?.options.port ||
        agent?.defaultPort;
    const optionsPort = options.port;
    if (optionsPort || agentPort) {
        const explicitPort = optionsPort || agentPort || DEFAULT_PORT;
        return Number(explicitPort);
    }
}
function getHostByRequestOptions(options) {
    return options.hostname || options.host || DEFAULT_HOST;
}
function getAuthByRequestOptions(options) {
    if (options.auth) {
        const [username, password] = options.auth.split(':');
        return { username, password };
    }
}
/**
 * Creates a `URL` instance from a given `RequestOptions` object.
 */
export function getUrlByRequestOptions(options) {
    debug('request options', options);
    const protocol = getProtocolByRequestOptions(options);
    const host = getHostByRequestOptions(options);
    const port = getPortByRequestOptions(options);
    const path = options.path || DEFAULT_PATH;
    const auth = getAuthByRequestOptions(options);
    debug('protocol', protocol);
    debug('host', host);
    debug('port', port);
    debug('path', path);
    const baseUrl = `${protocol}//${host}`;
    debug('base URL:', baseUrl);
    const url = options.uri ? new URL(options.uri.href) : new URL(path, baseUrl);
    if (port) {
        debug('detected explicit port', port);
        url.port = port.toString();
    }
    if (auth) {
        debug('resolved auth', auth);
        url.username = auth.username;
        url.password = auth.password;
    }
    debug('created URL:', url);
    return url;
}
//# sourceMappingURL=getUrlByRequestOptions.js.map