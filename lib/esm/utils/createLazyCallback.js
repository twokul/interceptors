export function createLazyCallback(options = {}) {
    let calledTimes = 0;
    let autoResolveTimeout;
    let remoteResolve;
    const callPromise = new Promise((resolve) => {
        remoteResolve = resolve;
    }).finally(() => {
        clearTimeout(autoResolveTimeout);
    });
    const fn = function (...args) {
        if (options.maxCalls && calledTimes >= options.maxCalls) {
            options.maxCallsCallback?.();
        }
        remoteResolve(args);
        calledTimes++;
    };
    fn.invoked = async () => {
        // Immediately resolve the callback if it hasn't been called already.
        autoResolveTimeout = setTimeout(() => {
            remoteResolve([]);
        }, 0);
        return callPromise;
    };
    return fn;
}
//# sourceMappingURL=createLazyCallback.js.map