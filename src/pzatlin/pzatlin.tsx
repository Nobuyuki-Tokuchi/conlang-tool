import { For, JSX, batch, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";
import { Zatlin } from "zatlin/source/index";

type CreatedWord = {
    word: string;
    isDuplicated: boolean;
}

export type Props = {
    generateCount: number;
    duplicationCount: number;
    input: string;
    output: CreatedWord[];
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        generateCount: createSignal(500),
        duplicationCount: createSignal(0),

        input: createSignal<string>(""),
        output: createSignal<CreatedWord[]>([]),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                generateCount: this.generateCount[0](),
                duplicationCount: this.duplicationCount[0](),

                input: this.input[0](),
                output: this.output[0](),
            };
        },
    };
}

function PZatlin(props: Props & Pick<Methods<Props>, "update">) {
    const duplicationCountPercent = () => (props.duplicationCount / props.generateCount * 100).toFixed(2);

    const generateWords: JSX.EventHandlerUnion<HTMLButtonElement, Event> = () => {
        const count = props.generateCount;
        const words: CreatedWord[] = [];
        let duplicationCount = 0;

        const zatlin = Zatlin.load(props.input);
        for (let i = 0; i < count; i++) {
            const word = zatlin.generate();
            const isDuplicated = words.some(x => x.word === word);

            words.push({
                word,
                isDuplicated,
            });

            if (isDuplicated) {
                duplicationCount++;
            }
        }

        batch(() => {
            props.update("output", words);
            props.update("duplicationCount", duplicationCount);
        });
    }

    const readDictionaries: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        props.update("input", await files[0].text());
    };

    return (
        <div class="main">
            <div class="row">
                <div class="row half align-center">
                    <button class="text-nowrap" onclick={generateWords}>実行</button>
                </div>
                <div class="row half align-center">
                    <input type="file" multiple onchange={readDictionaries}/>
                </div>
            </div>
            <div class="row row-wrap align-center">
                <div class="row text-nowrap align-center">
                    <label class="text-nowrap">
                        作成数：
                    </label>
                    <input class="input-line" type="number" min="10" max="1000" value={props.generateCount} onchange={(event) => props.update("generateCount", event.target.valueAsNumber)}/>
                </div>
                <label>
                    <span class="duplication">重複している個数</span>：{props.duplicationCount} ({duplicationCountPercent()}%)
                </label>
            </div>
            <div class="row result-area">
                <textarea class="text input" value={props.input} onchange={(event) => props.update("input", event.target.value)}></textarea>
                <div class="text output">
                    <For each={props.output}>
                        {(item) => (
                            <div classList={{ "duplication": item.isDuplicated }}>{item.word}</div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

export default PZatlin;