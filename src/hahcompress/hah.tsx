import { For, Show, createMemo, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";

const CREATE_TYPE_LIST = [
    { value: "normal", text: "Hah圧縮" },
    { value: "sorted", text: "ソート型hah圧縮" },
    { value: "separateCv", text: "母子音字別hah圧縮"}
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
    consonants: string[];
    vowels: string[];
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        width: createSignal<number>(4),
        selectedMode: createSignal<CREATE_TYPE_VALUE>("normal"),
        consonants: createSignal<string[]>(Array.from(DEFAULT_CONSONANTS)),
        vowels: createSignal<string[]>(Array.from(DEFAULT_VOWELS)),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                width: this.width[0](),
                selectedMode: this.selectedMode[0](),
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
                return sorted(props.input, props.width);
            case "separateCv":
                return separateCv(props.input, props.width, props.consonants, props.vowels);
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
                    <label class="fixed with-separator">間隔</label>
                    <input class="input-line" type="number" value={props.width} oninput={(event) => props.update("width", event.target.valueAsNumber)} min="3"/>
                </div>
                <div class="row stretch align-center">
                    <label class="text-nowrap">出力</label>
                    <input class="input-line" type="text" value={output()} readonly={true}/>
                </div>
            </div>
            <div class="row">
                <Show when={props.selectedMode === "separateCv"} >
                    <div class="row stretch align-center">
                        <label class="fixed with-separator">子音</label>
                        <input class="input-line" type="text" value={props.consonants.join(",")} onchange={(event) => props.update("consonants", event.target.value.split(",").map(x => x.trim()))}/>
                    </div>
                    <div class="row stretch align-center">
                        <label class="fixed with-separator">母音</label>
                        <input class="input-line" type="text" value={props.vowels.join(",")} onchange={(event) => props.update("vowels", event.target.value.split(",").map(x => x.trim()))}/>
                    </div>
                </Show>
            </div>
        </div>
    );
}

function normal(word: string, width: number): string {
    if (word === "") { return ""; }
    return hahCompress(Array.from(word), width < 3 ? 3 : width).join("");
}

function sorted(word: string, width: number): string {
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

    const newList = [...hahCompress(wordConsonants, width), ...hahCompress(wordVowels, width)];
    newList.sort((x, y) => x[1] - y[1]);

    return newList.map(x => x[0]).join("");
}

function hahCompress<T>(list: T[], width: number): T[] {
    const lastIndex = list.length - 1;
    return list.filter((_, i) => {
        const pos = i % width;

        return pos === 0 || pos === width - 1 || i === lastIndex;
    });
}

export default Hah;