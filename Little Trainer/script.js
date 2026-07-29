var goalString = "Hello World!";
var populationSize = 20;
var generations = 1000;
var mutationPercent = 0.02;
var mutationSignificance = 0.4;
var elites = 0.2;
var useOtherMutations = false;


document.getElementById("textInput").addEventListener("input", ()=>{
    let st = document.getElementById("textInput").value;
    goalString = "";
    for (let i = 0; i < Math.min(96,st.length); i++) {
        if (st.charCodeAt(i) >= 32 && st.charCodeAt(i) <= 126) {
            goalString += st[i];
        }
    }
    
    document.getElementById("textInput").value = goalString;
    len = goalString.length;
});

document.getElementById("populationSizeInput").addEventListener("input", ()=>{
    populationSize = Math.max(2,Math.min(100,document.getElementById("populationSizeInput").value));
    population = new Array();
    for (let i = 0; i < populationSize; i++) population.push(randString());
    document.getElementById("populationSizeInput").value = populationSize;
    document.getElementById("populationSizeInput2").value = populationSize;
});
document.getElementById("populationSizeInput2").addEventListener("input", ()=>{
    populationSize = Math.max(2,Math.min(100,document.getElementById("populationSizeInput2").value));
    population = new Array();
    for (let i = 0; i < populationSize; i++) population.push(randString());
    document.getElementById("populationSizeInput").value = populationSize;
    document.getElementById("populationSizeInput2").value = populationSize;
});

document.getElementById("generationsInput").addEventListener("input", ()=>{
    generations = Math.max(10,Math.min(10000,document.getElementById("generationsInput").value));
    document.getElementById("generationsInput").value = generations;
    document.getElementById("generationsInput2").value = generations;
});
document.getElementById("generationsInput2").addEventListener("input", ()=>{
    generations = Math.max(10,Math.min(10000,document.getElementById("generationsInput2").value));
    document.getElementById("generationsInput").value = generations;
    document.getElementById("generationsInput2").value = generations;
});

document.getElementById("mutationPercentInput").addEventListener("input", ()=>{
    mutationPercent = Math.max(0,Math.min(100,document.getElementById("mutationPercentInput").value));
    document.getElementById("mutationPercentInput").value = mutationPercent;
    document.getElementById("mutationPercentInput2").value = mutationPercent;
});
document.getElementById("mutationPercentInput2").addEventListener("input", ()=>{
    mutationPercent = Math.max(0,Math.min(100,document.getElementById("mutationPercentInput2").value))/100;
    document.getElementById("mutationPercentInput").value = mutationPercent*100;
    document.getElementById("mutationPercentInput2").value = mutationPercent*100;
});

document.getElementById("mutationSignificanceInput").addEventListener("input", ()=>{
    mutationSignificance = Math.max(0,Math.min(100,document.getElementById("mutationSignificanceInput").value))/100;
    document.getElementById("mutationSignificanceInput").value = mutationSignificance*100;
    document.getElementById("mutationSignificanceInput2").value = mutationSignificance*100;
});
document.getElementById("mutationSignificanceInput2").addEventListener("input", ()=>{
    mutationSignificance = Math.max(0,Math.min(100,document.getElementById("mutationSignificanceInput2").value))/100;
    document.getElementById("mutationSignificanceInput").value = mutationSignificance*100;
    document.getElementById("mutationSignificanceInput2").value = mutationSignificance*100;
});

document.getElementById("elitesInput").addEventListener("input", ()=>{
    elites = Math.max(1,Math.min(100,document.getElementById("elitesInput").value))/100;
    eliteCount = Math.max(2, Math.floor(elites * populationSize));
    document.getElementById("elitesInput").value = elites*100;
    document.getElementById("elitesInput2").value = elites*100;
});
document.getElementById("elitesInput2").addEventListener("input", ()=>{
    elites = Math.max(1,Math.min(100,document.getElementById("elitesInput2").value))/100;
    eliteCount = Math.max(2, Math.floor(elites * populationSize));
    document.getElementById("elitesInput").value = elites*100;
    document.getElementById("elitesInput2").value = elites*100;
});

document.getElementById("useOtherMutationsInput").addEventListener("input", ()=>{
    useOtherMutations = document.getElementById("useOtherMutationsInput").checked;
    document.getElementById("mutationSignificanceLabel").style.display = (useOtherMutations ? "none" : "initial");
    document.getElementById("mutationSignificanceInput").style.display = (useOtherMutations ? "none" : "initial");
    document.getElementById("mutationSignificanceInput2").style.display = (useOtherMutations ? "none" : "initial");
});


let len = goalString.length;
let eliteCount = Math.max(2, Math.floor(elites * populationSize));
let population = new Array();

function randChar() {
    // for (let i = 32; i < 127; i++) console.log(i, String.fromCharCode(i));
    return String.fromCharCode(Math.floor(Math.random()*(127-32)+32));
}

function randString() {
    let st = "";
    for (let i = 0; i < len; i++) st += randChar();
    return st;
}

function evalString(st) {
    let score = 0;
    let diff = 0;
    for (let i = 0; i < len; i++) {
        if (st[i] == goalString[i]) score+=1;
        diff += Math.abs(st.charCodeAt(i) - goalString.charCodeAt(i));
    }
    diff /= len;
    score = score * 1.5 - diff * 0.25;
    return score;
}

async function evo() {
    let scores = new Array();
    for (let i = 0; i < populationSize; i++) {
        scores.push({i:i, s:evalString(population[i])});
    }
    scores.sort((a, b) => { return b.s - a.s; });

    for (let i = eliteCount; i < populationSize; i++) {
        let p1 = Math.floor(eliteCount*(Math.random()**2));
        let p2 = Math.floor(eliteCount*(Math.random()**2));
        let j1 = Math.floor(len*(0.6*Math.random()+0.2));
        population[scores[i].i] = population[scores[p1].i].slice(0, j1) + population[scores[p2].i].slice(j1, len);
        if (useOtherMutations) {
            for (let j = 0; j < len; j++) {
                if (Math.random() < mutationPercent) {
                    population[scores[i].i] = population[scores[i].i].slice(0, j) + randChar() + population[scores[i].i].slice(j + 1);
                }
            }
        } else {
            if (Math.random() < mutationPercent) {
                let mutationC = 1 + Math.floor(mutationSignificance*(len-1)*Math.random());
                for (let j = 0; j < mutationC; j++) {
                    let idx = Math.floor(Math.random() * len);
                    population[scores[i].i] = population[scores[i].i].slice(0, idx) + randChar() + population[scores[i].i].slice(idx + 1);
                }
            }
        }
    }
    
    return {s: scores[0].s, st: population[scores[0].i]};
}

for (let i = 0; i < populationSize; i++) population.push(randString());


async function train() {
    console.log(useOtherMutations);
    const tick = () => new Promise(requestAnimationFrame); // const sleep = () => new Promise(resolve => setTimeout(resolve, 0));

    document.getElementById("startButton").disabled = true;
    document.getElementById("populationSizeInput").disabled = true;
    document.getElementById("populationSizeInput2").disabled = true;
    document.getElementById("generationsInput").disabled = true;
    document.getElementById("generationsInput2").disabled = true;
    document.getElementById("mutationPercentInput").disabled = true;
    document.getElementById("mutationPercentInput2").disabled = true;
    document.getElementById("mutationSignificanceInput").disabled = true;
    document.getElementById("mutationSignificanceInput2").disabled = true;
    document.getElementById("elitesInput").disabled = true;
    document.getElementById("elitesInput2").disabled = true;
    document.getElementById("useOtherMutationsInput").disabled = true;

    let textarea = document.getElementById("log");
    textarea.value = "";
    population = new Array();
    for (let i = 0; i < populationSize; i++) population.push(randString());
    let res;

    for (let i = 0; i < generations; i++) {
        res = await evo();
        textarea.value += `Generation ${"0".repeat(Math.log10(generations) - i.toString().length)}${i}:  ${(res.s/(len*1.5)*10).toFixed(4)}   ${res.st}\n`;

        if (i % 25 === 0 || res.st == goalString || i == generations - 1) {
            textarea.scrollTop = textarea.scrollHeight;
            await tick(); // await sleep();
        }
        if (res.st == goalString) break;
    }
    textarea.value += "Goal:" + " ".repeat(`Generation ${generations}:  ${(res.s/(len*1.5)*10).toFixed(4)}  `.length - 5)+ `${goalString}`;
    // document.getElementById("log").scrollTo({
    //   top: document.getElementById("log").scrollHeight,
    //   behavior: 'smooth'
    // });
    document.getElementById("startButton").disabled = false;
    document.getElementById("populationSizeInput").disabled = false;
    document.getElementById("populationSizeInput2").disabled = false;
    document.getElementById("generationsInput").disabled = false;
    document.getElementById("generationsInput2").disabled = false;
    document.getElementById("mutationPercentInput").disabled = false;
    document.getElementById("mutationPercentInput2").disabled = false;
    document.getElementById("mutationSignificanceInput").disabled = false;
    document.getElementById("mutationSignificanceInput2").disabled = false;
    document.getElementById("elitesInput").disabled = false;
    document.getElementById("elitesInput2").disabled = false;
    document.getElementById("useOtherMutationsInput").disabled = false;
}
