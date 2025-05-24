import { createSignal } from "solid-js";
import { Data, Methods } from "../common/common";
import "./xsampa2ipa.css";

export type Props = {
    input: string;
    fontSize: number;
};

export function createData(): Data<Props> & Methods<Props> {
    return {
        input: createSignal<string>(""),
        fontSize: createSignal<number>(24),

        update(key, value) {
            (this as Data<Props>)[key][1](value);
        },

        get getters(): Props {
            return {
                input: this.input[0](),
                fontSize: this.fontSize[0](),
            };
        },
    };
}

function Xsampa2Ipa(props: Props & Pick<Methods<Props>, "update">) {
    const output = () => {
        if (props.input === "") {
            return "";
        }

        const chars = Array.from(props.input);
        let index = 0;

        const ipaChars: [string, number][] = [];
        while (index < chars.length) {
            const [char, nextIndex] = getIpa(chars, index);

            ipaChars.push([char, index]);
            index = nextIndex
        }
        return ipaChars.map(x => x[0]).join("");
    }

    return (
        <div id="xsampa2ipa" class="main">
            <div class="grid">
                <label>フォントサイズ</label>
                <input type="number" min="12" max="96" value={props.fontSize.toString()} onchange={(event) => props.update("fontSize", event.target.valueAsNumber)} />
                <label>入力</label>
                <input type="text" class="input-xsampa" value={props.input} oninput={(event) => props.update("input", event.target.value)} />
                <label>出力</label>
                <output class="output-ipa" style={{"font-size": props.fontSize + "px", "min-height": props.fontSize + "px"}}>{output()}</output>
            </div>
        </div>
    )
}

const PATTERNS: { [key: string]: string | ((chars: string[], index: number) => [string, number]); } = {
    // 小文字英字
    "a": "a",
    "b": (chars, index) => {
        switch(chars.slice(index, index + 2).join("")) {
            case "_<":
                return ["\u0253", index + 2];
            default:
                return ["b", index];
        }
    },
    "c": "c",
    "d": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_<") {
            return ["\u0257", index + 2];
        }

        if (chars[index] === "`") {
            return ["\u0256", index + 1];
        }
        else {
            return ["d", index];
        }
    },
    "e": "e",
    "f": "f",
    "g": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_<") {
            return ["\u0260", index + 2];
        }
        else {
            return ["\u0261", index];
        }
    },
    "h": (chars, index) => {
        if (chars[index] === "\\") {
            return ["\u0266", index + 1];
        }
        else {
            return ["h", index];
        }
    },
    "i": "i",
    "j": (chars, index) => {
        if (chars[index] === "\\") {
            return ["\u029D", index + 1];
        }
        else {
            return ["j", index];
        }
    },
    "k": "k",
    "l": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u026D", index + 1];
            case "\\":
                return ["\u027A", index + 1];
            default:
                return ["l", index];
        }
    },
    "m": "m",
    "n": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u0273", index + 1];
            default:
                return ["n", index];
        }
    },
    "o": "o",
    "p": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u0278", index + 1];
            default:
                return ["p", index];
        }
    },
    "q": "q",
    "r": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "\\`") {
            return ["\u027B", index + 2];
        }

        switch(chars[index]) {
            case "`":
                return ["\u027D", index + 1];
            case "\\":
                return ["\u0279", index + 1];
            default:
                return ["r", index];
        }
    },
    "s": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u0282", index + 1];
            case "\\":
                return ["\u0255", index + 1];
            default:
                return ["s", index];
        }
    },
    "t": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u0288", index + 1];
            default:
                return ["t", index];
        }
    },
    "u": "u",
    "v": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u028B", index + 1];
            default:
                return ["v", index];
        }
    },
    "w": "w",
    "x": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0267", index + 1];
            default:
                return ["x", index];
        }
    },
    "y": "y",
    "z": (chars, index) => {
        switch(chars[index]) {
            case "`":
                return ["\u0290", index + 1];
            case "\\":
                return ["\u0291", index + 1];
            default:
                return ["z", index];
        }
    },
    // 大文字英字
    "A": "\u0251",
    "B": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0299", index + 1];
            default:
                return ["\u03B2", index];
        }
    },
    "C": "\u00E7",
    "D": "\u00F0",
    "E": "\u025B",
    "F": "\u0271",
    "G": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_<") {
            return ["\u029B", index + 2];
        }

        switch(chars[index]) {
            case "\\":
                return ["\u0262", index + 1];
            default:
                return ["\u0263", index];
        }
    },
    "H": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u029C", index + 1];
            default:
                return ["\u0265", index];
        }
    },
    "I": "\u026A",
    "J": (chars, index) => {
        if (chars.slice(index, index + 3).join("") === "\\_<") {
            return ["\u0284", index + 3];
        }

        switch(chars[index]) {
            case "\\":
                return ["\u025F", index + 1];
            default:
                return ["\u0272", index];
        }
    },
    "K": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u026E", index + 1];
            default:
                return ["\u026C", index];
        }
    },
    "L": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u029F", index + 1];
            default:
                return ["\u028E", index];
        }
    },
    "M": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0270", index + 1];
            default:
                return ["\u026F", index];
        }
    },
    "N": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0274", index + 1];
            default:
                return ["\u014B", index];
        }
    },
    "O": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0298", index + 1];
            default:
                return ["\u0254", index];
        }
    },
    "P": "\u028B",
    "Q": "\u0252",
    "R": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0280", index + 1];
            default:
                return ["\u0281", index];
        }
    },
    "S": "\u0283",
    "T": "\u03B8",
    "U": "\u028A",
    "V": "\u028C",
    "W": "\u028D",
    "X": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0127", index + 1];
            default:
                return ["\u03C7", index];
        }
    },
    "Y": "\u028F",
    "Z": "\u0292",
    // 記号と数字
    ".": ".",
    "\"": "\u02C8",
    "%": "\u02CC",
    "&": "\u0276",
    "'": "\u02B2",
    "{": "\u00E6",
    "}": "\u0289",
    "1": "\u0268",
    "2": "\u00F8",
    "3": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u025E", index + 1];
            default:
                return ["\u025C", index];
        }
    },
    "4": "\u027E",
    "5": "\u026B",
    "6": "\u0250",
    "7": "\u0264",
    "8": "\u0275",
    "9": "\u0153",
    ":": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u02D1", index + 1];
            default:
                return ["\u02D0", index];
        }
    },
    "<": (chars, index) => {
        switch (chars.slice(index, index + 2).join("")) {
            case "F>":
                return ["\u2198", index + 2];
            case "R>":
                return ["\u2197", index + 2];
        }

        switch(chars[index]) {
            case "\\":
                return ["\u02A2", index + 1];
            default:
                return ["\u27E8", index];
        }
    },
    ">": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u02A1", index + 1];
            default:
                return ["\u27E9", index];
        }
    },
    "?": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0295", index + 1];
            default:
                return ["\u0294", index];
        }
    },
    "@": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u0258", index + 1];
            default:
                return ["\u0259", index];
        }
    },
    "^": "\uA71B",
    "!": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u01C3", index + 1];
            default:
                return ["\uA71C", index];
        }
    },
    "|": (chars, index) => {
        if (chars.slice(index, index + 3).join("") === "\\|\\") {
            return ["\u01C1", index + 3];
        }

        switch(chars[index]) {
            case "|":
                return  ["\u2016", index + 1];
            case "\\":
                return ["\u01C0", index + 1];
            default:
                return ["|", index];
        }
    },
    "=": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u01C2", index + 1];
            default:
                return ["\u0329", index];
        }
    },
    "-": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u203F", index + 1];
            default:
                return ["-", index];
        }
    },
    "_": getDiacritic,
    "`": "\u02DE",
    "~": "\u0303",
};

const DIACRITICS: { [key: string]: string | ((chars: string[], index: number) => [string, number]); } = {
    "\"": "\u0308",
    "+": "\u02D6",
    "_": "\u02D7",
    "/": "\u02C7",
    "0": "\u0325",
    "=": "\u0329",
    ">": "\u02BC",
    "?": (chars, index) => {
        switch(chars[index]) {
            case "\\":
                return ["\u02E4", index + 1];
            default:
                return ["?", index];
        }
    },
    "\\": "\u0302",
    "^": "\u032F",
    "}": "\u031A",
    "`": "\u02DE",
    "~": "\u0303",
    // 英字小文字
    "a": "\u033A",
    "c": "\u031C",
    "d": "\u032A",
    "e": "\u0334",
    "h": "\u02B0",
    "j": "\u02B2",
    "k": "\u0330",
    "l": "\u02E1",
    "m": "\u033B",
    "n": "\u207F",
    "o": "\u031E",
    "q": "\u0319",
    "r": "\u031D",
    "t": "\u0324",
    "v": "\u032C",
    "w": "\u02B7",
    "x": "\u033D",
    // 英字大文字
    "A": "\u0417",
    "B": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_L") {
            return ["\u1DC5", index + 2];
        }
        else {
            return ["\u030F", index];
        }
    },
    "F": "\u0302",
    "G": "\u02E0",
    "H": (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_T") {
            return ["\u1DC4", index + 2];
        }
        else {
            return ["\u0301", index];
        }
    },
    "L": "\u0300",
    "M": "\u0304",
    "N": "\u033C",
    "O": "\u0339",
    "R":  (chars, index) => {
        if (chars.slice(index, index + 2).join("") === "_F") {
            return ["\u1DC8", index + 2];
        }
        else {
            return ["\u030C", index];
        }
    },
    "T": "\u030B",
    "X": "\u02D8",
};

function getIpa(chars: string[], index: number): [string, number] {
    const char = chars[index++];
    const value = PATTERNS[char];
    switch (typeof value) {
        case "string":
            return [value, index];
        case "function":
            const ipa = value(chars, index);
            return ipa ?? [char, index];
        default:
            return [char, index];
    }
}

function getDiacritic(chars: string[], index: number): [string, number] {
    const char = chars[index++];
    const prefix = "_" + (char ?? "");
    const value = DIACRITICS[char];
    switch (typeof value) {
        case "string":
            return [value, index];
        case "function":
            const ipa =  value(chars, index);
            if (ipa && ipa[0] !== char) {
                return ipa;
            }
            else {
                return [prefix, index];
            }
        default:
            return [prefix, index];
    }
}

export default Xsampa2Ipa;
