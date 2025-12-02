function copySlice(buf: Buffer, start: number, end: number) {
    const copied = Uint8Array.prototype.slice.call(buf, start, end);
    return Buffer.from(copied);
}

export { copySlice };