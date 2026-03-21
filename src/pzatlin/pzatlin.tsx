import { For, JSX, batch, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";
import { Zatlin } from "zatlin";

type CreatedWord = {
    word: string;
    isDuplicated: boolean;
}

export type Props = {
    generateCount: number;
    duplicationCount: number;
    input: string;
    output: CreatedWord[];

    zatlinFileName: string;
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        generateCount: createSignal(500),
        duplicationCount: createSignal(0),

        input: createSignal<string>(""),
        output: createSignal<CreatedWord[]>([]),

        zatlinFileName: createSignal<string>(""),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                generateCount: this.generateCount[0](),
                duplicationCount: this.duplicationCount[0](),

                input: this.input[0](),
                output: this.output[0](),

                zatlinFileName: this.zatlinFileName[0](),
            };
        },
    };
}

function PZatlin(props: Props & Pick<Methods<Props>, "update">) {
    const displayZatlinFileName = () => {
        return props.zatlinFileName != null && props.zatlinFileName !== "" ? props.zatlinFileName : "未選択"
    };

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

    const readDictionary: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = async (event) => {
        const files = event.target.files;
        if (files == null || !(files.length > 0)) { return; }

        const text = await files[0].text();
        batch(() => {
            props.update("input", text);
            props.update("zatlinFileName", files[0].name);
        })
    };

    let zatlinFileRef: HTMLInputElement | undefined;

    return (
        <div class="flex flex-col h-full gap-1 p-1 flex-1">
            <div class="flex gap-x-1">
                <div class="flex gap-x-1 flex-1/2 items-center">
                    <InternalButton text="実行" onclick={generateWords} />
                    <InternalButton text="読込"  onclick={() => zatlinFileRef?.click()} />
                    <span class="text-nowrap min-w-37.5 max-w-full overflow-x-hidden text-ellipsis" title={displayZatlinFileName()}>{displayZatlinFileName()}</span>
                    <input class="hidden" type="file" multiple onchange={readDictionary} ref={zatlinFileRef} />
                </div>
            </div>
            <div class="flex gap-x-4 gap-y-1 flex-wrap items-center">
                <div class="flex gap-x-1 text-nowrap items-center">
                    <label class="text-nowrap">作成数：</label>
                    <input class="flex-auto p-1 border-solid border-2 border-black"
                        type="number" min="10" max="1000" value={props.generateCount} onchange={(event) => props.update("generateCount", event.target.valueAsNumber)}/>
                </div>
                <label class="text-nowrap">
                    <span class="text-nowrap line-through bg-cyan-200">重複している個数：</span>
                    <span class="text-nowrap">{props.duplicationCount} ({duplicationCountPercent()}%)</span>
                </label>
            </div>
            <div class="flex gap-x-2 h-full overflow-hidden">
                <textarea class="resize-none flex-1/2 m-0 p-0 border-2 border-black border-solid" value={props.input} onchange={(event) => props.update("input", event.target.value)}></textarea>
                <div class="resize-none flex-1/2 overflow-y-scroll border-2 border-black border-solid">
                    <For each={props.output}>
                        {(item) => (
                            <div classList={{ "text-nowrap line-through bg-cyan-200": item.isDuplicated }}>{item.word}</div>
                        )}
                    </For>
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

export default PZatlin;