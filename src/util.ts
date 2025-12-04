const copySlice = (buf: Buffer, start: number, end: number) => {
    const copied = Uint8Array.prototype.slice.call(buf, start, end);
    return Buffer.from(copied);
}

const repeatArr = <T>(arr: T, count: number) => {
    let result: T[] = [];
    for (let i = 0; i < count; i++) {
        result.push(arr);
    }
    return result;
}


export { copySlice, repeatArr };