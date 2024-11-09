import { createSignal, Index, JSX } from 'solid-js';
import './App.css';
import { Dynamic } from 'solid-js/web';

import Flexible from './flexible/flexible';
import * as flexible from './flexible/flexible';
import WordGene from './wordgene/wordgene';
import * as wordgene from './wordgene/wordgene';
import PZatlin from './pzatlin/pzatlin';
import * as pzatlin from './pzatlin/pzatlin';
import Hah from './hahcompress/hah';
import * as hah from './hahcompress/hah';
import WakofalConjugation from './wakofal-conjugation/wakofal-conjugation';
import * as wakofalConjugation from "./wakofal-conjugation/wakofal-conjugation";

function App() {
    const [selectedTab, setSelectedTab] = createSignal(0);
    const flexData = flexible.createData();
    const wordgeneData = wordgene.createData();
    const zatlinData = pzatlin.createData();
    const hahData = hah.createData();
    const wakofalConjugationData = wakofalConjugation.createData();

    const menulist: [string,() => JSX.Element][] = [
        ["flexible", () => <Flexible {...flexData.getters} update={(key, value) => flexData.update(key, value)} />],
        ["wordgene", () => <WordGene {...wordgeneData.getters} update={(key, value) => wordgeneData.update(key, value)} />],
        ["zatlin", () => <PZatlin {...zatlinData.getters} update={(key, value) => zatlinData.update(key, value)} />],
        ["hah", () => <Hah {...hahData.getters} update={(key, value) => hahData.update(key, value)} />],
        ["wakofal conjugation", () => <WakofalConjugation {...wakofalConjugationData.getters} update={(key, value) => wakofalConjugationData.update(key, value)} />]
    ];

    return (
        <>
            <menu class="tab-menu">
                <Index each={menulist}>
                    {(item, index) => <li><button onclick={() => setSelectedTab(index)}>{item()[0]}</button></li>}
                </Index>
            </menu>
            <Dynamic component={menulist[selectedTab()][1]} />
        </>
    );
}

export default App;
