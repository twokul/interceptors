export function concatChunkToBuffer(chunk, buffer) {
    if (!Buffer.isBuffer(chunk)) {
        chunk = Buffer.from(chunk);
    }
    return buffer.concat(chunk);
}
//# sourceMappingURL=concatChunkToBuffer.js.map