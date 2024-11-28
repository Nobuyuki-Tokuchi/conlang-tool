import { Switch, Match, createSignal } from "solid-js";
import { Data, Methods } from "../common/common";
import NounConjugationChecker from "./noun-conjugation";
import * as Noun from "./noun-conjugation";
import VerbConjugationChecker from "./verb-conjugation";
import * as Verb from "./verb-conjugation";
import "./conjugation-checker.css"

export type Props = {
    mode: Mode;
    noun: Data<Noun.Props> & Methods<Noun.Props>;
    verb: Data<Verb.Props> & Methods<Verb.Props>;
};

type Mode = "noun" | "verb";

export function createData(): Data<Pick<Props, "mode">> & Omit<Props, "mode"> & Methods<Props> {
    return {
        mode: createSignal<Mode>("noun"),
        noun: Noun.createData(),
        verb: Verb.createData(),

        update(key, value) {
            if (key === "mode") {
                (this as Data<Pick<Props, typeof key>>)[key][1](value);
            }
        },

        get getters(): Props {
            return {
                mode: this.mode[0](),
                noun: this.noun,
                verb: this.verb,
            };
        },
    };
}

function WakofalConjugation(props: Props & Pick<Methods<Props>, "update">) {
    return (
        <div id="wakofal-conjugation" class="main">
            <div class="row">
                <select value={props.mode} onchange={(event) => props.update("mode", event.target.value as Mode)}>
                    <option value="noun">名詞</option>
                    <option value="verb">動詞</option>
                </select>
            </div>
            <hr class="separate" />
            <Switch>
                <Match when={props.mode === "noun"}>
                    <NounConjugationChecker {...props.noun.getters} update={(key, value) => props.noun.update(key, value)} />
                </Match>
                <Match when={props.mode === "verb"}>
                    <VerbConjugationChecker {...props.verb.getters} update={(key, value) => props.verb.update(key, value)} />
                </Match>
            </Switch>
        </div>
    );
}

export default WakofalConjugation;
