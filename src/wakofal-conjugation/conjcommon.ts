
export type ConjugationType<T extends string> = {
    type: T;
    affix: Map<VowelType, Readonly<ConjugationData>>;
}

export type ConjugationData = Record<"prefix" | "suffix", Readonly<ConjugationPattern>>;

export type ConjugationPattern = {
    append: string;
    value: string;
};

export enum VowelType {
    Dark,
    Light,
    Neutral,
}

const useCompactMap = new Map([
    ["b", ["b", "d", "s", "x"]],
    ["c", ["c", "f", "k", "l", "m", "n", "p", "s", "t", "v"]],
    ["d", ["b", "d", "l", "n", "v", "z"]],
    ["f", ["c", "f", "l", "s", "t"]],
    ["g", ["b", "d", "l", "n", "s", "v", "x"]],
    ["k", ["c", "f", "k", "l", "m", "s", "t", "v", "x"]],
    ["l", ["b", "c", "d", "f", "k", "l", "m", "n", "p", "s", "t", "v", "x"]],
    ["m", ["b", "c", "m", "p", "s", "t", "x"]],
    ["n", ["c", "d", "l", "n", "s", "t", "x"]],
    ["p", ["k", "c", "l", "p", "s", "t", "x"]],
    ["r", ["c", "d", "f", "n", "s", "t", "v", "x"]],
    ["s", ["c", "f", "k", "l", "m", "n", "p", "s", "t", "v"]],
    ["t", ["c", "f", "l", "s", "t", "v"]],
    ["v", ["d", "l", "v"]],
    ["x", ["c", "f", "k", "l", "m", "n", "p", "t", "v", "x"]],
    ["z", ["b", "d", "l", "m", "v"]],
]);

export function createPrefixData(prefix: string, prefixAppendVowel: string): Readonly<ConjugationData> {
    return createCircumfixData({ value: prefix, append: prefixAppendVowel }, null);
}

export function createSuffixData(suffixAppendVowel: string, suffix: string): Readonly<ConjugationData> {
    return createCircumfixData(null, { append: suffixAppendVowel, value: suffix });
}

export function createCircumfixData(prefix: ConjugationPattern | null, suffix: ConjugationPattern | null): Readonly<ConjugationData> {
    return {
        prefix: prefix ?? EMPTY_PATTERN,
        suffix: suffix ?? EMPTY_PATTERN,
    };
}

export function createEmptyData(): Readonly<ConjugationData> {
    return EMPTY_DATA;
}

const EMPTY_PATTERN: Readonly<ConjugationPattern> = { append: "", value: "" };
const EMPTY_DATA: Readonly<ConjugationData> = { prefix: EMPTY_PATTERN, suffix: EMPTY_PATTERN };

export function createTypes<T extends string>(type: T, affix: [ConjugationData, ConjugationData, ConjugationData]): ConjugationType<T> {
    return {
        type,
        affix: new Map([
            [VowelType.Dark, affix[0]],
            [VowelType.Light, affix[1]],
            [VowelType.Neutral, affix[2]],
        ]),
    };
}

export function getVowelType(input: string): VowelType {
    const charArray = Array.from(input);

    for (const c of charArray) {
        if (c === "o" || c === "u") { return VowelType.Dark; }
        else if (c === "e" || c === "i") { return VowelType.Light; }
    }

    return VowelType.Neutral;
}

export function changeBrightness(input: string): string {
    return input.replace(/[eiou]/g, x => {
        switch (x) {
            case "e": return "u";
            case "i": return "o";
            case "o": return "i";
            case "u": return "e";
            default: return x;
        }
    });
}

export function noCompactSuffix(input: string, pattern: ConjugationData): boolean {
    const vowelType = getVowelType(input);

    if (vowelType !== VowelType.Light) {
        const match = input.match(/(.?)([aou])r[bcdfghjklmnprstwvxz]$/);
        if (match && match[1] !== match[2]) {
            return !(useCompactMap.get(input[input.length - 1])?.some(x => pattern.suffix.value.startsWith(x)) ?? false);
        }
    }

    if (/[bcdfghjklmnprstwvxz]$/.test(input) && /^[bcdfghjklmnprstwvxz]{2}/.test(pattern.suffix.value)) {
        return true;
    }
    else if (/[bcdfghjklmnprstwvxz]{2}$/.test(input) && /^[bcdfghjklmnprstwvxz]/.test(pattern.suffix.value)) {
        return true;
    }
    else {
        return !(useCompactMap.get(input[input.length - 1])?.some(x => pattern.suffix.value.startsWith(x)) ?? false);
    }
}