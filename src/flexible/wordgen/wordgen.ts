export type WordgenData = {
    min: number;
    max: number;
    depth: number;
    retryCount: number;
};

export interface WordGenenerator<T> {
    createTable(words: T): void;
    generateWord(): string;
}