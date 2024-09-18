import { For, JSX, batch, createSignal } from "solid-js";
import { NormalWordGen } from "./wordgen/normal";
import { WordgenData, WordGenenerator } from "./wordgen/wordgen";
import { HeadPlusWordGen } from "./wordgen/headplus";
import { PrunningWordGen } from "./wordgen/prunning";
import { Data, Methods } from "../common/common";

type Dictionary = {
    words: {
        entry: { form: string; };
        tags: string[];
    }[];
};

type CreatedWord = {
    word: string;
    hasOriginal: boolean;
    isDuplicated: boolean;
    isInvalid: boolean;
}

const DEPTH = 3;
const RETRY_COUNT = 20;
const CREATE_TYPE_LIST = [
    { value: "normal", text: "通常" },
    { value: "headplus", text: "語頭調整版" },
    { value: "prunning", text: "剪定"}
] as const;

type CREATE_TYPE_VALUE = (typeof CREATE_TYPE_LIST)[number]["value"];

export type Props = {
    generateCount: number;
    isAppend: boolean;
    selectedType: CREATE_TYPE_VALUE;
    minLength: number;
    maxLength: number;
    hasOriginalCount: number;
    duplicationCount: number;
    invalidCount: number;
    input: string[];
    output: CreatedWord[];
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        generateCount: createSignal(500),
        isAppend: createSignal(false),

        selectedType: createSignal<CREATE_TYPE_VALUE>("normal"),
        minLength: createSignal(DEPTH),
        maxLength: createSignal(10),

        hasOriginalCount: createSignal(0),
        duplicationCount: createSignal(0),
        invalidCount: createSignal(0),

        input: createSignal<string[]>([]),
        output: createSignal<CreatedWord[]>([]),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                generateCount: this.generateCount[0](),
                isAppend: this.isAppend[0](),

                selectedType: this.selectedType[0](),
                minLength: this.minLength[0](),
                maxLength: this.maxLength[0](),

                hasOriginalCount: this.hasOriginalCount[0](),
                duplicationCount: this.duplicationCount[0](),
                invalidCount: this.invalidCount[0](),

                input: this.input[0](),
                output: this.output[0](),
            };
        },
    };
}

function Flexible(props: Props & Pick<Methods<Props>, "update">) {
    const hasOriginalCountPercent = () => (props.hasOriginalCount / props.generateCount * 100).toFixed(2);
    const duplicationCountPercent = () => (props.duplicationCount / props.generateCount * 100).toFixed(2);
    const invalidCountPercent = () => (props.invalidCount / props.generateCount * 100).toFixed(2);
    const inputText = () => props.input.join("\n");

    const generateWords: JSX.EventHandlerUnion<HTMLButtonElement, Event> = () => {
        const originalWords = props.input;
        const commonData: WordgenData = {
            depth: DEPTH,
            min: props.minLength,
            max: props.maxLength,
            retryCount: RETRY_COUNT,
        };
        const count = props.generateCount;
        let wordgen: WordGenenerator;

        switch (props.selectedType) {
            case "headplus":
                {
                    const temporary = new HeadPlusWordGen(commonData);
                    temporary.createTable(originalWords);
                    wordgen = temporary;
                }
                break;
            case "prunning":
                {
                    const temporary = new PrunningWordGen(commonData);
                    temporary.createTable(originalWords);
                    wordgen = temporary;
                }
                break;
            case "normal":
            default:
                {
                    const temporary = new NormalWordGen(commonData);
                    temporary.createTable(originalWords);
                    wordgen = temporary;
                }
                break;
        }

        const words: CreatedWord[] = [];
        let hasOriginalCount = 0;
        let duplicationCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < count; i++) {
            const word = wordgen.generateWord();
            const hasOriginal = originalWords.includes(word);
            const isDuplicated = words.some(x => x.word === word);
            const isInvalid = word.length < commonData.min || word.length > commonData.max;

            words.push({
                word,
                hasOriginal,
                isDuplicated,
                isInvalid,
            });

            if (hasOriginal) {
                hasOriginalCount++;
            }

            if (isDuplicated) {
                duplicationCount++;
            }

            if (isInvalid) {
                invalidCount++;
            }
        }

        batch(() => {
            props.update("output", words);
            props.update("hasOriginalCount", hasOriginalCount);
            props.update("duplicationCount", duplicationCount);
            props.update("invalidCount", invalidCount);
        });
    }

    const readDictionaries: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        const wordList: string[] = [];

        for (const file of files) {
            const dictionary = JSON.parse(await file.text()) as Dictionary;
            const newData = dictionary.words.filter(x => !(x.entry.form.includes(" "))).map(x => x.entry.form);

            wordList.push(...newData);
        }

        if (props.isAppend) {
            wordList.unshift(...props.input);
        }

        props.update("input", wordList);
    };

    return (
        <div class="main">
            <div class="row">
                <div class="row half align-center">
                    <button class="text-nowrap" onclick={generateWords}>実行</button>
                    <select onchange={(event) => props.update("selectedType", toCreateType(event.target.value))} value={props.selectedType}>
                        <For each={CREATE_TYPE_LIST}>
                            {(item) => (
                                <option value={item.value}>{item.text}</option>
                            )}
                        </For>
                    </select>
                </div>
                <div class="row half align-center">
                    <input type="file" multiple onchange={readDictionaries}/>
                    <label class="text-nowrap">
                        <input type="checkbox" checked={props.isAppend} onchange={(event) => props.update("isAppend", event.target.checked)}/>
                        追記にする
                    </label>
                </div>
            </div>
            <div class="row row-wrap align-center">
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">
                        作成数：
                    </label>
                    <input class="input-line" type="number" min="10" max="1000" value={props.generateCount} onchange={(event) => props.update("generateCount", event.target.valueAsNumber)}/>
                </div>
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">
                        最小長：
                    </label>
                    <input class="input-line" type="number" min={DEPTH} value={props.minLength} onchange={(event) => props.update("minLength", event.target.valueAsNumber)}/>
                </div>
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">
                        最大長：
                    </label>
                    <input class="input-line" type="number" min={props.minLength} value={props.maxLength} onchange={(event) => props.update("maxLength", event.target.valueAsNumber)}/>
                </div>
            </div>
            <div class="row align-center">
                <label>
                    <span class="has-original">既存の単語にある個数</span>：{props.hasOriginalCount} ({hasOriginalCountPercent()}%)
                </label>
                <label>
                    <span class="duplication">重複している個数</span>：{props.duplicationCount} ({duplicationCountPercent()}%)
                </label>
                <label>
                    <span class="invalid">作成に失敗した個数</span>：{props.invalidCount} ({invalidCountPercent()}%)
                </label>
            </div>
            <div class="row result-area">
                <textarea class="text input" value={inputText()} onchange={(event) => props.update("input", event.target.value.split("\n"))}></textarea>
                <div class="text output">
                    <For each={props.output}>
                        {(item) => (
                            <div classList={{ "has-original": item.hasOriginal, "duplication": item.isDuplicated, "invalid": item.isInvalid }}>{item.word}</div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

function toCreateType(value: string): CREATE_TYPE_VALUE {
    return CREATE_TYPE_LIST.find(x => x.value === value)?.value ?? "normal";
}

export default Flexible;