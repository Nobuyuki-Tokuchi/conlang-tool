import { WordgenData, WordGenenerator as WordGen } from "./wordgen";

export class ReverseFrequencyWordGen implements WordGen<string[]> {
    readonly #transitionTable: Map<string, number>;
    readonly #commonData: WordgenData;

    constructor(commonData: WordgenData) {
        this.#transitionTable = new Map<string, number>();
        this.#commonData = commonData;
    }

    /**
     * 指定された単語のリストを使用して遷移表を作成します
     * @param words 遷移表を作成するために使用する単語リスト
     */
    createTable(words: string[]): void {
        const depth = this.#commonData.depth;
        this.#transitionTable.clear();
    
        for (const input of words) {
            if (input.length < 3) { continue; }

            for (let i = 0; i <= input.length - depth + 1; i++) {
                const key = input.slice(i, i + depth);
                this.#transitionTable.set(key, (this.#transitionTable.get(key) ?? 0) + 1);
            }
        }

        const max = Math.max(...this.#transitionTable.values()) + 1;
        for(const entry of this.#transitionTable.entries()) {
            this.#transitionTable.set(entry[0], Math.ceil(max - this.#transitionTable.get(entry[0])!));
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
