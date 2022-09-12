import { TextDecoder, TextEncoder } from 'web-encoding';
export function encodeBuffer(text) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    return getArrayBuffer(encoded);
}
export function decodeBuffer(buffer, encoding) {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
}
export function getArrayBuffer(array) {
    return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
}
//# sourceMappingURL=bufferUtils.js.map