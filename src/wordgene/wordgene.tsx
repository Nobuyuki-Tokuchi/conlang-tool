import { For, JSX, createSignal } from "solid-js";
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

type WordGeneData = {
    character: string;
    gene: string;
};

type AffixGeneData = {
    affix: string;
    genes: string;
};

type CreatedGene = {
    word: string;
    gene: string;
    mutation?: string;
}

export type Props = {
    input: string;
    geneSource: WordGeneData[];
    affixSource: AffixGeneData[];
    words: Dictionary["words"];
    output: CreatedGene[];
};

const MUTATION_VALUE = 2 ** (-7);

export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        geneSource: createSignal<WordGeneData[]>([]),
        affixSource: createSignal<AffixGeneData[]>([]),
        words: createSignal<Dictionary["words"]>([]),
        output: createSignal<CreatedGene[]>([]),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                geneSource: this.geneSource[0](),
                affixSource: this.affixSource[0](),
                words: this.words[0](),
                output: this.output[0](),
            };
        },
    };
}

function WordGene(props: Props & Pick<Methods<Props>, "update">) {
    const readGeneSource: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        props.update("geneSource", JSON.parse(await files[0].text()) as WordGeneData[]);
    };

    const readAffixGeneSource: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        props.update("affixSource", JSON.parse(await files[0].text()) as AffixGeneData[]);
    };

    const readDictionaries: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        const dictionary = JSON.parse(await files[0].text()) as Dictionary;
        const words = dictionary.words.filter(x => !(x.entry.form.includes(" ")));

        props.update("words", words);
    };

    const run: JSX.EventHandlerUnion<HTMLButtonElement, Event> = () => {
        const inputList = props.input.split(" ");

        if (inputList.length > 1) {
            const output = [...props.output, hybridizeGene(props.geneSource, props.affixSource, props.words, inputList)];
            props.update("output", output);
        }
        else {
            const output = [...props.output, createGene(props.geneSource, props.input)];
            props.update("output", output);
        }
    };

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
                    <label class="text-nowrap">基本遺伝子データ：</label>
                    <input type="file" multiple onchange={readGeneSource}/>
                </div>
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">接辞遺伝子データ：</label>
                    <input type="file" multiple onchange={readAffixGeneSource}/>
                </div>
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">辞書データ：</label>
                    <input type="file" multiple onchange={readDictionaries}/>
                </div>
            </div>
            <div class="row result-area">
                <div class="output">
                    <For each={props.output}>
                        {(item) => (
                            <div class="row text-nowwrap">
                                <div class="character text-nowrap">{item.word}</div>
                                <div class="gene text-nowrap">{item.gene}</div>
                                <div class="mutation">{item.mutation ?? ""}</div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

function hybridizeGene(wordGeneData: WordGeneData[], affix: AffixGeneData[],  words: Dictionary["words"], input: string[]): CreatedGene {
    const genes = input.map(x => getWordGene(words, affix, x));

    if (genes.length === 0) {
        // TODO:
    }

    const result: [WordGeneData["gene"][], WordGeneData["gene"][]] = [
        [],
        []
    ];
    const mutationMessage: string[] = [];
    
    for (let i = 0; i < genes.length; i++) {
        const [gene, isAffix] = genes[i];
        if (gene == null) { continue; }

        const values = gene.split(",", result.length);

        if (isAffix) {
            const value = values.map(x => x.trim().split(" "));

            if (i === 0) {
                result[0].push(...value[0]);
                result[1].push(...value[1]);
            }
            else {
                result[0].push(...value[0]);
                result[1].unshift(...value[1]);
            }
        }
        else {
            const [value, mutationMessages]: [string[][], string[]] = values.map(x => mutatedGene(x.trim().split(" "), true)).reduce<[string[][], string[]]>((acc, x) => {
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
    }

    return {
        word: result.map(x => x.map(y => {
            const c = wordGeneData.find(z => z.gene === y)!.character;
            return c === "" ? " " : c;
        }).join("")).join(", "),
        gene: result.map(x => x.join(" ")).join(", "),
        mutation: mutationMessage.length > 0 ? mutationMessage.join(",") : undefined,
    }
}

function getWordGene(words: Dictionary["words"], affix: AffixGeneData[], word: string): [string | undefined, boolean] {
    let gene = words.find(x => x.entry.form === word)?.contents?.find(x => x.title === "遺伝子データ")?.text;
    let isAffix = false;

    if (gene == null) {
        gene = affix.find(x => x.affix === word)?.genes;
        isAffix = gene != null;
    }

    return [gene, isAffix];
}

function createGene(wordGeneData: WordGeneData[], input: string): CreatedGene {
    const inputGeneValue = toChars(input).map(x => toGeneValue(wordGeneData, x));

    if (isSuccess(MUTATION_VALUE / 4)) {
        const insertIndex = getRandomIndex(inputGeneValue.length);
        inputGeneValue.splice(insertIndex, 0, toGeneValue(wordGeneData, ""));
    }

    const geneValues = [
        inputGeneValue,
        inputGeneValue.map(x => {
            const none = isSuccess(0.25) ? "000" : toGeneValue(wordGeneData, "");
            return Array.from(x).map((y, i) => Number.parseInt(y) ^ Number.parseInt(none[i])).join("");
        }),
    ];

    for (let i = 0; i < geneValues.length; i++) {
        const geneValue = geneValues[i];
        if (!doCointoss()) {
            const tmp = geneValue[0];
            geneValue[0] = geneValue[1];
            geneValue[1] = tmp;
        }
    }

    return {
        word: input,
        gene: geneValues.map(x => x.join(" ")).join(", ")
    };
}

function toGeneValue(wordGeneData: WordGeneData[], str: string): WordGeneData["gene"] {
    const list = wordGeneData.filter(x => x.character === str);
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

function mutatedGenePart(part: string): [string, string | undefined] {
    let newValue = part;
    const mutation = [];

    if (isSuccess(MUTATION_VALUE / 4)) {
        // 値変更
        const index = getRandomIndex(newValue.length);
        const swapValues = ["0","1","2","3"].filter(x => x !== newValue[index]);

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

function mutatedGene(gene: string[], partMutation: boolean = false): [string[], string[]] {
    const newValue: [string[], string[]] = partMutation
        ? gene.map(x => mutatedGenePart(x)).reduce<[string[], string[]]>((acc, x, index) => {
            acc[0].push(x[0]);
            if (typeof x[1] === "string") {
                acc[1].push(`(${x[1]}: ${index})`);
            }
            return acc;
        }, [[], []])
        : [gene, []];

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

    if (newValue.length >= 2 && isSuccess(MUTATION_VALUE / 4)) {
        // 位置交換
        const index = getRandomIndex(newValue.length);

        if (index === 0) {
            const tmp = newValue[0];
            newValue[0] = newValue[1];
            newValue[1] = tmp;
        }
        else if (index === newValue.length - 1) {
            const tmp = newValue[index];
            newValue[index] = newValue[index - 1];
            newValue[index - 1] = tmp;
        }
        else {
            if (doCointoss()) {
                const tmp = newValue[index];
                newValue[index] = newValue[index - 1];
                newValue[index - 1] = tmp;
            }
            else {
                const tmp = newValue[index];
                newValue[index] = newValue[index + 1];
                newValue[index + 1] = tmp;
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