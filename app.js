const stages = ["Idea", "Pre-Seed", "Seed", "Series A", "Series B", "Growth", "Late", "Pre-IPO"];
const sectors = [
  "Fintech",
  "SaaS",
  "HealthTech",
  "Climate",
  "AI",
  "Cybersecurity",
  "Consumer",
  "Logistics"
];
const terms = [
  "Board seat",
  "No board seat",
  "Pro-rata rights",
  "Revenue milestones",
  "Founder-friendly governance",
  "ESG reporting",
  "Follow-on support"
];

const investors = [
  {
    name: "Aurora Angels Network",
    investorType: "Angel",
    sectors: ["AI", "SaaS", "Consumer"],
    stageMin: "Idea",
    stageMax: "Seed",
    minTicket: 0.1,
    maxTicket: 1.2,
    terms: ["No board seat", "Founder-friendly governance", "Follow-on support"],
    note: "Strong operator angel syndicate with rapid decision cycles."
  },
  {
    name: "NorthBridge Family Capital",
    investorType: "Family Office",
    sectors: ["HealthTech", "Climate", "Fintech"],
    stageMin: "Seed",
    stageMax: "Series B",
    minTicket: 1,
    maxTicket: 12,
    terms: ["Board seat", "ESG reporting", "Follow-on support"],
    note: "Long-term oriented and open to flexible structures."
  },
  {
    name: "Velocity Ventures",
    investorType: "VC",
    sectors: ["AI", "Cybersecurity", "SaaS", "Fintech"],
    stageMin: "Pre-Seed",
    stageMax: "Series B",
    minTicket: 0.7,
    maxTicket: 20,
    terms: ["Board seat", "Pro-rata rights", "Follow-on support"],
    note: "Category-led VC with strong GTM playbooks."
  },
  {
    name: "Summit Peak Equity",
    investorType: "PE",
    sectors: ["Logistics", "Consumer", "SaaS"],
    stageMin: "Growth",
    stageMax: "Pre-IPO",
    minTicket: 15,
    maxTicket: 150,
    terms: ["Board seat", "Revenue milestones", "ESG reporting"],
    note: "Operationally intensive scaling partner for mature businesses."
  }
];

const startups = [
  {
    name: "NexPay",
    founderType: "Founder",
    sectors: ["Fintech", "AI"],
    stage: "Seed",
    requiredRaise: 3,
    preferredTerms: ["Founder-friendly governance", "Follow-on support", "No board seat"],
    note: "Embedded finance rails for SME exports."
  },
  {
    name: "MedOrbit",
    founderType: "Founder",
    sectors: ["HealthTech", "AI"],
    stage: "Series A",
    requiredRaise: 10,
    preferredTerms: ["Board seat", "Follow-on support", "ESG reporting"],
    note: "Clinical operations AI for multi-site hospitals."
  },
  {
    name: "GridPulse",
    founderType: "Founder",
    sectors: ["Climate", "Logistics"],
    stage: "Pre-Seed",
    requiredRaise: 1.1,
    preferredTerms: ["No board seat", "Founder-friendly governance"],
    note: "Demand-response optimization for warehouses."
  },
  {
    name: "ShieldLayer",
    founderType: "Founder",
    sectors: ["Cybersecurity", "SaaS"],
    stage: "Series B",
    requiredRaise: 25,
    preferredTerms: ["Board seat", "Revenue milestones", "Pro-rata rights"],
    note: "Identity-first enterprise defense platform."
  }
];

const roleSelect = document.getElementById("roleSelect");
const stageSelect = document.getElementById("stageSelect");
const sectorSelect = document.getElementById("sectorSelect");
const amountInput = document.getElementById("amountInput");
const termsContainer = document.getElementById("termsContainer");
const runMatch = document.getElementById("runMatch");
const resultsList = document.getElementById("resultsList");
const snapshot = document.getElementById("snapshot");
const resultContext = document.getElementById("resultContext");
const cardTemplate = document.getElementById("cardTemplate");

function fillSelect(select, options) {
  select.innerHTML = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    select.appendChild(el);
  });
}

function fillTerms() {
  termsContainer.innerHTML = "";
  terms.forEach((term, index) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = term;
    if (index < 2) checkbox.checked = true;
    label.appendChild(checkbox);
    label.append(term);
    termsContainer.appendChild(label);
  });
}

function selectedTerms() {
  return [...termsContainer.querySelectorAll("input:checked")].map((x) => x.value);
}

function stageWithinRange(stage, minStage, maxStage) {
  const value = stages.indexOf(stage);
  return value >= stages.indexOf(minStage) && value <= stages.indexOf(maxStage);
}

function scoreMatch(profile, target) {
  let score = 0;
  if (profile.sectors.includes(target.sector)) score += 35;
  if (target.role === "founder") {
    if (stageWithinRange(target.stage, profile.stageMin, profile.stageMax)) score += 25;
    if (target.amount >= profile.minTicket && target.amount <= profile.maxTicket) score += 20;
  } else {
    if (profile.stage === target.stage) score += 25;
    if (Math.abs(profile.requiredRaise - target.amount) <= target.amount * 0.35) score += 20;
  }

  const overlap = profile.terms.filter((term) => target.terms.includes(term)).length;
  score += overlap * 5;

  return Math.min(score, 100);
}

function renderSnapshot() {
  const totalInvestorCapital = investors.reduce((sum, inv) => sum + inv.maxTicket, 0);
  const avgRaise = startups.reduce((sum, s) => sum + s.requiredRaise, 0) / startups.length;
  snapshot.innerHTML = `
    <div><p>Investor profiles</p><strong>${investors.length}</strong></div>
    <div><p>Startup profiles</p><strong>${startups.length}</strong></div>
    <div><p>Deployable max capital ($M)</p><strong>${totalInvestorCapital.toFixed(1)}</strong></div>
    <div><p>Avg startup raise ($M)</p><strong>${avgRaise.toFixed(1)}</strong></div>
  `;
}

function renderResults(matches, role) {
  resultsList.innerHTML = "";
  if (!matches.length) {
    resultsList.innerHTML = '<p class="muted">No strong matches found. Adjust filters or terms.</p>';
    return;
  }

  matches.forEach((item) => {
    const card = cardTemplate.content.cloneNode(true);
    card.querySelector("h3").textContent = item.name;
    card.querySelector(".score").textContent = `${item.score}% fit`;

    if (role === "founder") {
      card.querySelector(".type").textContent = `${item.investorType} Investor`;
      card.querySelector(".sector-stage").textContent = `Sector focus: ${item.sectors.join(", ")} | Stage: ${item.stageMin} → ${item.stageMax}`;
      card.querySelector(".ticket").textContent = `Ticket: $${item.minTicket}M to $${item.maxTicket}M`;
      card.querySelector(".terms").textContent = `Terms appetite: ${item.terms.join(", ")}`;
    } else {
      card.querySelector(".type").textContent = `${item.founderType} profile`;
      card.querySelector(".sector-stage").textContent = `Sector: ${item.sectors.join(", ")} | Stage: ${item.stage}`;
      card.querySelector(".ticket").textContent = `Raise target: $${item.requiredRaise}M`;
      card.querySelector(".terms").textContent = `Founder terms: ${item.preferredTerms.join(", ")}`;
    }

    card.querySelector(".note").textContent = item.note;
    resultsList.appendChild(card);
  });
}

function run() {
  const role = roleSelect.value;
  const filter = {
    role,
    sector: sectorSelect.value,
    stage: stageSelect.value,
    amount: Number(amountInput.value),
    terms: selectedTerms()
  };

  const source = role === "founder" ? investors : startups;
  const normalized = source
    .map((entry) => {
      const termSource = role === "founder" ? entry.terms : entry.preferredTerms;
      return {
        ...entry,
        terms: termSource,
        score: scoreMatch({ ...entry, terms: termSource }, filter)
      };
    })
    .filter((entry) => entry.score > 10)
    .sort((a, b) => b.score - a.score);

  resultContext.textContent =
    role === "founder"
      ? `Showing investors best matched to your ${filter.sector} startup at ${filter.stage} stage.`
      : `Showing startups best matched to your ${filter.sector} focus and ticket size.`;

  renderResults(normalized, role);
}

fillSelect(stageSelect, stages);
fillSelect(sectorSelect, sectors);
fillTerms();
renderSnapshot();
run();
runMatch.addEventListener("click", run);
