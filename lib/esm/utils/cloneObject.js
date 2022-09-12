const debug = require('debug')('cloneObject');
function isPlainObject(obj) {
    debug('is plain object?', obj);
    if (obj == null || !obj.constructor?.name) {
        debug('given object is undefined, not a plain object...');
        return false;
    }
    debug('checking the object constructor:', obj.constructor.name);
    return obj.constructor.name === 'Object';
}
export function cloneObject(obj) {
    debug('cloning object:', obj);
    const enumerableProperties = Object.entries(obj).reduce((acc, [key, value]) => {
        debug('analyzing key-value pair:', key, value);
        // Recursively clone only plain objects, omitting class instances.
        acc[key] = isPlainObject(value) ? cloneObject(value) : value;
        return acc;
    }, {});
    return isPlainObject(obj)
        ? enumerableProperties
        : Object.assign(Object.getPrototypeOf(obj), enumerableProperties);
}
//# sourceMappingURL=cloneObject.js.map