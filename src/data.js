/* ── LabSpark data: experiment catalog + acid-base substance model ── */
import { C, SCI } from "./tokens.js";

/* Substances for the Acid–Base Indicators experiment.
   blue = what blue litmus becomes, red = what red litmus becomes,
   uni = universal-indicator colour + pH, type = acid|base|neutral  */
const SUBSTANCES = [
  { 
    id: "hcl", 
    name: "Hydrochloric Acid", 
    formula: "HCl",
    emoji: "🧪", 
    liquid: "#f1f5f9", 
    type: "acid",
    blue: "#e8443a", 
    red: "#e8443a", 
    uni: { c: "#e8443a", ph: 1 },
    hint: "A strong mineral acid found in laboratory desks and stomach gastric juices.",
    question: {
      q: "Hydrochloric Acid (HCl) is a strong acid. What happens to its hydrogen atoms when dissolved in water?",
      options: [
        "They dissociate completely into free H+ ions",
        "They remain tightly bonded to chlorine atoms"
      ],
      ans: 0,
      correctMsg: "Correct! HCl is a strong acid because it completely separates (dissociates) in water, yielding high concentrations of free hydrogen H+ ions!",
      incorrectMsg: "No, a strong acid is characterized by complete dissociation in aqueous solutions. Give it another try!"
    }
  },
  { 
    id: "naoh", 
    name: "Sodium Hydroxide", 
    formula: "NaOH",
    emoji: "🧪", 
    liquid: "#eaf0f6", 
    type: "base",
    blue: "#5a4fc4", 
    red: "#5a4fc4", 
    uni: { c: "#5a4fc4", ph: 13 },
    hint: "Known as caustic soda, it is a highly reactive strong base used in manufacturing soap.",
    question: {
      q: "Sodium Hydroxide (NaOH) is a strong base. What ions does it release when dissolved in water?",
      options: [
        "Hydrogen ions (H+)",
        "Hydroxide ions (OH-)"
      ],
      ans: 1,
      correctMsg: "Spot on! Bases dissociate in water to release hydroxide (OH-) ions, which are highly reactive and turn red litmus paper blue!",
      incorrectMsg: "Incorrect. Remember that acids release H+ ions, whereas bases are defined by releasing OH- ions. Try again!"
    }
  },
  { 
    id: "hno3", 
    name: "Nitric Acid", 
    formula: "HNO3",
    emoji: "🧪", 
    liquid: "#f8f9eb", 
    type: "acid",
    blue: "#e8443a", 
    red: "#e8443a", 
    uni: { c: "#e8443a", ph: 1 },
    hint: "A highly corrosive mineral acid used to manufacture fertilizers and explosives.",
    question: {
      q: "Nitric Acid (HNO3) is highly corrosive. What pH value do you expect from a dilute strong acid like this?",
      options: [
        "pH 1 to 2 (Strongly Acidic)",
        "pH 5 to 6 (Weakly Acidic)"
      ],
      ans: 0,
      correctMsg: "Absolutely correct! Dilute solutions of strong mineral acids like HNO3 have a extremely high concentration of hydrogen ions, placing them around pH 1 to 2!",
      incorrectMsg: "No, because HNO3 dissociates fully, the H+ concentration is extremely high, resulting in a low pH value (pH 1-2). Try again!"
    }
  },
  { 
    id: "nh4oh", 
    name: "Ammonium Hydroxide", 
    formula: "NH4OH",
    emoji: "🧪", 
    liquid: "#eef6f9", 
    type: "base",
    blue: "#5a4fc4", 
    red: "#5a4fc4", 
    uni: { c: "#5a4fc4", ph: 10 },
    hint: "A weak base found in window cleaning fluids and household detergents.",
    question: {
      q: "Ammonium Hydroxide is a weak base. What does it mean for a base or acid to be 'weak'?",
      options: [
        "It only partially dissociates into ions in water",
        "It cannot dissolve in water at all"
      ],
      ans: 0,
      correctMsg: "Perfect! A weak acid or base only partially splits (dissociates) in aqueous solutions, leaving most molecules intact in an equilibrium state!",
      incorrectMsg: "Incorrect. 'Weak' refers to the degree of ionization (splitting) in water, not how well the substance dissolves. Try again!"
    }
  },
  { 
    id: "lemon", 
    name: "Lemon Juice", 
    formula: "Citric Acid",
    emoji: "🍋", 
    liquid: "#f4d03f", 
    type: "acid",
    blue: "#e8443a", 
    red: "#e8443a", 
    uni: { c: "#e8443a", ph: 2 },
    hint: "Contains natural citric acid, which gives citrus fruits their characteristic sour taste.",
    question: {
      q: "Lemon Juice tastes sour due to Citric Acid. Is Citric Acid classified as an organic acid or mineral acid?",
      options: [
        "Organic Acid (Natural & Weak)",
        "Mineral Acid (Synthetic & Strong)"
      ],
      ans: 0,
      correctMsg: "Correct! Citric acid is an organic acid. Organic acids occur naturally in plants and animal tissue, and are relatively weak and safe to consume!",
      incorrectMsg: "No, organic acids are natural acids found in food substances like fruits. Mineral acids are synthetically manufactured. Try again!"
    }
  },
  { 
    id: "vinegar", 
    name: "Vinegar", 
    formula: "CH3COOH",
    emoji: "🧴", 
    liquid: "#f5f1e6", 
    type: "acid",
    blue: "#ee8a4a", 
    red: "#ee8a4a", 
    uni: { c: "#ee8a4a", ph: 3 },
    hint: "Made of acetic acid. Widely used for food preservation and culinary dressings.",
    question: {
      q: "Vinegar contains acetic acid (CH3COOH). What color change do you expect when dipping blue litmus paper?",
      options: [
        "It will turn red",
        "It will remain blue"
      ],
      ans: 0,
      correctMsg: "Spot on! Vinegar is an acidic solution, so it turns blue litmus paper red, indicating the presence of active H+ ions!",
      incorrectMsg: "No, vinegar is acidic. Acids always turn blue litmus paper red. Think about it and try again!"
    }
  },
  { 
    id: "soda", 
    name: "Baking Soda Water", 
    formula: "NaHCO3",
    emoji: "🧂", 
    liquid: "#eef2f5", 
    type: "base",
    blue: "#3aa0d4", 
    red: "#3aa0d4", 
    uni: { c: "#3aa0d4", ph: 9 },
    hint: "Contains sodium bicarbonate, a mild base commonly used in baking.",
    question: {
      q: "Baking Soda is sodium bicarbonate (NaHCO3). What chemical reaction happens when a base neutralizes an acid?",
      options: [
        "They form a salt and water, neutralising their pH",
        "They trigger a highly reactive, flammable explosion"
      ],
      ans: 0,
      correctMsg: "Excellent! In a neutralization reaction, an acid and base react to form salt and water, canceling each other out to move the pH closer to 7!",
      incorrectMsg: "No, acid-base neutralization forms stable compounds—specifically, a salt and pure water. Let's try again!"
    }
  },
  { 
    id: "soap", 
    name: "Soap Solution", 
    formula: "Basic Ester",
    emoji: "🫧", 
    liquid: "#e6f0ec", 
    type: "base",
    blue: "#5a4fc4", 
    red: "#5a4fc4", 
    uni: { c: "#5a4fc4", ph: 11 },
    hint: "A slippery solution of basic esters and sodium salts, characteristic of bases.",
    question: {
      q: "Soap solution has a slippery texture typical of bases. In what pH range does a basic solution like soap fall?",
      options: [
        "pH greater than 7",
        "pH less than 7"
      ],
      ans: 0,
      correctMsg: "Correct! The pH scale goes from 0 to 14, where values less than 7 are acidic, exactly 7 is neutral, and values greater than 7 are basic!",
      incorrectMsg: "No, bases occupy the upper half of the pH scale (greater than 7), whereas acids occupy the lower half. Try again!"
    }
  },
  { 
    id: "salt", 
    name: "Salt Water", 
    formula: "NaCl + H2O",
    emoji: "🧊", 
    liquid: "#eef1f3", 
    type: "neutral",
    blue: "#3f9b54", 
    red: "#3f9b54", 
    uni: { c: "#3f9b54", ph: 7 },
    hint: "A solution of sodium chloride in water, forming a neutral compound.",
    question: {
      q: "Salt Water (NaCl) is neutral. What color change will you observe when dipping red litmus paper?",
      options: [
        "No color change detected (remains red)",
        "It will turn blue"
      ],
      ans: 0,
      correctMsg: "Absolutely correct! Neutral solutions do not change the color of either blue or red litmus paper indicator strips!",
      incorrectMsg: "Incorrect. Neutral substances have no acidic or basic properties, so the red litmus remains red. Try again!"
    }
  },
  { 
    id: "water", 
    name: "Distilled Water", 
    formula: "H2O",
    emoji: "💧", 
    liquid: "#eaf3f6", 
    type: "neutral",
    blue: "#3f9b54", 
    red: "#3f9b54", 
    uni: { c: "#3f9b54", ph: 7 },
    hint: "Pure water, boiled into vapor and condensed, representing neutral pH 7.",
    question: {
      q: "Distilled water is pure H2O. What is the exact neutral value on the standard pH scale?",
      options: [
        "pH 7 (Exactly Neutral)",
        "pH 0 (Neutral)"
      ],
      ans: 0,
      correctMsg: "Spot on! The exact neutral point on the pH scale is 7. Distilled water represents this base baseline pH value.",
      incorrectMsg: "No, pH 0 is strongly acidic (like battery acid!). The exact center of the pH scale is 7. Try again!"
    }
  }
];

const TYPE_META = {
  acid:    { label: "Acid",    c: SCI.acidStrong, bg: "#fce4e0", desc: "Turns blue litmus → red" },
  base:    { label: "Base",    c: SCI.baseStrong, bg: "#e7e3fb", desc: "Turns red litmus → blue" },
  neutral: { label: "Neutral", c: SCI.neutral,    bg: "#def0e3", desc: "No colour change" },
};

/* Experiment catalog — phase 1 (primary, Class 6–8) + a peek at higher classes */
const CATALOG = [
  { id: "acid-base", name: "Acids, Bases & Indicators", cls: "Class 7", subject: "Chemistry",
    diff: "Easy", mins: 12, xp: 100, c: C.em, status: "ready", icon: "drop",
    blurb: "Test everyday liquids with litmus paper and discover which are acids, bases, or neutral.",
    chapter: "Ch 5 · Acids, Bases and Salts" },
  { id: "solubility", name: "Soluble & Insoluble Substances", cls: "Class 6", subject: "Chemistry",
    diff: "Easy", mins: 9, xp: 80, c: C.em, status: "ready", icon: "beaker",
    blurb: "Stir everyday substances into water and find out which dissolve and which don't.",
    chapter: "Methods of Separation of Substances" },
  { id: "magnetism", name: "Magnetic & Non-Magnetic Materials", cls: "Class 6", subject: "Physics",
    diff: "Easy", mins: 8, xp: 80, c: C.violet, status: "ready", icon: "atom",
    blurb: "Bring a magnet near different materials to see which are attracted.",
    chapter: "Ch 4 · Exploring Magnets" },
  { id: "materials-light", name: "Transparent, Translucent & Opaque", cls: "Class 6", subject: "Chemistry",
    diff: "Easy", mins: 9, xp: 80, c: C.sky, status: "ready", icon: "eye",
    blurb: "Shine a torch through materials and watch how much light reaches the screen.",
    chapter: "Ch 6 · Materials Around Us" },
  { id: "separation", name: "Methods of Separation", cls: "Class 6", subject: "Chemistry",
    diff: "Easy", mins: 10, xp: 90, c: C.gold, status: "ready", icon: "beaker",
    blurb: "Inspect everyday mixtures and choose the right way to separate them.",
    chapter: "Ch 9 · Methods of Separation in Everyday Life" },
  { id: "motion", name: "Types of Motion", cls: "Class 6", subject: "Physics",
    diff: "Easy", mins: 9, xp: 80, c: C.coral, status: "ready", icon: "refresh",
    blurb: "Set toys moving and classify linear, circular and oscillatory motion.",
    chapter: "Ch 5 · Measurement of Length and Motion" },
  { id: "temperature", name: "Temperature & Its Measurement", cls: "Class 6", subject: "Physics",
    diff: "Easy", mins: 9, xp: 80, c: C.emDeep, status: "ready", icon: "drop",
    blurb: "Read a laboratory thermometer and sort samples as cold, warm or hot.",
    chapter: "Ch 7 · Temperature and its Measurement" },
  { id: "metals-nonmetals", name: "Metals & Non-Metals", cls: "Class 8", subject: "Chemistry",
    diff: "Medium", mins: 11, xp: 100, c: C.gold, status: "ready", icon: "flask",
    blurb: "Examine materials' properties to classify them as metals or non-metals.",
    chapter: "Ch 4 · Materials: Metals and Non-Metals" },
  { id: "neutralise", name: "Neutralisation in Everyday Life", cls: "Class 7", subject: "Chemistry",
    diff: "Medium", mins: 12, xp: 100, c: C.coral, status: "ready", icon: "flask",
    blurb: "Decide whether each everyday problem needs a base or an acid to cancel it out.",
    chapter: "Ch 5 · Acids, Bases and Salts" },
  { id: "rusting", name: "Rusting of Iron", cls: "Class 8", subject: "Chemistry",
    diff: "Easy", mins: 9, xp: 90, c: C.sky, status: "ready", icon: "atom",
    blurb: "Find out which conditions make an iron nail rust — and which keep it shiny.",
    chapter: "Ch 4 · Materials: Metals and Non-Metals" },
  { id: "combustion", name: "Combustible & Non-Combustible Materials", cls: "Class 8", subject: "Chemistry",
    diff: "Easy", mins: 9, xp: 90, c: C.coral, status: "ready", icon: "spark",
    blurb: "Bring a flame near everyday materials and see which catch fire.",
    chapter: "Ch 6 · Combustion and Flame" },
  { id: "circuit", name: "Simple Electric Circuit", cls: "Class 7", subject: "Physics",
    diff: "Easy", mins: 11, xp: 90, c: C.violet, status: "ready", icon: "bolt",
    blurb: "Build a circuit, test materials in the gap, and light up the bulb.",
    chapter: "Ch 3 · Electricity: Circuits and their Components" },
  { id: "changes", name: "Physical & Chemical Changes", cls: "Class 7", subject: "Chemistry",
    diff: "Easy", mins: 10, xp: 90, c: C.violet, status: "ready", icon: "refresh",
    blurb: "Inspect everyday changes and decide if a new substance was formed.",
    chapter: "Ch 5 · Changes Around Us: Physical and Chemical" },
  { id: "heat-transfer", name: "Heat Transfer: Conduction, Convection & Radiation", cls: "Class 7", subject: "Physics",
    diff: "Medium", mins: 10, xp: 90, c: C.coral, status: "ready", icon: "bolt",
    blurb: "Study hot spoons, boiling pans and sunshine to see how heat travels.",
    chapter: "Ch 7 · Heat Transfer in Nature" },
  { id: "luminous", name: "Luminous & Non-Luminous Objects", cls: "Class 7", subject: "Physics",
    diff: "Easy", mins: 9, xp: 80, c: C.gold, status: "ready", icon: "spark",
    blurb: "Test objects in the dark — which shine with their own light?",
    chapter: "Ch 11 · Light: Shadows and Reflections" },
  { id: "reflection", name: "Regular & Diffused Reflection", cls: "Class 8", subject: "Physics",
    diff: "Medium", mins: 11, xp: 100, c: C.emDeep, status: "ready", icon: "eye",
    blurb: "Shine parallel rays on mirrors, water and walls to see which scatter light.",
    chapter: "Ch 16 · Light" },
  { id: "friction", name: "Friction: Rough & Smooth Surfaces", cls: "Class 8", subject: "Physics",
    diff: "Easy", mins: 10, xp: 90, c: C.violet, status: "ready", icon: "target",
    blurb: "Slide a block over different surfaces and compare how much friction each has.",
    chapter: "Ch 12 · Friction" },
  { id: "force", name: "Newton's Three Laws of Motion", cls: "Class 9", subject: "Physics",
    diff: "Medium", mins: 13, xp: 120, c: C.sky, status: "ready", icon: "target",
    blurb: "Match everyday situations to Newton's first, second and third laws.",
    chapter: "Ch 9 · Force & Laws of Motion" },
  { id: "energy", name: "Kinetic & Potential Energy", cls: "Class 9", subject: "Physics",
    diff: "Medium", mins: 11, xp: 110, c: C.coral, status: "ready", icon: "bolt",
    blurb: "Sort everyday situations into energy of motion and stored energy.",
    chapter: "Ch 11 · Work and Energy" },
  { id: "solutions", name: "Solutions, Suspensions & Colloids", cls: "Class 9", subject: "Chemistry",
    diff: "Medium", mins: 12, xp: 110, c: C.emDeep, status: "ready", icon: "beaker",
    blurb: "Shine a beam through mixtures and spot the Tyndall effect.",
    chapter: "Ch 2 · Is Matter Around Us Pure" },
  { id: "states-of-matter", name: "States of Matter", cls: "Class 9", subject: "Chemistry",
    diff: "Easy", mins: 10, xp: 100, c: C.sky, status: "ready", icon: "atom",
    blurb: "Peek at the particles to tell solids, liquids and gases apart.",
    chapter: "Ch 1 · Matter in Our Surroundings" },
  { id: "elements-compounds", name: "Elements, Compounds & Mixtures", cls: "Class 9", subject: "Chemistry",
    diff: "Medium", mins: 11, xp: 110, c: C.violet, status: "ready", icon: "flask",
    blurb: "Classify everyday substances as elements, compounds or mixtures.",
    chapter: "Ch 2 · Is Matter Around Us Pure" },
  { id: "reactions", name: "Types of Chemical Reactions", cls: "Class 10", subject: "Chemistry",
    diff: "Hard", mins: 15, xp: 140, c: C.coral, status: "soon", icon: "atom",
    blurb: "Combination, decomposition, displacement and more reaction types.",
    chapter: "Ch 1 · Chemical Reactions & Equations" },
  { id: "lens", name: "Refraction through Lenses", cls: "Class 10", subject: "Physics",
    diff: "Hard", mins: 15, xp: 140, c: C.violet, status: "soon", icon: "eye",
    blurb: "Trace light rays through convex and concave lenses.",
    chapter: "Ch 10 · Light – Reflection & Refraction" },
];

const CIRCUIT_MATERIALS = [
  {
    id: "pin",
    name: "Metal Safety Pin",
    material: "Steel Alloy",
    emoji: "🧷",
    liquid: "#94a3b8", // silver metal swatch
    type: "conductor",
    hint: "A standard safety pin made of steel alloy, used widely for fastening fabrics.",
    question: {
      q: "Steel is a metal alloy. Why do metals conduct electricity so easily?",
      options: [
        "They contain a sea of free, mobile valence electrons",
        "They have positive protons that flow through the wires"
      ],
      ans: 0,
      correctMsg: "Correct! Metals have loosely bound valence electrons that are free to move between atoms under an electric potential, carrying the current!",
      incorrectMsg: "No, remember that positive protons are locked inside the heavy nuclei and cannot move. It's the free valence electrons that carry the charge. Try again!"
    }
  },
  {
    id: "copper",
    name: "Copper Wire",
    material: "Copper",
    emoji: "⚡",
    liquid: "#b45309", // copper orange swatch
    type: "conductor",
    hint: "Highly flexible pure copper wire, the standard conductor used in household electrical circuits.",
    question: {
      q: "Copper is one of the best electrical conductors. What are materials that block electric current called?",
      options: [
        "Superconductors",
        "Insulators"
      ],
      ans: 1,
      correctMsg: "Spot on! Materials that do not allow electric current to pass through them easily are called insulators!",
      incorrectMsg: "Incorrect. Insulators are materials that block the flow of current. Let's try again!"
    }
  },
  {
    id: "key",
    name: "Iron Key",
    material: "Iron",
    emoji: "🔑",
    liquid: "#475569", // dark metal swatch
    type: "conductor",
    hint: "A solid door key cut from pure iron, representing metallic elements.",
    question: {
      q: "If you place an iron key in the circuit gap, the light bulb glows. What makes a circuit 'closed'?",
      options: [
        "A continuous, unbroken path of conducting materials",
        "An air gap that allows sparks to jump across terminals"
      ],
      ans: 0,
      correctMsg: "Perfect! A closed circuit is a complete, continuous loop of conducting materials that allows current to return to the source!",
      incorrectMsg: "No, air is a very strong insulator. Current cannot flow across an open air gap unless at extremely high voltages. Try again!"
    }
  },
  {
    id: "eraser",
    name: "Rubber Eraser",
    material: "Vulcanized Rubber",
    emoji: "🧽",
    liquid: "#fda4af", // pink rubber swatch
    type: "insulator",
    hint: "A standard pencil eraser made of highly vulcanized natural rubber.",
    question: {
      q: "Rubber erasers block electric current. Why does rubber act as a strong insulator?",
      options: [
        "Its electrons are tightly bound to atoms and cannot move",
        "It lacks positive nuclei to attract the flowing electrons"
      ],
      ans: 0,
      correctMsg: "Correct! In insulators like rubber, valence electrons are tightly bound in covalent chemical bonds and cannot roam freely, stopping current flow!",
      incorrectMsg: "No, all matter has atomic nuclei. In insulators, the valence electrons are bound tightly and cannot move. Try again!"
    }
  },
  {
    id: "ruler",
    name: "Plastic Ruler",
    material: "Polystyrene",
    emoji: "📏",
    liquid: "#93c5fd", // light blue plastic swatch
    type: "insulator",
    hint: "A clear drawing ruler molded from solid polystyrene plastic.",
    question: {
      q: "Polystyrene plastic is a strong insulator. What is a key safety use for insulators in our homes?",
      options: [
        "Coating copper wires to prevent electric shocks",
        "Making the inner filaments of light bulbs"
      ],
      ans: 0,
      correctMsg: "Absolutely correct! Insulating plastic coatings wrap around copper wires to safely block current from entering our bodies when touched!",
      incorrectMsg: "No, inside bulb filaments, we need high-resistance conductors like tungsten that heat up to glow. Plastic would simply melt! Try again!"
    }
  },
  {
    id: "slider",
    name: "Glass Slide",
    material: "Silica Glass",
    emoji: "🔬",
    liquid: "#e2e8f0", // clear white swatch
    type: "insulator",
    hint: "A thin microscopic cover slider cut from pure silica glass.",
    question: {
      q: "Glass has a very high resistivity. What is the fundamental unit of electric current?",
      options: [
        "Ampere (Amp)",
        "Volt"
      ],
      ans: 0,
      correctMsg: "Spot on! The Ampere (Amp) is the SI unit of electric current, measuring the rate of charge flow: 1 Ampere equals 1 Coulomb per second!",
      incorrectMsg: "Incorrect. The Volt measures electrical pressure (potential difference), whereas the Ampere measures the actual current flow. Try again!"
    }
  }
];

export { SUBSTANCES, TYPE_META, CATALOG, CIRCUIT_MATERIALS };

