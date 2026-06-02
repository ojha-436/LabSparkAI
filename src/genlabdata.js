/* ── NCERT-grounded lab specifications (data-driven classification labs) ──
   Sources: NCERT Class 6 "Curiosity" (2024) & NCERT Class 8 Science.
   Each spec drives the generic interactive lab engine in genlab.jsx. */

export const GEN_LABS = {
  /* ───────── Class 6 · Chemistry ───────── */
  solubility: {
    id: "solubility",
    title: "Soluble & Insoluble Substances",
    cls: "Class 6",
    subject: "Chemistry",
    chapter: "Methods of Separation of Substances (NCERT Curiosity)",
    icon: "beaker",
    accent: "#0d9488",
    aim: "To test whether different everyday substances are soluble or insoluble in water.",
    theory:
      "A substance that completely dissolves in water and disappears from view forms a solution and is called soluble. A substance that does not dissolve and can be seen settling or floating is insoluble.",
    materials: ["Beakers of water", "Stirring rod", "Sugar", "Common salt", "Sand", "Chalk powder", "Copper sulphate", "Cooking oil"],
    testVerb: "Stir into water",
    categories: [
      { key: "soluble", label: "Soluble", color: "#0d9488", desc: "Dissolves fully — forms a clear solution" },
      { key: "insoluble", label: "Insoluble", color: "#ea580c", desc: "Does not dissolve — stays visible" },
    ],
    items: [
      { id: "sugar", name: "Sugar", emoji: "🍚", category: "soluble", fact: "The sugar disappears and the water stays clear — sugar is soluble in water." },
      { id: "salt", name: "Common Salt", emoji: "🧂", category: "soluble", fact: "The salt dissolves completely, forming a clear solution — salt is soluble." },
      { id: "coppersulphate", name: "Copper Sulphate", emoji: "🔷", category: "soluble", fact: "It dissolves and turns the water blue — copper sulphate is soluble." },
      { id: "sand", name: "Sand", emoji: "🏖️", category: "insoluble", fact: "The sand settles at the bottom and the water stays murky — sand is insoluble." },
      { id: "chalk", name: "Chalk Powder", emoji: "🥢", category: "insoluble", fact: "The chalk powder makes the water cloudy and settles down — chalk is insoluble." },
      { id: "oil", name: "Cooking Oil", emoji: "🫗", category: "insoluble", fact: "The oil floats on top and does not mix — oil is insoluble (immiscible) in water." },
    ],
    question: {
      q: "Why does sugar seem to 'disappear' when stirred into water?",
      options: ["It dissolves — its particles spread evenly between the water particles", "It reacts with water and turns into a gas"],
      ans: 0,
      correctMsg: "Exactly! Soluble substances break into tiny particles that spread evenly among the water particles, forming a clear solution.",
      incorrectMsg: "Not quite — sugar doesn't turn into gas. It dissolves: its particles spread evenly between the water particles. Try again!",
    },
    conclusion:
      "Sugar, salt and copper sulphate dissolve in water and are soluble, forming clear solutions. Sand, chalk powder and oil do not dissolve and are insoluble. Insoluble solids can later be separated by filtration.",
  },

  /* ───────── Class 6 · Physics ───────── */
  magnetism: {
    id: "magnetism",
    title: "Magnetic & Non-Magnetic Materials",
    cls: "Class 6",
    subject: "Physics",
    chapter: "Ch 4 · Exploring Magnets (NCERT Curiosity)",
    icon: "atom",
    accent: "#4f46e5",
    aim: "To find out which materials are attracted by a magnet (magnetic) and which are not (non-magnetic).",
    theory:
      "Materials that are attracted to a magnet are called magnetic materials — iron, cobalt and nickel are magnetic. Materials that are not attracted are called non-magnetic.",
    materials: ["Bar magnet", "Iron nail", "Steel pin", "Nickel coin", "Aluminium foil", "Copper wire", "Plastic scale", "Wooden block"],
    testVerb: "Bring the magnet near",
    categories: [
      { key: "magnetic", label: "Magnetic", color: "#4f46e5", desc: "Attracted to the magnet" },
      { key: "nonmagnetic", label: "Non-magnetic", color: "#64748b", desc: "Not attracted" },
    ],
    items: [
      { id: "ironnail", name: "Iron Nail", emoji: "🔩", category: "magnetic", fact: "The nail jumps to the magnet — iron is a magnetic material." },
      { id: "steelpin", name: "Steel Pin", emoji: "🧷", category: "magnetic", fact: "The pin sticks to the magnet — steel (mostly iron) is magnetic." },
      { id: "nickel", name: "Nickel Coin", emoji: "🪙", category: "magnetic", fact: "It is attracted to the magnet — nickel is one of the few magnetic metals." },
      { id: "aluminium", name: "Aluminium Foil", emoji: "🧴", category: "nonmagnetic", fact: "Nothing happens — aluminium is non-magnetic." },
      { id: "copper", name: "Copper Wire", emoji: "🔌", category: "nonmagnetic", fact: "The magnet has no effect — copper is non-magnetic." },
      { id: "plastic", name: "Plastic Scale", emoji: "📏", category: "nonmagnetic", fact: "No attraction at all — plastic is non-magnetic." },
    ],
    question: {
      q: "Iron, cobalt and nickel are attracted to magnets. What do we call such materials?",
      options: ["Magnetic materials", "Conductors"],
      ans: 0,
      correctMsg: "Correct! Materials attracted by a magnet are called magnetic materials — iron, cobalt and nickel are the common ones.",
      incorrectMsg: "Not quite — conductors carry electricity. Materials attracted by a magnet are called 'magnetic materials'. Try again!",
    },
    conclusion:
      "The iron nail, steel pin and nickel coin are attracted by the magnet, so they are magnetic materials. Aluminium, copper, plastic and wood are not attracted, so they are non-magnetic.",
  },

  /* ───────── Class 8 · Chemistry ───────── */
  "metals-nonmetals": {
    id: "metals-nonmetals",
    title: "Metals & Non-Metals",
    cls: "Class 8",
    subject: "Chemistry",
    chapter: "Ch 4 · Materials: Metals and Non-Metals",
    icon: "flask",
    accent: "#d97706",
    aim: "To classify materials as metals or non-metals by examining their physical properties.",
    theory:
      "Metals are usually lustrous, hard, malleable, ductile, sonorous and good conductors of heat and electricity. Non-metals are generally dull, soft or brittle, and poor conductors.",
    materials: ["Iron nail", "Copper wire", "Aluminium strip", "Magnesium ribbon", "Sulphur", "Carbon (coal)", "Hammer", "Battery & bulb tester"],
    testVerb: "Examine the properties",
    categories: [
      { key: "metal", label: "Metal", color: "#d97706", desc: "Shiny, malleable, conducts" },
      { key: "nonmetal", label: "Non-metal", color: "#7c3aed", desc: "Dull, brittle, poor conductor" },
    ],
    items: [
      { id: "iron", name: "Iron Nail", emoji: "🔩", category: "metal", fact: "Shiny when filed, hard, sonorous and conducts electricity — iron is a metal." },
      { id: "copper", name: "Copper Wire", emoji: "🔌", category: "metal", fact: "Lustrous, ductile (drawn into wire) and a great conductor — copper is a metal." },
      { id: "aluminium", name: "Aluminium Strip", emoji: "🥫", category: "metal", fact: "Malleable into foil and conducts electricity — aluminium is a metal." },
      { id: "sulphur", name: "Sulphur", emoji: "🟡", category: "nonmetal", fact: "Dull yellow and brittle — it breaks into powder and does not conduct. Sulphur is a non-metal." },
      { id: "carbon", name: "Carbon (Coal)", emoji: "⚫", category: "nonmetal", fact: "Dull, brittle and a poor conductor — carbon is a non-metal." },
      { id: "phosphorus", name: "Phosphorus", emoji: "🔥", category: "nonmetal", fact: "Soft, dull and non-conducting — phosphorus is a non-metal." },
    ],
    question: {
      q: "A material can be beaten into thin sheets. This property is called…",
      options: ["Malleability", "Sonority"],
      ans: 0,
      correctMsg: "Correct! Malleability is the property of being beaten into thin sheets — a key property of metals like aluminium and silver.",
      incorrectMsg: "Close — sonority means producing a ringing sound. Being beaten into sheets is 'malleability'. Try again!",
    },
    conclusion:
      "Iron, copper and aluminium are lustrous, malleable/ductile, sonorous and conduct electricity, so they are metals. Sulphur, carbon and phosphorus are dull, brittle and poor conductors, so they are non-metals.",
  },
};
