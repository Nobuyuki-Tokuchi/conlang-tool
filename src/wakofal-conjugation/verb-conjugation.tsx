import { For, createSignal } from "solid-js";
import * as Common from "./conjcommon";
import { Data, Methods } from "../common/common";

export type Props = {
    input: string;
    affixType: ConjugationType;
    isCompact: boolean;
};

type ConjugationType = "K" | "V" | "A" | "A2" | "KA" | "VA" | "N";
type FormType = "過去" | "能動分詞" | "受動分詞";

type ConjugationResult = {
    type: string;
    form: string;
};
    
export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        affixType: createSignal<ConjugationType>("K"),
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

function VerbConjugationChecker(props: Props & Pick<Methods<Props>, "update">) {
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
    const targetForm = (vowelType !== Common.VowelType.Neutral && !props.affixType.endsWith("A") && /[ay]$/.test(props.input))
        ? props.input.substring(0, props.input.length - 1)
        : props.input;
    const isCompactPrefix = /^[aeiouy]/.test(targetForm);
    const isLastVowel = /[aeiouy]$/.test(targetForm) || (!/[ay]$/.test(props.input) && /[aou]r$/.test(targetForm) && !/[aou]{2}r$/.test(targetForm));

    return types.map(({ type, affix }) => {
        let form = targetForm;
        let targetVowelType = vowelType;
        if (props.affixType.endsWith("A") || props.affixType === "A2") {
            if (targetVowelType == Common.VowelType.Neutral) {
                if (type === "能動分詞") {
                    form = form.replace(/[ay]/g, x => {
                        switch (x) {
                            case "a": return "e";
                            case "y": return "i";
                            default: return x;
                        }
                    });
                    targetVowelType = Common.VowelType.Light
                } else {
                    form = form.replace(/[ay]/g, x => {
                        switch (x) {
                            case "a": return "o";
                            case "y": return "u";
                            default: return x;
                        }
                    });
                    targetVowelType = Common.VowelType.Dark;
                }
            } else {
                if (type !== "能動分詞") {
                    form = Common.changeBrightness(form);
                    if (targetVowelType == Common.VowelType.Dark) {
                        targetVowelType = Common.VowelType.Light;
                    } else {
                        targetVowelType = Common.VowelType.Dark;
                    }
                }
            }
        }

        const pattern = affix.get(targetVowelType)!;
        if (pattern.prefix.value) {
            let prefix = pattern.prefix.value;
            if (!isCompactPrefix) {
                prefix += pattern.prefix.append;
            }

            form = prefix + "'" + form;
        }

        if (pattern.suffix.value)  {
            if (!isLastVowel && (!props.isCompact || noCompactAffix(form, type, props.affixType, pattern))) {
                form += pattern.suffix.append;
            }

            if (form.endsWith("n") && pattern.suffix.value.startsWith("l")) {
                form += "n" + pattern.suffix.value.substring(1);
            }
            else if (form.endsWith("l") && pattern.suffix.value.startsWith("n")) {
                form = form.substring(0, form.length - 1) + "n" + pattern.suffix.value;
            }
            else {
                form += pattern.suffix.value;
            }
        }

        return {
            type,
            form,
        };
    });
};

function noCompactAffix(input: string, type: FormType, affixType: ConjugationType, pattern: Common.ConjugationData) {
    if (type === "受動分詞" && !(affixType === "A" || affixType === "A2" || affixType === "VA")) { return true; }

    return Common.noCompactSuffix(input, pattern);
}

function createAffix(type: FormType, [darkAffix, lightAffix, neutralAffix]: { prefix?: [string, string], suffix?: [string, string] }[]) {
    return Common.createTypes<FormType>(type, [
        Common.createCircumfixData(darkAffix.prefix ? { value: darkAffix.prefix[0], append: darkAffix.prefix[1] } : null, darkAffix.suffix ? { value: darkAffix.suffix[1], append: darkAffix.suffix[0] } : null),
        Common.createCircumfixData(lightAffix.prefix ? { value: lightAffix.prefix[0], append: lightAffix.prefix[1] } : null, lightAffix.suffix ? { value: lightAffix.suffix[1], append: lightAffix.suffix[0] } : null),
        Common.createCircumfixData(neutralAffix.prefix ? { value: neutralAffix.prefix[0], append: neutralAffix.prefix[1] } : null, neutralAffix.suffix ? { value: neutralAffix.suffix[1], append: neutralAffix.suffix[0] } : null)
    ]);
}

const CONJUGATION_TYPES = new Map<ConjugationType, Common.ConjugationType<FormType>[]>([
    [
        "K", [
            createAffix("過去", [{ suffix: ["o", "k"] }, { suffix: [ "e", "k" ] }, { suffix: [ "a", "k" ] }]),
            createAffix("能動分詞", [{ suffix: [ "a", "so" ] }, { suffix: [ "a", "se" ] }, { suffix: [ "a", "sa" ] }]),
            createAffix("受動分詞", [{ suffix: [ "o", "n" ] }, { suffix: [ "e", "n" ] }, { suffix: [ "a", "n" ] }]),
        ]
    ],
    [
        "V", [
            createAffix("過去", [{ suffix: [ "o", "v" ] }, { suffix: [ "e", "v" ] }, { suffix: [ "a", "v" ] }]),
            createAffix("能動分詞", [{ prefix: [ "d", "o" ] }, { prefix: [ "d", "e" ] }, { prefix: [ "d", "a" ] }]),
            createAffix("受動分詞", [{ prefix: [ "d", "o" ], suffix: [ "a", "n" ] }, { prefix: [ "d", "e" ], suffix: [ "a", "n" ] }, { prefix: [ "d", "a" ], suffix: [ "a", "n" ] }]),
        ]
    ],
    [
        "A", (["過去", "能動分詞", "受動分詞"]).map(x => {
            return createAffix(x as FormType, [{}, {}, {}]);
        })
    ],
    [
        "A2", (["過去", "能動分詞", "受動分詞"]).map(x => {
            return createAffix(x as FormType, [{}, {}, {}]);
        })
    ],
    [
        "KA", [
            createAffix("過去", [{}, {}, {}]),
            createAffix("能動分詞", [{ suffix: [ "a", "so" ] }, { suffix: [ "a", "se" ] }, { suffix: [ "a", "sa" ] }]),
            createAffix("受動分詞", [{ suffix: [ "o", "n" ] }, { suffix: [ "e", "n" ] }, { suffix: [ "a", "n" ] }]),
        ]
    ],
    [
        "VA", [
            createAffix("過去", [{}, {}, {}]),
            createAffix("能動分詞", [{ prefix: [ "d", "o" ] }, { prefix: [ "d", "e" ] }, { prefix: [ "d", "a" ] }]),
            createAffix("受動分詞", [{ prefix: [ "d", "o" ], suffix: [ "a", "n" ] }, { prefix: [ "d", "e" ], suffix: [ "a", "n" ] }, { prefix: [ "d", "a" ], suffix: [ "a", "n" ] }]),
        ]
    ],
    [
        "N", (["過去", "能動分詞", "受動分詞"]).map(x => {
            return createAffix(x as FormType, [{}, {}, {}]);
        })
    ],
]);

export default VerbConjugationChecker;