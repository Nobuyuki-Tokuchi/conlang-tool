import { For, createSignal } from "solid-js";
import * as Common from "./conjcommon";
import { Data, Methods } from "../../common/common";

export type Props = {
    input: string;
    affixType: ConjugationType;
    isCompact: boolean;
};

type ConjugationType = "L" | "S";
type FormType = "属格" | "対格" | "分格" | "与格"
    | "所格" | "離格" | "向格" | "内格"
    | "出格" | "入格" | "利益格" | "被害格"
    | "類似格" | "具格" | "共格" | "欠格";

type ConjugationResult = {
    type: string;
    form: string;
};
    
export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        affixType: createSignal<ConjugationType>("L"),
        isCompact: createSignal<boolean>(false),

        update(key, value) {                
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                affixType: this.affixType[0](),
                isCompact: this.isCompact[0](),
            };
        },
    };
}

function NounConjugationChecker(props: Props & Pick<Methods<Props>, "update">) {
    const conjugationTypeKeys = Array.from(CONJUGATION_TYPES.keys());
    const result = () => setConjugations(props);
    const toJson = () => {
        const conjugationList = result().map(x => {
            return {
                title: x.type,
                form: x.form
            };
        });

        return JSON.stringify({ variations: conjugationList }, undefined, 4);
    };

    return (
        <div class="noun-checker">
            <div class="table stretch">
                <div>
                    <input type="text" value={props.input} oninput={(event) => props.update("input", event.target.value)}/>
                    <select value={props.affixType} onchange={(event) => props.update("affixType", event.target.value as ConjugationType)}>
                        <For each={conjugationTypeKeys}>
                            {(item) => (
                                <option value={item}>{item}</option>
                            )}
                        </For>
                    </select>
                    <label>
                        <input type="checkbox" checked={props.isCompact} onchange={(event) => props.update("isCompact", event.target.checked)}/>
                        短縮有
                    </label>
                </div>
                <div class="row">
                    <div class="type">活用</div>
                    <div class="form">語形</div>
                </div>
                <For each={result()}>
                    {(item) => (
                        <div class="row">
                            <div class="type">{item.type}</div>
                            <div class="form">
                                <input type="text" value={item.form}/>
                            </div>
                        </div>
                    )}
                </For>
            </div>
            <textarea class="textarea stretch" readonly value={toJson()}></textarea>
        </div>
    );
}

function setConjugations(props: Props): ConjugationResult[] {
    if (props.input === "") {
        return [];
    }

    const vowelType = Common.getVowelType(props.input);
    const types = CONJUGATION_TYPES.get(props.affixType)!;
    const targetForm = (vowelType !== Common.VowelType.Neutral && /[ay]$/.test(props.input))
        ? props.input.substring(0, props.input.length - 1)
        : props.input;
    const isLastVowel = /[aeiouy]$/.test(targetForm) || (!/[ay]$/.test(props.input) && /[aou]r$/.test(targetForm) && !/[aou]{2}r$/.test(targetForm));

    return types.map(({ type, affix }) => {
        const pattern = affix.get(vowelType)!;
        let form = targetForm;

        if (!isLastVowel && (!props.isCompact || noCompactSuffix(form, type, props.affixType, pattern))) {
            form += pattern.suffix.append;
        }

        if (props.affixType === "S" && type === "所格" && form.endsWith("s")) {
            form = form.substring(0, form.length - 1) + pattern.suffix.value;
        }
        else if (form.endsWith("t") && pattern.suffix.value.startsWith("c")) {
            form += "ts" + pattern.suffix.value.substring(1);
        }
        else if (form.endsWith("n") && pattern.suffix.value.startsWith("l")) {
            form += "n" + pattern.suffix.value.substring(1);
        }
        else if (form.endsWith("l") && pattern.suffix.value.startsWith("n")) {
            form = form.substring(0, form.length - 1) + "n" + pattern.suffix.value;
        }
        else {
            form += pattern.suffix.value;
        }

        if (type === "属格" && vowelType !== Common.VowelType.Light && /[aou]rr$/.test(form) && !/([aou])\1rr$/.test(form)) {
            form = form.replace(/([aou])rr$/, "$1$1r");
        }

        return {
            type,
            form,
        };
    });
};

function noCompactSuffix(input: string, type: FormType, affixType: ConjugationType, pattern: Common.ConjugationData) {
    if (type === "与格") { return true; }
    if (type === "対格" && affixType === "L" && !(input.endsWith("l") || /[aeiouy]$/.test(input))) { return true; }
    if (affixType === "S" && input.endsWith("s") && (type === "所格" ||  type === "出格" || type === "入格")) { return false; }

    return Common.noCompactSuffix(input, pattern);
}

function createSuffix(type: FormType, [darkSuffix, lightSuffix, neutralSuffix]: [string, string][]) {
    return Common.createTypes<FormType>(type, [
        Common.createSuffixData(...darkSuffix),
        Common.createSuffixData(...lightSuffix),
        Common.createSuffixData(...neutralSuffix)
    ]);
}

const CONJUGATION_TYPES = new Map<ConjugationType, Common.ConjugationType<FormType>[]>([
    [
        "L", [
            createSuffix("属格", [["o", "r"], (["e", "r"]), ["a", "r"]]),
            createSuffix("対格", [["o", "l"], ["e", "l"], ["a", "l"]]),
            createSuffix("分格", [["", "o"], ["", "e"], ["", "a"]]),
            createSuffix("与格", [["o", "n"], ["e", "n"], ["a", "n"]]),
            createSuffix("所格", [["a", "s"], ["a", "s"], ["a", "s"]]),
            createSuffix("離格", [["o", "vy"], ["e", "vy"], ["a", "vy"]]),
            createSuffix("向格", [["a", "k"], ["a", "k"], ["a", "k"]]),
            createSuffix("内格", [["o", "st"], ["e", "st"], ["a", "st"]]),
            createSuffix("出格", [["o", "vut"], ["e", "vit"], ["a", "vyt"]]),
            createSuffix("入格", [["o", "kt"], ["e", "kt"], ["a", "kt"]]),
            createSuffix("利益格", [["o", "kos"], ["e", "kes"], ["a", "kas"]]),
            createSuffix("被害格", [["o", "vos"], ["e", "ves"], ["a", "vas"]]),
            createSuffix("類似格", [["o", "lun"], ["e", "lin"], ["a", "lyn"]]),
            createSuffix("具格", [["a", "do"], ["a", "de"], ["a", "da"]]),
            createSuffix("共格", [["o", "ban"], ["e", "ban"], ["a", "ban"]]),
            createSuffix("欠格", [["o", "mys"], ["e", "mys"], ["a", "mys"]]),
        ]
    ],
    [
        "S", [
            createSuffix("属格", [["o", "r"], ["e", "r"], ["a", "r"]]),
            createSuffix("対格", [["o", "s"], ["e", "s"], ["a", "s"]]),
            createSuffix("分格", [["", "u"], ["", "i"], ["", "y"]]),
            createSuffix("与格", [["o", "n"], ["e", "n"], ["a", "n"]]),
            createSuffix("所格", [["a", "xo"], ["a", "xe"], ["a", "xa"]]),
            createSuffix("離格", [["a", "lo"], ["a", "le"], ["a", "la"]]),
            createSuffix("向格", [["a", "to"], ["a", "te"], ["a", "ta"]]),
            createSuffix("内格", [["o", "xxo"], ["e", "xxe"], ["a", "xxa"]]),
            createSuffix("出格", [["o", "slo"], ["e", "sle"], ["a", "sla"]]),
            createSuffix("入格", [["o", "sto"], ["e", "ste"], ["a", "sta"]]),
            createSuffix("利益格", [["a", "c"], ["a", "c"], ["a", "c"]]),
            createSuffix("被害格", [["y", "ls"], ["y", "ls"], ["y", "ls"]]),
            createSuffix("類似格", [["o", "sun"], ["e", "sin"], ["a", "syn"]]),
            createSuffix("具格", [["a", "do"], ["a", "de"], ["a", "da"]]),
            createSuffix("共格", [["o", "ban"], ["e", "ban"], ["a", "ban"]]),
            createSuffix("欠格", [["o", "mys"], ["e", "mys"], ["a", "mys"]]),
        ]
    ]
]);

export default NounConjugationChecker;