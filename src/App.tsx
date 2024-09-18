import { createSignal, Index, JSX } from 'solid-js';
import './App.css';
import { Dynamic } from 'solid-js/web';

import Flexible from './flexible/flexible';
import * as flexible from './flexible/flexible';
import PZatlin from './pzatlin/pzatlin';
import * as pzatlin from './pzatlin/pzatlin';
import WordGene from './wordgene/wordgene';
import * as wordgene from './wordgene/wordgene';

function App() {
    const [selectedTab, setSelectedTab] = createSignal(0);
    const flexData = flexible.createData();
    const zatlinData = pzatlin.createData();
    const wordgeneData = wordgene.createData();

    const menulist: [string,() => JSX.Element][] = [
        ["flexible", () => <Flexible {...flexData.getters} update={(key, value) => flexData.update(key, value)} />],
        ["wordgene", () => <WordGene {...wordgeneData.getters} update={(key, value) => wordgeneData.update(key, value)} />],
        ["zatlin", () => <PZatlin {...zatlinData.getters} update={(key, value) => zatlinData.update(key, value)} />],
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
