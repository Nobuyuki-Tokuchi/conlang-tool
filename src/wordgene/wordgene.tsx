import { For, JSX, batch, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";
import "./wordgene.css";

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
    affixList?: AffixGeneData[];
    gene: GeneData[];
    genePartValues: string[];
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

    let geneSourceRef: HTMLInputElement | undefined;
    let dictionaryRef: HTMLInputElement | undefined;

    return (
        <div id="wordgene" class="main">
            <div class="row">
                <div class="align-center">
                    <button class="text-nowrap" onclick={run}>実行</button>
                </div>
                <div class="align-center">
                    <input type="text" value={props.input} onchange={(event) => props.update("input", event.target.value)}/>
                </div>
                <div class="align-center">
                    <button class="text-nowrap" onclick={() => props.update("output", [])}>出力クリア</button>
                </div>
            </div>
            <div class="row row-wrap">
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">遺伝子データ：</label>
                    <button onclick={() => geneSourceRef?.click()}>読込</button>
                    <span class="text-nowrap file-name" title={displayGeneFilneName()}>{displayGeneFilneName()}</span>
                    <input type="file" multiple onchange={readGeneSource} style="display: none" ref={geneSourceRef} />
                </div>
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">辞書データ：</label>
                    <button onclick={() => dictionaryRef?.click()}>読込</button>
                    <span class="text-nowrap file-name" title={displayDictionaryName()}>{displayDictionaryName()}</span>
                    <input type="file" multiple onchange={readDictionary} style="display: none" ref={dictionaryRef} />
                </div>
            </div>
            <div class="row result-area">
                <div class="output">
                    <For each={props.output}>
                        {(item) => (
                            <div class="row text-nowwrap">
                                <div class="character text-nowrap">{item.word}</div>
                                <div class="gene text-nowrap">{item.gene}</div>
                                <div class="mutation">{item.message ?? ""}</div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
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
                    const subset = toChars(splitWord[i].substring(0, splitWord[i].indexOf(infixPart)));
                    infix = [subset, infixGene[0], infixGene[1]];
                }
            }

            const wordGene = splitTrim(words.find(x => x.entry.form === word)?.contents?.find(x => x.title === "遺伝子データ")?.text, ",");
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
        let gene = words.find(x => x.entry.form === input)?.contents?.find(x => x.title === "遺伝子データ")?.text;

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
                    const subset = toChars(splitWord[i].substring(0, splitWord[i].indexOf(infixPart)));
                    infix = [subset, infixGene[0], infixGene[1]];
                }
            }

            const wordGene = splitTrim(props.words.find(x => x.entry.form === word)?.contents?.find(x => x.title === "遺伝子データ")?.text, ",");
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
        let inputGeneValue: string[] = toChars(props.input).map(x => toGeneValue(props.geneSource, x));
    
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

        for (let i = 0; i < geneValues.length; i++) {
            const gene = geneValues[i];
            if (!doCointoss()) {
                const tmp = gene[0];
                gene[0] = gene[1];
                gene[1] = tmp;
            }
        }

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

function toChars(input: string): string[] {
    return Array.from(input.replaceAll(/[áéíóúűő]/gi, (x) => {
        switch (x) {
            case "á":
                return "aa";
            case "é":
                return "ee";
            case "í":
                return "ii";
            case "ó":
                return "oo";
            case "ú":
                return "uu";
            case "ő":
                return "öö";
            case "ű":
                return "üü";
            default:
                return x;
        }
    }));
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