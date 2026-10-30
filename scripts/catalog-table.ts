// Prints the derived strengths, speed and cost for every model: `npm run catalog`.
import { MODELS } from "../src/data/models";
for (const m of MODELS) console.log(m.name.padEnd(22), JSON.stringify(m.strengths).replace(/"/g, ""), "speed", m.speed, "cost", m.cost);
