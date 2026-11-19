import { For, JSX, batch, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";

type Dictionary = {
    words: {
        entry: { form: string; };
        contents: {
            title: string;
            text: string;
        }[];
    }[];
};

type GeneSource = {
    type?: "evliibl";
    affixList?: AffixGeneData[];
    gene: GeneData[];
    genePartValues: string[];
    replaceList?: ReplaceData[];
};

type GeneData = {
    character: string;
    gene: string;
};

type AffixGeneData = {
    type: "prefix" | "suffix" | "infix";
    affix: string;
    genes: string;
};

type ReplaceData = {
    source: string;
    dest: string;
};

type CreatedGene = {
    word: string;
    gene: string;
    message?: string;
}

export type Props = {
    input: string;
    geneSource: GeneSource;
    words: Dictionary["words"];
    output: CreatedGene[];

    transitionTable: Set<string> | null;
    selectedGene: string;
    depth: 2 | 3;
    chars: string;
    validSpells: string[];

    geneFileName: string;
    dictionaryName: string;
};

const MUTATION_VALUE = 2 ** (-7);
const GENE_VALUES = ["0","1","2","3"] as const;

export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        geneSource: createSignal<GeneSource>({
            gene:[],
            genePartValues: [...GENE_VALUES],
        }),
        words: createSignal<Dictionary["words"]>([]),
        output: createSignal<CreatedGene[]>([]),

        transitionTable: createSignal<Set<string> | null>(null),
        selectedGene: createSignal<string>(""),
        depth: createSignal<2 | 3>(3),
        chars: createSignal<string>(""),
        validSpells: createSignal<string[]>([]),

        geneFileName: createSignal<string>(""),
        dictionaryName: createSignal<string>(""),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                geneSource: this.geneSource[0](),
                words: this.words[0](),
                output: this.output[0](),

                transitionTable: this.transitionTable[0](),
                selectedGene: this.selectedGene[0](),
                depth: this.depth[0](),
                chars: this.chars[0](),
                validSpells: this.validSpells[0](),

                geneFileName: this.geneFileName[0](),
                dictionaryName: this.dictionaryName[0](),
            };
        },
    };
}

function WordGene(props: Props & Pick<Methods<Props>, "update">) {
    const displayGeneFilneName = () => {
        return props.geneFileName != null && props.geneFileName !== "" ? props.geneFileName : "未選択"
    };

    const displayDictionaryName = () => {
        return props.dictionaryName != null && props.dictionaryName !== "" ? props.dictionaryName : "未選択"
    };

    const readGeneSource: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        const text = await files[0].text();
        const source: Omit<GeneSource, "genePartValues"> & Partial<Pick<GeneSource, "genePartValues">> = JSON.parse(text);

        batch(() => {
            const newSource: GeneSource = {
                gene: source.gene,
                replaceList: source.replaceList,
                affixList: source.affixList,
                genePartValues: Array.from(GENE_VALUES),
            };

            if (Array.isArray(source.genePartValues) && source.genePartValues.length > 0) {
                newSource.genePartValues = source.genePartValues;
            }

            props.update("geneSource", newSource);
            props.update("geneFileName", files[0].name);
        });
    };

    const readDictionary: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        const dictionary = JSON.parse(await files[0].text()) as Dictionary;
        const words = dictionary.words.filter(x => !(x.entry.form.includes(" ")));

        batch(() => {
            props.update("words", words);
            props.update("dictionaryName", files[0].name);
            props.update("transitionTable", createValidSet(words.map(x => x.entry.form), props.depth, props.geneSource));
        });
    };

    const run: JSX.EventHandlerUnion<HTMLButtonElement, Event> = () => {
        const inputList = props.input.split(" ");

        if (inputList.length > 1) {
            const output = [...props.output, hybridizeGene(props, inputList)];
            props.update("output", output);
        }
        else {
            const output = [...props.output, createGene(props)];
            props.update("output", output);
        }
    };

    const updateDepth: JSX.ChangeEventHandlerUnion<HTMLSelectElement, Event> = (e) => batch(() => {
        const depth = parseInt(e.target.value) as Props["depth"];
        props.update("depth", depth);
        props.update("transitionTable", createValidSet(props.words.map(x => x.entry.form), props.depth, props.geneSource));
    });

    const showValidSpell: JSX.EventHandlerUnion<HTMLButtonElement, Event> = () => {
        if (props.transitionTable == null) {
            return;
        }

        const geneList: string[][] = splitTrim(props.selectedGene, ",").map(x => x.split(" ").filter(y => y !== "").map(y => props.geneSource.gene.find(z => z.gene === y)!.character));
        const charList: [string, string][] = [];
        for (let i = 0; i < geneList[0].length; i++) {
            charList.push([geneList[0][i], geneList[1][i]]);
        }
        
        const prefixList: [string, number][] = [];
        for (let i = 0; i < (1 << props.depth); i++) {
            let prefix =  charList.slice(0, props.depth).reduce((acc, x, j) => acc + x[(i >> (props.depth - j - 1)) & 1], "");
            let startIndex: number = props.depth;
            while (prefix.length < props.depth) {
                prefix += charList[startIndex++][i & 1];
            }

            if (props.transitionTable.has(prefix) && !prefixList.some(x => x[0] === prefix && x[1] === startIndex)) {
                prefixList.push([prefix, startIndex]);
            }
        }

        const spells: string[] = [];
        for (const prefix of prefixList) {
            const backSpells = createValidSpell(props.transitionTable, prefix[0], prefix[1], charList);
            if (backSpells == null) {
                spells.push(prefix[0]);
            }
            else if (backSpells.length > 0) {
                let list = backSpells.map(x => prefix[0] + x);
                if (props.depth === 2) {
                    list = list.filter(x => !/[aeiouöü]{3,}/g.test(x));
                }
                spells.push(...list);
            }
        }

        batch(() => {
            props.update("chars", geneList[0].map(x => x === "" ? "_" : x).join(" ") + ", " + geneList[1].map(x => x === "" ? "_" : x).join(" "));
            props.update("validSpells", spells);
        });
    };

    let geneSourceRef: HTMLInputElement | undefined;
    let dictionaryRef: HTMLInputElement | undefined;

    return (
        <div class="flex flex-col h-full gap-1 p-1 flex-1">
            <div class="flex gap-x-2 items-center">
                <div class="items-center">
                    <InternalButton text="実行" onclick={run} />
                </div>
                <div class="items-center">
                    <input class="flex-auto p-1 border-solid border-2 border-black" type="text" value={props.input} onchange={(event) => props.update("input", event.target.value)}/>
                </div>
                <div class="items-center">
                    <InternalButton text="出力クリア" onclick={() => props.update("output", [])} />
                </div>
            </div>
            <div class="flex gap-2 flex-wrap">
                <div class="flex gap-x-1 text-nowrap items-center">
                    <label class="text-nowrap">遺伝子情報設定：</label>
                    <InternalButton text="読込" onclick={() => geneSourceRef?.click()} />
                    <span class="text-nowrap min-w-37.5 max-w-full overflow-x-hidden text-ellipsis" title={displayGeneFilneName()}>{displayGeneFilneName()}</span>
                    <input class="hidden" type="file" multiple onchange={readGeneSource} ref={geneSourceRef} />
                </div>
                <div class="flex gap-x-1 text-nowrap items-center">
                    <label class="text-nowrap">辞書データ：</label>
                    <InternalButton text="読込" onclick={() => dictionaryRef?.click()} />
                    <span class="text-nowrap min-w-37.5 max-w-full overflow-x-hidden text-ellipsis" title={displayDictionaryName()}>{displayDictionaryName()}</span>
                    <input class="hidden" type="file" multiple onchange={readDictionary} ref={dictionaryRef} />
                </div>
            </div>
            <div class="flex h-full overflow-hidden">
                <div class="flex-1 gap-1 overflow-y-scroll border-2 border-black border-solid">
                    <For each={props.output}>
                        {(item) => (
                            <div class="flex gap-x-2 text-nowwrap">
                                <div class="word flex-none basis-1/4 text-nowrap">{item.word}</div>
                                <div class="gene flex-1 text-nowrap">{item.gene}</div>
                                <div class="mutation flex-1 text-nowrap">{item.message ?? ""}</div>
                            </div>
                        )}
                    </For>
                </div>
                <div class="p-1 flex flex-col flex-1 gap-1 overflow-y-scroll border-2 border-black border-solid">
                    <div class="flex gap-x-2 items-center">
                        <div class="items-center">遺伝子確認</div>
                        <div class="items-center">
                            <InternalButton text="出力" onclick={showValidSpell} />
                        </div>
                        <div class="items-center flex-1">
                            <input type="text" class="w-full border-2 border-black border-solid" value={props.selectedGene} onchange={(e) => props.update("selectedGene", e.target.value)} />
                        </div>
                        <select class="items-center px-1 border-2 border-black border-solid" value={props.depth} onchange={updateDepth}>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                    <div class="flex gap-x-2 items-center">
                        <div class="gap-1 overflow-x-hidden text-nowrap" title={props.chars}>{props.chars}</div>
                    </div>
                    <hr />
                    <div class="flex flex-col gap-y-1 overflow-y-scroll">
                        <For each={props.validSpells}>
                            {(item) => (
                                    <div class="gap-1 text-nowrap" title={item}>{item}</div>
                                )}
                        </For>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InternalButton(props: { text: string, onclick: JSX.ButtonHTMLAttributes<HTMLButtonElement>["onclick"] }) {
    return (
        <button class="text-nowrap flex-none p-1 border-solid border-2 border-black bg-white text-black hover:bg-gray-500 hover:text-white" onclick={props.onclick}>{props.text}</button>
    );
}

function hybridizeGene(props: Props, inputList: string[]): CreatedGene {
    const genes = inputList.map(x => getWordGene(props.words, props.geneSource, x)).filter(x => x !== null);

    if (genes.length === 0) {
        // 全く単語が無い場合にはエラーメッセージを返す
        return {
            gene: "",
            word: "",
            message: `not found words: '${inputList.join("' '")}'`,
        };
    }

    const result: [GeneData["gene"][], GeneData["gene"][]] = [
        [],
        []
    ];
    const mutationMessage: string[] = [];
    
    for (let i = 0; i < genes.length; i++) {
        const gene = genes[i];
        if (gene == null) { continue; }

        const values = gene.split(",", result.length);
        const [value, mutationMessages]: [string[][], string[]] = values.map(x => mutatedGene(x.trim().split(" "), props.geneSource)).reduce<[string[][], string[]]>((acc, x) => {
            acc[0].push(x[0]);
            acc[1].push(...x[1]);
            return acc;
        },[[], []]);

        if (doCointoss()) {
            value.reverse();
        }
        const sliceIndex = clamp(value[0].length / 2 + 1, 0, value[0].length);

        if (i === 0) {
            result[0].push(...value[0].slice(0, sliceIndex));
            result[1].push(...value[1].slice(-sliceIndex));
        }
        else {
            result[0].push(...value[0].slice(-sliceIndex));
            result[1].unshift(...value[1].slice(0, sliceIndex));
        }

        if (mutationMessages.length > 0) {
            mutationMessage.push(...mutationMessages);
        }
    }

    return {
        word: result.map(x => x.map(y => {
            const c = props.geneSource.gene.find(z => z.gene === y)!.character;
            return c === "" ? "_" : c;
        }).join("")).join(", "),
        gene: result.map(x => x.join(" ")).join(", "),
        message: mutationMessage.length > 0 ? mutationMessage.join(",") : undefined,
    }
}

function getWordGene(words: Dictionary["words"], source: GeneSource, input: string): string | null {
    if (source.affixList && /(\[.+\]|-)/.test(input)) {
        const splitWord = input.split("-");
        const gene = ["", ""];
        let isSuffix = false;

        for (let i = 0; i < splitWord.length; i++) {
            let word = splitWord[i];
            const infixPart = isSuffix ? undefined : /\[.+\]/.exec(word)?.[0];
            let infix: [string[], string, string] | null = null;

            if (infixPart) {
                word = word.replaceAll(infixPart, "");
                const infixWord = infixPart.substring(1, infixPart.length - 1);
                const infixGene = splitTrim(source.affixList.find(x => x.type === "infix" && x.affix === infixWord)?.genes, ",");

                if (infixGene) {
                    const subset = toChars(splitWord[i].substring(0, splitWord[i].indexOf(infixPart)), source);
                    infix = [subset, infixGene[0], infixGene[1]];
                }
            }

            const wordGene = splitTrim(words.find(x => x.entry.form === word)?.contents?.find(x => x.title === "単語遺伝子")?.text, ",");
            if (wordGene) {
                if (infix) {
                    let wordGeneParts = wordGene.map(x => x.split(" "));
                    let subsetIndex = 0;
                    let insertIndex = 0;
                    const subset = infix[0];

                    while (insertIndex < wordGeneParts[0].length && subsetIndex < subset.length) {
                        const geneParts = source.gene.filter(x => x.character === subset[subsetIndex]);
                        if (geneParts.some(x => wordGeneParts[0][subsetIndex] === x.gene || wordGeneParts[1][subsetIndex] === x.gene)) {
                            subsetIndex++;
                        }
                        insertIndex++;
                    }
                    wordGeneParts[0].splice(insertIndex, 0, ...splitTrim(infix[1], " "));
                    wordGeneParts[1].splice(insertIndex, 0, ...splitTrim(infix[2], " "));

                    gene[0] += " " + wordGeneParts[0].join(" ");
                    gene[1] += " " + wordGeneParts[1].join(" ");
                }
                else {
                    gene[0] += " " + wordGene[0];
                    gene[1] += " " + wordGene[1];
                }

                isSuffix = true;
            }
            else {
                const type = isSuffix ? "suffix" : "prefix";
                const affixGene = splitTrim(source.affixList.find(x => x.type === type && x.affix === word)?.genes, ",");

                if (affixGene) {
                    gene[0] += " " + affixGene[0];
                    gene[1] += " " + affixGene[1];
                }
            }
        }

        return gene.map(x => x.trim()).join(",");
    }
    else {
        let gene = words.find(x => x.entry.form === input)?.contents?.find(x => x.title === "単語遺伝子")?.text;

        return gene ?? null;
    }
}

function splitTrim(genes: string, separator: string): string[];
function splitTrim(genes: string | undefined | null, separator: string): string[] | undefined;
function splitTrim(genes: string | undefined | null, separator: string): string[] | undefined {
    return genes?.split(separator)?.map(x => x.trim());
}

function createGene(props: Props): CreatedGene {
    if (props.geneSource.affixList && /(\[.+\]|-)/.test(props.input)) {

        const splitWord = props.input.split("-");
        let prefix: [string, string] | null = null;
        let suffix: [string, string] | null = null;
        let infix: [string[], string, string] | null = null;
        let isSuffix = false;
        const geneValue = ["", ""];

        for (let i = 0; i < splitWord.length; i++) {
            let word = splitWord[i];
            const infixPart = isSuffix ? undefined : /\[.+\]/.exec(word)?.[0];

            if (infixPart) {
                word = word.replaceAll(infixPart, "");
                const infixWord = infixPart.substring(1, infixPart.length - 1);
                const infixGene = splitTrim(props.geneSource.affixList.find(x => x.type === "infix" && x.affix === infixWord)?.genes, ",");

                if (infixGene) {
                    const subset = toChars(splitWord[i].substring(0, splitWord[i].indexOf(infixPart)), props.geneSource);
                    infix = [subset, infixGene[0], infixGene[1]];
                }
            }

            const wordGene = splitTrim(props.words.find(x => x.entry.form === word)?.contents?.find(x => x.title === "単語遺伝子")?.text, ",");
            if (wordGene) {
                if (infix) {
                    let wordGeneParts = wordGene.map(x => x.split(" "));
                    let subsetIndex = 0;
                    let insertIndex = 0;
                    const subset = infix[0];

                    while (insertIndex < wordGeneParts[0].length && subsetIndex < subset.length) {
                        const geneParts = props.geneSource.gene.filter(x => x.character === subset[subsetIndex]);
                        if (geneParts.some(x => wordGeneParts[0][subsetIndex] === x.gene || wordGeneParts[1][subsetIndex] === x.gene)) {
                            subsetIndex++;
                        }
                        insertIndex++;
                    }
                    wordGeneParts[0].splice(insertIndex, 0, ...splitTrim(infix[1], " "));
                    wordGeneParts[1].splice(insertIndex, 0, ...splitTrim(infix[2], " "));

                    geneValue[0] += " " + wordGeneParts[0].join(" ");
                    geneValue[1] += " " + wordGeneParts[1].join(" ");
                }
                else {
                    geneValue[0] += " " + wordGene[0];
                    geneValue[1] += " " + wordGene[1];
                }

                isSuffix = true;
            }
            else if (isSuffix) {
                const suffixGene = props.geneSource.affixList.find(x => x.type === "suffix" && x.affix === word)?.genes;
                if (suffixGene) {
                    if (suffix === null) {
                        suffix = ["", ""];
                    }

                    suffix[0] += " " + suffixGene[0];
                    suffix[1] += " " + suffixGene[1];
                }
            }
            else {
                const prefixGene = splitTrim(props.geneSource.affixList.find(x => x.type === "prefix" && x.affix === word)?.genes, ",");
                if (prefixGene) {
                    if (prefix === null) {
                        prefix = ["", ""];
                    }

                    prefix[0] += " " + prefixGene[0];
                    prefix[1] += " " + prefixGene[1];
                }
            }
        }

        if (prefix) {
            geneValue[0] = prefix[0] + " " + geneValue[0];
            geneValue[1] = prefix[1] + " " + geneValue[1];
        }
        if (suffix) {
            geneValue[0] += " " + suffix[0];
            geneValue[1] += " " + suffix[1];
        }

        return {
            word: props.input,
            gene: geneValue.map(x => x.trim()).join(", "),
        };
    }
    else {
        let inputGeneValue: string[] = toChars(props.input, props.geneSource).map(x => toGeneValue(props.geneSource, x));
    
        if (isSuccess(MUTATION_VALUE / 4)) {
            const insertIndex = getRandomIndex(inputGeneValue.length);
            inputGeneValue.splice(insertIndex, 0, toGeneValue(props.geneSource, ""));
        }
    
        
        let geneValues: [string[], string[]] = [
            inputGeneValue,
            inputGeneValue.map(x => {
                const none = isSuccess(0.25) ? "000" : toGeneValue(props.geneSource, "");
                return Array.from(x).map((y, i) => Number.parseInt(y) ^ Number.parseInt(none[i])).join("");
            }),
        ];

        const geneValue = geneValues.map(x => x.join(" "));
        return {
            word: props.input,
            gene: geneValue.map(x => x.trim()).join(", "),
        };
    }
}

function toGeneValue(geneSource: GeneSource, str: string): GeneData["gene"] {
    const list = geneSource.gene.filter(x => x.character === str);
    const index = getRandomIndex(list.length);
    return list[index].gene;
}

function toChars(input: string, geneSource: GeneSource): string[] {
    const replaceList = geneSource.replaceList;
    if (replaceList == null) {
        return Array.from(input);
    }
    
    const replaceRegexp = new RegExp(`[${replaceList.map(x => x.source).join("")}]`, "gi");
    return Array.from(input.replaceAll(replaceRegexp, x => replaceList.find(y => y.source === x)?.dest ?? x));
}

function mutatedGenePart(part: string, geneSource: GeneSource): [string, string | undefined] {
    let newValue = part;
    const mutation = [];

    if (isSuccess(MUTATION_VALUE / 4)) {
        // 値変更
        const index = getRandomIndex(newValue.length);
        const swapValues = geneSource.genePartValues.filter(x => x !== newValue[index]);

        const swapIndex = getRandomIndex(swapValues.length);
        if (index === 0) {
            newValue = swapValues[swapIndex] + newValue.slice(1);
        }
        else if (index === newValue.length - 1) {
            newValue = newValue.slice(0, index) + swapValues[swapIndex];
        }
        else {
            newValue = newValue.slice(0, index) + swapValues[swapIndex] + newValue.slice(index + 1);
        }

        mutation.push("change gene part");
    }

    if (newValue.length >= 2 && isSuccess(MUTATION_VALUE / 4)) {
        // 位置交換
        const index = getRandomIndex(newValue.length);

        if (index === 0) {
            newValue = newValue[1] + newValue[0] + newValue.slice(2);
        }
        else if (index === newValue.length - 1) {
            newValue = newValue.slice(0, index - 1) + newValue[index - 1] + newValue[index];
        }
        else {
            if (doCointoss()) {
                newValue = newValue.slice(0, index) + newValue[index + 1] + newValue[index] + newValue.slice(index + 2);
            }
            else {
                newValue = newValue.slice(0, index - 1) + newValue[index] + newValue[index - 1] + newValue.slice(index + 1);
            }
        }

        mutation.push("swap gene part");
    }

    return [newValue, mutation.length > 0 ? mutation.join(", ") : undefined];
}

function mutatedGene(gene: string[], geneSource: GeneSource): [string[], string[]] {
    const newValue: [string[], string[]] = gene.reduce<[string[], string[]]>((acc, x, index) => {
        const part = mutatedGenePart(x, geneSource);

        acc[0].push(part[0]);
        if (typeof part[1] === "string") {
            acc[1].push(`(${part[1]}: ${index})`);
        }
        return acc;
    }, [[], []]);

    if (isSuccess(MUTATION_VALUE)) {
        // 重複
        const index = getRandomIndex(newValue.length);
        newValue[0].splice(index, 0, newValue[0][index]);

        newValue[1].push("duplicate gene");
    }
    else if (isSuccess(MUTATION_VALUE)) {
        // 欠損
        const index = getRandomIndex(newValue.length);
        newValue[0].splice(index, 1);

        newValue[1].push("remove gene");
    }

    if (isSuccess(MUTATION_VALUE)) {
        // 逆転
        const index = getRandomIndex(newValue.length);
        newValue[0][index] = Array.from(newValue[0][index]).reverse().join("");

        newValue[1].push("reverse gene part");
    }

    if (newValue[0].length >= 2 && isSuccess(MUTATION_VALUE / 4)) {
        // 位置交換
        const partGene = newValue[0];
        const index = getRandomIndex(partGene.length);

        if (index === 0) {
            const tmp = partGene[0];
            partGene[0] = partGene[1];
            partGene[1] = tmp;
        }
        else if (index === partGene.length - 1) {
            const tmp = partGene[index];
            partGene[index] = partGene[index - 1];
            partGene[index - 1] = tmp;
        }
        else {
            if (doCointoss()) {
                const tmp = partGene[index];
                partGene[index] = partGene[index - 1];
                partGene[index - 1] = tmp;
            }
            else {
                const tmp = partGene[index];
                partGene[index] = partGene[index + 1];
                partGene[index + 1] = tmp;
            }
        }

        newValue[1].push("swap gene");
    }

    return newValue;
}

function createValidSpell(table: Set<string>, prefix: string, index: number, charList: [string, string][]): string[] | null {
    if (index >= charList.length) {
        return null;
    }

    const spells: string[] = [];
    const targetChars = charList[index][0] === charList[index][1] ? [charList[index][0]] : charList[index];
    const vowels = {
        "a": true,
        "e": true,
        "ö": true,
    };
    for (const c of Array.from(prefix)) {
        switch(c) {
            case "a":
                vowels["ö"] = false;
                break;
            case "o":
            case "u":
                vowels["e"] = false;
                vowels["ö"] = false;
                break;
            case "ö":
            case "ü":
                vowels["a"] = false;
                break;
        }
    }

    for(const char of targetChars) {
        const str = char === "" ? prefix : prefix.substring(1) + char;
        if (table.has(str)) {
            const backSpells = createValidSpell(table, str, index + 1, charList);

            if (backSpells == null) {
                spells.push(char);
            }
            else if (backSpells.length > 0) {
                for (const backSpell of backSpells) {
                    const nextVowels = structuredClone(vowels);
                    for (const c of Array.from(backSpell)) {
                        switch(c) {
                            case "a":
                                nextVowels["ö"] &&= false;
                                break;
                            case "o":
                            case "u":
                                nextVowels["e"] &&= false;
                                nextVowels["ö"] &&= false;
                                break;
                            case "ö":
                            case "ü":
                                nextVowels["a"] &&= false;
                                break;
                        }
                    }

                    if (nextVowels["a"] || nextVowels["e"] || nextVowels["ö"]) {
                        spells.push(char + backSpell);
                    }
                }
            }
        }
    }

    return spells;
}

function createValidSet(words: string[], depth: number, geneSource: GeneSource): Set<string> {
    const table = new Set<string>();
    let deconstructedWords: string[];
    const replaceList = geneSource.replaceList;

    if (replaceList != null) {
        const replaceRegexp = new RegExp(`[${replaceList.map(x => x.source).join("")}]`, "gi");
        deconstructedWords = words.map(x => x.replaceAll(replaceRegexp, x => replaceList.find(y => y.source === x)?.dest ?? x))
    }
    else {
        deconstructedWords = words;
    }

    for (const input of deconstructedWords) {
        for (let i = 0; i <= input.length - depth + 1; i++) {
            const value = input.slice(i, i + depth);
            if (!table.has(value)) {
                table.add(value);
            }
        }
    }

    return table;
}

function doCointoss(): boolean {
    return isSuccess(0.5);
}

function isSuccess(value: number, compare: "less" | "greater" = "less") {
    if (compare === "greater") {
        return Math.random() > value;
    }
    else {
        return Math.random() < value;
    }
}

function getRandomIndex(length: number): number {
    return Math.floor(Math.random() * length);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

export default WordGene;