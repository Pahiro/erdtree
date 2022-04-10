let CLASSES;
let TALISMANS;
let HELMETS;

const STAT_SHORT_NAMES = ["vig.", "mnd.", "end.", "str.", "dex.", "int.", "fth.", "arc."];

const selected = select => select.options[select.selectedIndex];

async function init() {
    // fetch and await data sources
    CLASSES = await fetch("/data/classes.json").then(response => response.json());
    TALISMANS = await fetch("/data/talismans.json").then(response => response.json());
    HELMETS = await fetch("/data/helmets.json").then(response => response.json());

    // populate helmet select
    let destination = document.getElementById("helmet");
    Object.values(HELMETS)
        .filter(helmet => helmet.stats != null)
        .forEach(helmet => destination.options.add(new Option(helmet.name, helmet.id)));

    // populate talisman list
    let template = document.getElementById("talisman");
    destination = document.getElementById("talismans");

    Object.values(TALISMANS)
        .filter(talisman => talisman.stats != null && !talisman.id.includes("scar"))
        .forEach(item => {
            let clone = template.content.cloneNode(true);
            let li = clone.children[0];

            let input = li.children[0].children[0];
            let label = li.children[0].children[1];
            let aside = li.children[1];

            input.id = item.id;
            input.value = item.id;
            label.htmlFor = item.id;
            label.innerHTML = item.name;
            aside.innerHTML = statsDescription(item.stats);

            destination.appendChild(clone);
        });

    update();
}

function update() {
    // get inputted stats, clamp value to 0..99
    let total = [...document.getElementsByName("total")].map(elem => {
        elem.value = Math.min(Math.max(elem.value, 0), 99) || null;
        return parseInt(elem.value) || 0;
    });

    // get added stats from items
    let items = itemStats([...Object.values(TALISMANS), ...Object.values(HELMETS)]);

    // calculate best class
    let sorted = sortClasses(
        Object.values(CLASSES),
        total.map((stat, i) => stat - items[i]),
    );
    let best = sorted[0];

    // update document
    document.getElementsByName("initial").forEach((elem, i) => (elem.value = best.stats[i]));
    document.getElementsByName("final").forEach((elem, i) => {
        elem.value = Math.max(total[i] - items[i], best.stats[i]);
    });
    document.getElementsByName("virtual").forEach((elem, i) => {
        elem.value = Math.max(total[i], best.stats[i] + items[i]);
    });

    document.getElementById("initial-level").value = best.stats.reduce((sum, n) => sum + n) - 79;
    document.getElementById("final-level").value = best.total;
    document.getElementById("virtual-level").value = best.total + items.reduce((sum, n) => sum + n);

    // update best classes
    document.getElementById("best").value = best.name;
    let destination = document.getElementById("classes");
    destination.innerHTML = "";
    let template = document.getElementById("class");
    sorted.forEach(c => {
        let clone = template.content.cloneNode(true);
        let li = clone.children[0];
        let span = li.children[0];
        let aside = li.children[1];

        span.innerHTML = c.name;
        aside.innerHTML = "lvl. " + c.total;

        destination.appendChild(clone);
    });

    // update talismans
    let talismans = [...document.getElementsByName("talisman")];
    if (talismans.filter(checkbox => checkbox.checked).length >= 4) {
        talismans.forEach(checkbox => (checkbox.disabled = !checkbox.checked));
    } else {
        talismans.forEach(checkbox => (checkbox.disabled = false));
    }
}

function delta(classStats, final) {
    return classStats.map((stat, i) => (stat < final[i] ? final[i] - stat : 0)).reduce((total, n) => total + n);
}

function sortClasses(classes, desiredStats) {
    return classes
        .map(c => {
            c.total = c.level + delta(c.stats, desiredStats);
            return c;
        })
        .sort((a, b) => a.total - b.total);
}

function itemStats(relevantItems) {
    let helmet = selected(document.getElementById("helmet")).value;
    let talismans = [...document.getElementsByName("talisman")].filter(t => t.checked).map(t => t.value);

    ids = [helmet, ...talismans];
    return relevantItems
        .filter(item => ids.includes(item.id))
        .reduce((total, item) => total.map((stat, i) => (stat += item.stats[i])), [0, 0, 0, 0, 0, 0, 0, 0]);
}

function resetAll() {
    document.getElementsByName("total").forEach(elem => (elem.value = null));
    document.getElementById("helmet").selectedIndex = 0;
    [...document.getElementsByName("talisman")].forEach(elem => (elem.checked = false));

    update();
}

function statsDescription(stats) {
    return stats.reduce((total, stat, i) => {
        return stat ? total + " +" + stat + STAT_SHORT_NAMES[i] : total;
    }, "");
}
