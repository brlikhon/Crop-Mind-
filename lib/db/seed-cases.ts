import { pool } from "./src/index.js";
import { generateEmbeddingAsync, buildCaseText, getEmbeddingMode, EMBEDDING_DIMENSIONS } from "../../artifacts/api-server/src/vectors/embedding.js";

interface CaseTemplate {
  cropType: string;
  country: string;
  region: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  outcomeRange: [number, number];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const templates: CaseTemplate[] = [
  { cropType: "rice", country: "India", region: "Punjab", symptoms: "yellowing leaves, stunted growth, root rot", diagnosis: "Bacterial Leaf Blight (Xanthomonas oryzae)", treatment: "Applied streptomycin sulfate 500ppm, drained fields, copper oxychloride spray", outcomeRange: [0.6, 0.9] },
  { cropType: "rice", country: "India", region: "West Bengal", symptoms: "brown spots on leaves, necrotic lesions, leaf tips dying", diagnosis: "Brown Spot (Cochliobolus miyabeanus)", treatment: "Applied mancozeb 75 WP at 2g/L, improved drainage, foliar zinc application", outcomeRange: [0.5, 0.85] },
  { cropType: "rice", country: "India", region: "Tamil Nadu", symptoms: "diamond shaped lesions on leaves, nodes rotting, panicle blast", diagnosis: "Rice Blast (Magnaporthe oryzae)", treatment: "Applied tricyclazole 75 WP at 0.6g/L, reduced nitrogen, increased spacing", outcomeRange: [0.55, 0.8] },
  { cropType: "rice", country: "India", region: "Andhra Pradesh", symptoms: "whitish elongated galls on leaves, silver shoot tillers", diagnosis: "Rice Gall Midge (Orseolia oryzae)", treatment: "Applied carbofuran 3G in root zone, planted resistant variety", outcomeRange: [0.5, 0.75] },
  { cropType: "rice", country: "Thailand", region: "Central Plains", symptoms: "brown planthopper at base, hopperburn, wilting", diagnosis: "Brown Planthopper (Nilaparvata lugens)", treatment: "Applied imidacloprid 17.8 SL, drained fields, alternate wetting and drying", outcomeRange: [0.6, 0.85] },
  { cropType: "rice", country: "Thailand", region: "Isaan", symptoms: "elongated lesions with grey centers on leaves, collar blast", diagnosis: "Rice Blast (Magnaporthe oryzae)", treatment: "Isoprothiolane 40 EC spray, planted resistant KDML variety, adjusted planting date", outcomeRange: [0.5, 0.8] },
  { cropType: "rice", country: "Philippines", region: "Central Luzon", symptoms: "deadheart in tillers, caterpillars in stems, whiteheads", diagnosis: "Rice Stem Borer (Scirpophaga incertulas)", treatment: "Released Trichogramma parasitoids, applied fipronil 5G, removed stubble", outcomeRange: [0.55, 0.8] },
  { cropType: "rice", country: "Philippines", region: "Western Visayas", symptoms: "orange discoloration, sheath rot, foul smell from sheaths", diagnosis: "Sheath Rot (Sarocladium oryzae)", treatment: "Applied carbendazim 50 WP, reduced plant density, balanced NPK", outcomeRange: [0.4, 0.7] },
  { cropType: "rice", country: "Vietnam", region: "Mekong Delta", symptoms: "yellowing from leaf tip, tungro virus symptoms, green leafhoppers present", diagnosis: "Rice Tungro Virus (RTSV + RTBV)", treatment: "Removed infected plants, controlled green leafhopper vectors, planted tolerant variety", outcomeRange: [0.3, 0.6] },
  { cropType: "rice", country: "Bangladesh", region: "Rangpur", symptoms: "yellow stem borer damage, dead hearts, white ears at maturity", diagnosis: "Yellow Stem Borer (Scirpophaga incertulas)", treatment: "Applied cartap hydrochloride 4G, installed pheromone traps, clean cultivation", outcomeRange: [0.5, 0.75] },
  { cropType: "rice", country: "Japan", region: "Niigata", symptoms: "sheath blight lesions, grey-white irregular spots near waterline", diagnosis: "Sheath Blight (Rhizoctonia solani)", treatment: "Applied validamycin A, intermittent irrigation, reduced planting density", outcomeRange: [0.7, 0.95] },
  { cropType: "rice", country: "Malaysia", region: "Kedah", symptoms: "leaf folder damage, rolled leaves, reduced photosynthesis", diagnosis: "Rice Leaf Folder (Cnaphalocrocis medinalis)", treatment: "Applied chlorantraniliprole 18.5 SC, maintained natural enemies, monitored threshold", outcomeRange: [0.65, 0.9] },
  { cropType: "rice", country: "Indonesia", region: "Java", symptoms: "bacterial leaf streak, amber colored translucent lesions", diagnosis: "Bacterial Leaf Streak (Xanthomonas oryzae pv. oryzicola)", treatment: "Applied copper hydroxide, improved field drainage, adjusted nitrogen", outcomeRange: [0.45, 0.75] },
  { cropType: "wheat", country: "India", region: "Punjab", symptoms: "yellow striped pustules on leaves, reduced tillering, early senescence", diagnosis: "Yellow Rust (Puccinia striiformis)", treatment: "Applied propiconazole 25 EC at 0.1%, switched to resistant HD-3226 variety", outcomeRange: [0.65, 0.9] },
  { cropType: "wheat", country: "India", region: "Uttar Pradesh", symptoms: "brown oval pustules on leaves, stem rust, reduced grain filling", diagnosis: "Brown Rust (Puccinia triticina)", treatment: "Applied tebuconazole 250 EC, timely sowing, avoided late nitrogen", outcomeRange: [0.6, 0.85] },
  { cropType: "wheat", country: "India", region: "Haryana", symptoms: "powdery white coating on leaves, reduced photosynthesis", diagnosis: "Powdery Mildew (Blumeria graminis)", treatment: "Applied sulfur 80 WP at 2.5g/L, improved air circulation, resistant variety", outcomeRange: [0.7, 0.9] },
  { cropType: "wheat", country: "Pakistan", region: "Punjab Pakistan", symptoms: "black stem rust pustules, lodging, shriveled grains", diagnosis: "Stem Rust (Puccinia graminis)", treatment: "Applied propiconazole + tebuconazole, early harvesting, resistant variety", outcomeRange: [0.5, 0.8] },
  { cropType: "wheat", country: "Australia", region: "New South Wales", symptoms: "stripe rust on flag leaves, reduced yield, green leaf area loss", diagnosis: "Stripe Rust (Puccinia striiformis)", treatment: "Applied epoxiconazole + pyraclostrobin, variety rotation, seed treatment", outcomeRange: [0.7, 0.95] },
  { cropType: "tomato", country: "India", region: "Maharashtra", symptoms: "leaf curling upward, stunted plants, small flowers dropping", diagnosis: "Tomato Leaf Curl Virus (ToLCV)", treatment: "Removed infected plants, controlled whitefly with neem oil, planted Arka Rakshak", outcomeRange: [0.3, 0.6] },
  { cropType: "tomato", country: "India", region: "Karnataka", symptoms: "dark brown water soaked spots on leaves and fruits, late blight advancing", diagnosis: "Late Blight (Phytophthora infestans)", treatment: "Applied mancozeb + metalaxyl MZ-72 at 2.5g/L, removed infected parts, staked plants", outcomeRange: [0.5, 0.8] },
  { cropType: "tomato", country: "India", region: "Andhra Pradesh", symptoms: "small circular spots with concentric rings, lower leaves affected first", diagnosis: "Early Blight (Alternaria solani)", treatment: "Applied chlorothalonil 75 WP, mulching, crop rotation with non-solanaceous crops", outcomeRange: [0.6, 0.85] },
  { cropType: "tomato", country: "Philippines", region: "Benguet", symptoms: "bacterial wilt, entire plant wilting suddenly, vascular browning", diagnosis: "Bacterial Wilt (Ralstonia solanacearum)", treatment: "Soil solarization, grafted on resistant rootstock, raised beds, biological control", outcomeRange: [0.35, 0.65] },
  { cropType: "cotton", country: "India", region: "Gujarat", symptoms: "pink bollworm larvae in bolls, premature boll opening, rosette flowers", diagnosis: "Pink Bollworm (Pectinophora gossypiella)", treatment: "Pheromone traps, released Trichogramma, spinosad 45 SC, refuge planting", outcomeRange: [0.5, 0.75] },
  { cropType: "cotton", country: "India", region: "Maharashtra", symptoms: "sucking pest damage, honeydew on leaves, sooty mold, whitefly", diagnosis: "Whitefly with Cotton Leaf Curl Virus", treatment: "Applied spiromesifen 22.9 SC, neem seed extract, yellow sticky traps", outcomeRange: [0.4, 0.7] },
  { cropType: "cotton", country: "Pakistan", region: "Sindh", symptoms: "jassid damage, leaf curling downward, reddening, cotton leaf curl", diagnosis: "Cotton Leaf Curl Disease (CLCuD)", treatment: "Rogued infected plants, controlled jassid vector, planted tolerant variety", outcomeRange: [0.3, 0.55] },
  { cropType: "coffee", country: "Vietnam", region: "Central Highlands", symptoms: "orange-yellow powder on leaf undersides, defoliation exceeding 40%", diagnosis: "Coffee Leaf Rust (Hemileia vastatrix)", treatment: "Applied copper Bordeaux mixture 1%, pruned for air flow, replanted resistant clones", outcomeRange: [0.5, 0.8] },
  { cropType: "coffee", country: "Vietnam", region: "Lam Dong", symptoms: "coffee berry borer holes, premature fruit drop, damaged beans", diagnosis: "Coffee Berry Borer (Hypothenemus hampei)", treatment: "Deployed Beauveria bassiana biocontrol, alcohol traps, strip picking", outcomeRange: [0.45, 0.7] },
  { cropType: "coffee", country: "Indonesia", region: "Sumatra", symptoms: "root rot, wilting plants, yellowing canopy, fungal mat at base", diagnosis: "Coffee Root Disease (Rigidoporus microporus)", treatment: "Removed infected roots, applied sulfur, planted barrier crops, Trichoderma", outcomeRange: [0.35, 0.6] },
  { cropType: "palm oil", country: "Indonesia", region: "Kalimantan", symptoms: "v-shaped cuts on fronds, bore holes in crown, rhinoceros beetle larvae", diagnosis: "Rhinoceros Beetle (Oryctes rhinoceros)", treatment: "Applied Metarhizium anisopliae, pheromone traps, shredded old trunks", outcomeRange: [0.6, 0.85] },
  { cropType: "palm oil", country: "Malaysia", region: "Sabah", symptoms: "ganoderma basal stem rot, bracket fungus at base, reduced yield", diagnosis: "Basal Stem Rot (Ganoderma boninense)", treatment: "Soil mounding, hexaconazole trunk injection, Trichoderma biological control", outcomeRange: [0.3, 0.55] },
  { cropType: "sugarcane", country: "India", region: "Uttar Pradesh", symptoms: "red rot in stalks, red discoloration with white spots, drought stress", diagnosis: "Red Rot (Colletotrichum falcatum)", treatment: "Used disease-free sett material, hot water treatment 54C for 2hrs, Co-0238 variety", outcomeRange: [0.5, 0.8] },
  { cropType: "sugarcane", country: "India", region: "Maharashtra", symptoms: "top borer damage, dead heart, bore holes in upper stalks", diagnosis: "Sugarcane Top Borer (Scirpophaga excerptalis)", treatment: "Released Trichogramma, removed dead hearts, light traps, earthing up", outcomeRange: [0.55, 0.8] },
  { cropType: "rubber", country: "Thailand", region: "Southern Thailand", symptoms: "abnormal leaf fall, shot hole lesions, defoliation in rainy season", diagnosis: "Abnormal Leaf Fall Disease (Phytophthora spp.)", treatment: "Applied copper oxychloride aerial spray, phosphonic acid, improved drainage", outcomeRange: [0.5, 0.75] },
  { cropType: "tea", country: "India", region: "Assam", symptoms: "blister blight on young leaves, white translucent blisters, leaf distortion", diagnosis: "Blister Blight (Exobasidium vexans)", treatment: "Applied copper oxychloride at 0.2%, plucking round, hexaconazole spray", outcomeRange: [0.6, 0.85] },
  { cropType: "coconut", country: "Philippines", region: "Eastern Visayas", symptoms: "coconut scale insect, yellowing fronds, reduced nut production", diagnosis: "Coconut Scale Insect (Aspidiotus rigidus)", treatment: "Released predator beetle Chilocorus nigrita, pruned infected fronds, nutrition", outcomeRange: [0.55, 0.8] },
  { cropType: "coconut", country: "India", region: "Kerala", symptoms: "rhinoceros beetle bore holes, crown damage, chewed out leaf bases", diagnosis: "Rhinoceros Beetle (Oryctes rhinoceros) on coconut", treatment: "Placed naphthalene balls in crown, rhinolure traps, Metarhizium application", outcomeRange: [0.6, 0.85] },
  { cropType: "banana", country: "Philippines", region: "Mindanao", symptoms: "panama wilt, yellowing leaves, pseudostem splitting, vascular browning", diagnosis: "Fusarium Wilt TR4 (Fusarium oxysporum f.sp. cubense)", treatment: "Quarantined area, destroyed infected plants, planted resistant GCTCV-219, biofumigation", outcomeRange: [0.2, 0.5] },
  { cropType: "mango", country: "India", region: "Uttar Pradesh", symptoms: "powdery white growth on inflorescence, flower drop, no fruit set", diagnosis: "Powdery Mildew (Oidium mangiferae)", treatment: "Applied wettable sulfur 80 WP pre-bloom, carbendazim at fruit set", outcomeRange: [0.65, 0.9] },
  { cropType: "potato", country: "India", region: "Uttar Pradesh", symptoms: "late blight spreading rapidly, water soaked lesions, white sporulation", diagnosis: "Late Blight (Phytophthora infestans)", treatment: "Applied cymoxanil + mancozeb, removed infected foliage, adjusted irrigation", outcomeRange: [0.5, 0.8] },
  { cropType: "chili", country: "India", region: "Andhra Pradesh", symptoms: "fruit rot, anthracnose spots, curling and drying of fruits", diagnosis: "Chili Anthracnose (Colletotrichum capsici)", treatment: "Applied carbendazim 50 WP, copper oxychloride, removed infected fruits, rotation", outcomeRange: [0.5, 0.75] },
  { cropType: "onion", country: "India", region: "Maharashtra", symptoms: "purple blotch on leaves, tip dieback, bulb rot in storage", diagnosis: "Purple Blotch (Alternaria porri)", treatment: "Applied mancozeb 75 WP alternating with chlorothalonil, improved drainage", outcomeRange: [0.55, 0.8] },
  { cropType: "soybean", country: "India", region: "Madhya Pradesh", symptoms: "rust pustules on leaf undersides, premature defoliation, pod abortion", diagnosis: "Soybean Rust (Phakopsora pachyrhizi)", treatment: "Applied propiconazole 25 EC at 0.1%, early planting, monitoring for pustules", outcomeRange: [0.55, 0.8] },
  { cropType: "corn", country: "Philippines", region: "Bukidnon", symptoms: "fall armyworm larvae feeding on whorl, ragged holes, frass", diagnosis: "Fall Armyworm (Spodoptera frugiperda)", treatment: "Applied emamectin benzoate 5 SG, released Telenomus parasitoid, handpicking", outcomeRange: [0.5, 0.8] },
  { cropType: "rice", country: "India", region: "Odisha", symptoms: "bacterial leaf streak with amber ooze, narrow streaks between veins", diagnosis: "Bacterial Leaf Streak (Xanthomonas oryzae pv. oryzicola)", treatment: "Applied streptocycline 500ppm, reduced nitrogen, improved water management", outcomeRange: [0.45, 0.7] },
  { cropType: "rice", country: "Pakistan", region: "Sindh", symptoms: "heavy whitefly population, sooty mold, honeydew, reduced grain quality", diagnosis: "Rice Whitefly (Aleurocybotus indicus)", treatment: "Applied thiamethoxam 25 WG, yellow sticky traps, neem oil 3000ppm", outcomeRange: [0.5, 0.75] },
  { cropType: "groundnut", country: "India", region: "Gujarat", symptoms: "tikka disease spots, defoliation, reduced pod filling, concentric rings", diagnosis: "Tikka Disease (Cercospora arachidicola)", treatment: "Applied carbendazim + mancozeb, seed treatment with thiram, crop rotation", outcomeRange: [0.55, 0.8] },
  { cropType: "rice", country: "Vietnam", region: "Red River Delta", symptoms: "sheath blight, oval lesions near water line, greyish white centers", diagnosis: "Sheath Blight (Rhizoctonia solani)", treatment: "Applied hexaconazole 5 EC, intermittent irrigation, reduced seeding rate", outcomeRange: [0.6, 0.85] },
  { cropType: "pepper", country: "Vietnam", region: "Binh Phuoc", symptoms: "slow decline, yellowing leaves, root rot, wilting in dry season", diagnosis: "Quick Wilt / Foot Rot (Phytophthora capsici)", treatment: "Applied metalaxyl drench, improved drainage, Trichoderma, raised beds", outcomeRange: [0.35, 0.6] },
  { cropType: "cassava", country: "Thailand", region: "Nakhon Ratchasima", symptoms: "cassava mosaic disease, leaf distortion, yellow mosaic pattern", diagnosis: "Sri Lankan Cassava Mosaic Virus (SLCMV)", treatment: "Removed infected plants, planted clean stakes, controlled whitefly, resistant variety", outcomeRange: [0.4, 0.7] },
  { cropType: "durian", country: "Thailand", region: "Chanthaburi", symptoms: "phytophthora root rot, gum exudation on trunk, canopy thinning", diagnosis: "Phytophthora Root Rot (Phytophthora palmivora)", treatment: "Applied phosphonic acid trunk injection, metalaxyl drench, improved drainage", outcomeRange: [0.45, 0.7] },
];

function generateVariant(template: CaseTemplate, variantIdx: number) {
  const rng = mulberry32(hashCode(template.cropType + template.country + variantIdx.toString()));

  const symptomWords = template.symptoms.split(", ");
  const shuffled = [...symptomWords].sort(() => rng() - 0.5);
  const numSymptoms = Math.max(2, Math.floor(rng() * symptomWords.length) + 1);
  const selectedSymptoms = shuffled.slice(0, numSymptoms);
  const severityAdj = ["mild", "moderate", "severe", "widespread", "localized", "progressive", "intermittent"][Math.floor(rng() * 7)];
  const symptomsText = `${severityAdj} ${selectedSymptoms.join(", ")}`;

  const [minOutcome, maxOutcome] = template.outcomeRange;
  const outcomeScore = Math.round((minOutcome + rng() * (maxOutcome - minOutcome)) * 100) / 100;

  const daysAgo = Math.floor(rng() * 730) + 30;
  const resolvedAt = new Date(Date.now() - daysAgo * 86400000);

  const caseText = buildCaseText({
    cropType: template.cropType, country: template.country, region: template.region,
    symptoms: symptomsText, diagnosis: template.diagnosis, treatment: template.treatment,
  });

  return {
    caseId: `CASE-${template.country.substring(0, 2).toUpperCase()}-${template.cropType.substring(0, 3).toUpperCase()}-${String(variantIdx).padStart(4, "0")}`,
    cropType: template.cropType,
    country: template.country,
    region: template.region,
    symptomsText,
    diagnosis: template.diagnosis,
    treatmentApplied: template.treatment,
    outcomeScore,
    resolvedAt,
    caseText,
  };
}

async function seed() {
  console.log("Seeding crop cases with vector embeddings...");
  console.log(`Embedding dimensions: ${EMBEDDING_DIMENSIONS}`);

  const firstEmbedding = await generateEmbeddingAsync("probe for embedding mode");
  console.log(`Embedding mode: ${getEmbeddingMode()} (vector length: ${firstEmbedding.length})`);

  const client = await pool.connect();

  try {
    await client.query("DELETE FROM crop_cases");

    const casesPerTemplate = Math.ceil(520 / templates.length);
    let totalInserted = 0;

    for (let tIdx = 0; tIdx < templates.length; tIdx++) {
      const template = templates[tIdx];
      for (let v = 0; v < casesPerTemplate; v++) {
        const globalIdx = tIdx * casesPerTemplate + v;
        const c = generateVariant(template, globalIdx);

        const embedding = await generateEmbeddingAsync(c.caseText);
        const vecStr = `[${embedding.join(",")}]`;

        await client.query(
          `INSERT INTO crop_cases (case_id, crop_type, country, region, symptoms_text, diagnosis, treatment_applied, outcome_score, resolved_at, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [c.caseId, c.cropType, c.country, c.region, c.symptomsText, c.diagnosis, c.treatmentApplied, c.outcomeScore, c.resolvedAt, vecStr]
        );

        totalInserted++;
        if (totalInserted % 100 === 0) console.log(`  Inserted ${totalInserted} cases...`);
      }
    }

    console.log(`Seeded ${totalInserted} crop cases across ${templates.length} disease templates.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => { console.error(e); process.exit(1); });
