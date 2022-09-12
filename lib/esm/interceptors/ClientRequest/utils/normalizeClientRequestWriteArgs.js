import { debug } from 'debug';
const log = debug('http normalizeWriteArgs');
export function normalizeClientRequestWriteArgs(args) {
    log('normalizing ClientRequest.write arguments...', args);
    const chunk = args[0];
    const encoding = typeof args[1] === 'string' ? args[1] : undefined;
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    const writeArgs = [
        chunk,
        encoding,
        callback,
    ];
    log('successfully normalized ClientRequest.write arguments:', writeArgs);
    return writeArgs;
}
//# sourceMappingURL=normalizeClientRequestWriteArgs.js.map