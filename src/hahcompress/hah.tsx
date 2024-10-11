import { For, Match, Switch, batch, createMemo, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";

const CREATE_TYPE_LIST = [
    { value: "normal", text: "Hah圧縮" },
    { value: "sorted", text: "ソート型hah圧縮" },
    { value: "separateCv", text: "母子音字別hah圧縮"},
    { value: "wordLength", text: "文字数指定hah圧縮"}
] as const;

type CREATE_TYPE_VALUE = (typeof CREATE_TYPE_LIST)[number]["value"];

const DEFAULT_CONSONANTS = Object.freeze([
    "b","c","f","g",
    "h","j","k","l",
    "m","n","p","q",
    "r","s","t","v",
    "w","x","y","z"
]);

const DEFAULT_VOWELS = Object.freeze([
    "a","e","i","o",
    "ö","u","ü","á",
    "é","í","ó","ő",
    "ú","ű"
]);

export type Props = {
    input: string;
    width: number;
    selectedMode: (typeof CREATE_TYPE_LIST)[number]["value"];
    isBlockSort: boolean;
    consonants: string[];
    vowels: string[];
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        width: createSignal<number>(4),
        selectedMode: createSignal<CREATE_TYPE_VALUE>("normal"),
        isBlockSort: createSignal<boolean>(false),
        consonants: createSignal<string[]>(Array.from(DEFAULT_CONSONANTS)),
        vowels: createSignal<string[]>(Array.from(DEFAULT_VOWELS)),

        update(key, value) {
            if (key === "selectedMode" && value === "wordLength") {
                batch(() => {
                    (this as Data<Props>)[key][1](value);
                    this.width[1](Math.max(Math.floor(this.width[0]() / 2) * 2, 4));
                });
            }
            else {
                (this as Data<Props>)[key][1](value);
            }
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                width: this.width[0](),
                selectedMode: this.selectedMode[0](),
                isBlockSort: this.isBlockSort[0](),
                consonants: this.consonants[0](),
                vowels: this.vowels[0](),
            };
        },
    };
}

function Hah(props: Props & Pick<Methods<Props>, "update">) {
    const output = createMemo(() => {
        switch(props.selectedMode) {
            case "sorted":
                return sorted(props.input, props.width, props.isBlockSort);
            case "separateCv":
                return separateCv(props.input, props.width, props.consonants, props.vowels);
            case "wordLength":
                return wordLength(props.input, props.width);
            case "normal":
            default:
                return normal(props.input, props.width);
        }
    });
    
    return (
        <div id="hah" class="main">
            <div class="row">
                <div class="row stretch align-center">
                    <label class="fixed with-separator">モード</label>
                    <select class="input-line" value={props.selectedMode} onchange={(event) => props.update("selectedMode", CREATE_TYPE_LIST[event.target.selectedIndex].value)}>
                        <For each={CREATE_TYPE_LIST}>
                            {(item) => (
                                <option value={item.value}>{item.text}</option>
                            )}
                        </For>
                    </select>
                </div>
                <div class="row stretch align-center">
                    <label class="text-nowrap">入力</label>
                    <input class="input-line" type="text" value={props.input} oninput={(event) => props.update("input", event.target.value)}/>
                </div>
                <div class="row stretch align-center">
                    <Switch>
                        <Match when={props.selectedMode === "wordLength"}>
                        <label class="fixed with-separator">文字数</label>
                            <input class="input-line" type="number" value={props.width} oninput={(event) => props.update("width", Math.floor(event.target.valueAsNumber / 2) * 2)} step="2" min="4" max={props.input.length}/>
                        </Match>
                        <Match when={props.selectedMode !== "wordLength"}>
                        <label class="fixed with-separator">間隔</label>
                            <input class="input-line" type="number" value={props.width} oninput={(event) => props.update("width", event.target.valueAsNumber)} min="3"/>
                        </Match>
                    </Switch>
                </div>
                <div class="row stretch align-center">
                    <label class="text-nowrap">出力</label>
                    <input class="input-line" type="text" value={output()} readonly={true}/>
                </div>
            </div>
            <div class="row">
                <Switch>
                    <Match when={props.selectedMode === "sorted"}>
                        <div class="row stretch align-center">
                            <input type="checkbox" id="is-blocksort" checked={props.isBlockSort} onchange={(event) => props.update("isBlockSort", event.target.checked)}/>
                            <label class="fixed with-separator" for="is-blocksort">ブロックソート</label>
                        </div>
                    </Match>
                    <Match when={props.selectedMode === "separateCv"}>
                        <div class="row stretch align-center">
                            <label class="fixed with-separator">子音</label>
                            <input class="input-line" type="text" value={props.consonants.join(",")} onchange={(event) => props.update("consonants", event.target.value.split(",").map(x => x.trim()))}/>
                        </div>
                        <div class="row stretch align-center">
                            <label class="fixed with-separator">母音</label>
                            <input class="input-line" type="text" value={props.vowels.join(",")} onchange={(event) => props.update("vowels", event.target.value.split(",").map(x => x.trim()))}/>
                        </div>
                    </Match>
                </Switch>
            </div>
        </div>
    );
}

function normal(word: string, width: number): string {
    if (word === "") { return ""; }
    return hahCompress(Array.from(word), width < 3 ? 3 : width).join("");
}

function sorted(word: string, width: number, isBlockSort: boolean): string {
    if (word === "") { return ""; }

    const chars = Array.from(word).map((x, i) => [x, i] as [string, number]);
    chars.sort((x, y) => {
        if (x[0] < y[0]) {
            return -1;
        }
        else if (x[0] > y[0]) {
            return 1;
        }

        return x[1] - y[1];
    });

    if (isBlockSort) {
        blocksort(chars);
    }

    const newList = hahCompress(chars, width < 3 ? 3 : width);
    newList.sort((x, y) => x[1] - y[1]);

    return newList.map(x => x[0]).join("");
}

function separateCv(word: string, width: number, consonants: readonly string[], vowels: readonly string[]): string {
    if (word === "") { return ""; }
    if (consonants.length === 0) { consonants = DEFAULT_CONSONANTS; }
    if (vowels.length === 0) { vowels = DEFAULT_VOWELS; }

    const [wordConsonants, wordVowels] = Array.from(word).reduce((acc, x, i) => {
        if (consonants.includes(x)) {
            acc[0].push([x, i]);
        }
        else if (vowels.includes(x)) {
            acc[1].push([x, i]);
        }
        return acc;
    }, [[], []] as [[string, number][], [string, number][]]);

    const newList = [...hahCompress(wordConsonants, width < 3 ? 3 : width), ...hahCompress(wordVowels, width < 3 ? 3 : width)];
    newList.sort((x, y) => x[1] - y[1]);

    return newList.map(x => x[0]).join("");
}

function wordLength(word: string, wordLength: number): string {
    if (word === "") { return ""; }
    if (word.length < wordLength) { return word; }

    const width = Math.floor(word.length / wordLength * 2);
    const rem = (word.length - width * wordLength / 2) * 2;
    
    let startIndex = 0;
    let carry = 0;
    let newWord = "";
    while (startIndex < word.length) {
        carry += rem;
        let nextIndex: number;
        if (carry >= wordLength) {
            carry = carry - wordLength;
            nextIndex = startIndex + width + 1;
        }
        else {
            nextIndex = startIndex + width;
        }
        const sub = word.substring(startIndex, nextIndex);

        newWord += sub[0] + sub[sub.length - 1];
        startIndex = nextIndex;
    }

    return newWord;
}

function hahCompress<T>(list: T[], width: number): T[] {
    const lastIndex = list.length - 1;
    return list.filter((_, i) => {
        const pos = i % width;

        return pos === 0 || pos === width - 1 || i === lastIndex;
    });
}

function blocksort(list: [string, number][]): void {
    list.sort((x, y) => {
        const xIndex = (list.length + x[1] - 1) % list.length;
        const yIndex = (list.length + y[1] - 1) % list.length;

        return xIndex - yIndex;
    })
}

export default Hah;