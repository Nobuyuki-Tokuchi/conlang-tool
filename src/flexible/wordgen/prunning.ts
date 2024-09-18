
import { WordgenData, WordGenenerator as WordGen } from "./wordgen";

export class PrunningWordGen implements WordGen {
    readonly #transitionTable: Map<string, number>;
    readonly #commonData: Readonly<WordgenData>;

    constructor(commonData: WordgenData) {
        this.#transitionTable = new Map<string, number>();
        this.#commonData = commonData;
    }

    /**
     * 指定された単語のリストを使用して遷移表を作成します
     * @param inputList 遷移表を作成するために使用する単語リスト
     */
    createTable(inputList: string[]): void {
        const depth = this.#commonData.depth;
        const depth2Map = new Map<string, number>();
        this.#transitionTable.clear();

        for (const input of inputList) {
            for (let i = 0; i < input.length - 1; i++) {
                const depth2Key = input.slice(i, i + 2);
                depth2Map.set(depth2Key, (depth2Map.get(depth2Key) ?? 0) + 1);
            }
        }

        const [min, max] = Array.from(depth2Map.values()).reduce<[number, number]>(([min, max], x) => [Math.min(min, x), Math.max(max, x)], [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
        const minKeys: string[] = [];
        const maxKeys: string[] = [];

        for (const input of inputList) {
            for (let i = 0; i <= input.length - depth + 1; i++) {
                const key = input.slice(i, i + depth);
                const depth2Key = key.slice(0, depth - 1);
                const depth2Value = depth2Map.get(depth2Key)!;

                if (depth2Value === min && !minKeys.includes(depth2Key)) {
                    minKeys.push(depth2Key);
                    continue;
                } else if (depth2Value === max && !maxKeys.includes(depth2Key)) {
                    maxKeys.push(depth2Key);
                }

                let value = (this.#transitionTable.get(key) ?? 0) + 1;
                if (maxKeys.some(x => key.startsWith(x))) {
                    value++;
                }
                this.#transitionTable.set(key, value);
            }
        }
    }

    /**
     * 作成した単語を返します
     * @returns 作成した単語
     */
    generateWord(): string {
        let word = "";
        let retryCount = 0;

        while (retryCount < this.#commonData.retryCount) {
            word = this.#tryGenerate();
            retryCount++;

            if (word.length >= this.#commonData.min && word.length <= this.#commonData.max) { break; }
        }

        return word;
    }

    #tryGenerate(): string {
        const transitions = Array.from(this.#transitionTable.entries());
        
        let chain = this.#randomWithWeight(transitions.filter(x => x[0].length === this.#commonData.depth));
        while (true) {
            // 後ろの(depth - 1)文字分を取得
            const lastChar = chain.slice(-(this.#commonData.depth - 1));
            const newChar = this.#randomWithWeight(transitions.filter(x => x[0].startsWith(lastChar)));
            
            // 前の(depth - 1)文字分は不要なため削除
            chain += newChar.slice(this.#commonData.depth - 1);
            if (newChar.length < this.#commonData.depth) { break; }
        }

        return chain;
    }

    #randomWithWeight(table: [string, number][]) {
        const totalWeight = table.reduce((a, b) => a + b[1], 0);
        const rawValue = Math.random() * totalWeight;

        let total = 0;
        for (const [key, value] of table) {
            total += value;

            if (rawValue < total) {
                return key;
            }
        }

        // あてはまるキーが存在しない場合の処理
        return "";
    }
}
