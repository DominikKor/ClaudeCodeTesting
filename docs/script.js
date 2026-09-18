const API_BASE = "https://sls.api.stw-on.de/v1";
const CANTEEN_ID = 130; // Mensa Wolfenbüttel (Ostfalia)
const TIMEZONE = "Europe/Berlin";
const DAYS_AHEAD = 7;

const LANE_ORDER = ["Essen 1", "Essen 2", "Essen 3", "Gemüse", "Beilage", "Dessert"];

const CATEGORY_ICONS = {
  VEGA: "🌿",
  VEGT: "🌱",
  FISH: "🐟",
  GEFL: "🍗",
  RIND: "🐄",
  SCHW: "🐖",
  KLMA: "🌍",
  AT: "❤️",
  NM: "🥔",
  NEU: "✨",
  SECC: "♻️",
};

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function todayInBerlin() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

function weekdayName(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return WEEKDAYS_DE[d.getUTCDay()];
}

function laneSortIndex(name) {
  const idx = LANE_ORDER.indexOf(name);
  return idx === -1 ? LANE_ORDER.length : idx;
}

function groupByDay(meals) {
  const byDate = new Map();

  for (const meal of meals) {
    if (!byDate.has(meal.date)) byDate.set(meal.date, new Map());
    const day = byDate.get(meal.date);

    const laneName = meal.lane.name;
    if (!day.has(laneName)) day.set(laneName, []);

    const categories = meal.tags.categories;
    const icons = categories.map((c) => CATEGORY_ICONS[c.id]).filter(Boolean);
    const allergens = meal.tags.allergens.map((a) => a.name);

    day.get(laneName).push({
      name: meal.name,
      priceStudent: meal.price.student,
      icons,
      categoryNames: categories.map((c) => c.name),
      allergens,
    });
  }

  const today = todayInBerlin();
  return [...byDate.keys()]
    .sort()
    .map((date) => {
      const lanes = [...byDate.get(date).entries()]
        .sort((a, b) => laneSortIndex(a[0]) - laneSortIndex(b[0]))
        .map(([name, meals]) => ({ name, meals }));

      return {
        date,
        weekday: weekdayName(date),
        dateDisplay: formatDisplayDate(date),
        isToday: date === today,
        lanes,
      };
    });
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "title") node.title = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function renderMeal(meal) {
  const nameSpan = el("span", { className: "meal-name", text: meal.name + " " });
  for (const icon of meal.icons) {
    nameSpan.appendChild(el("span", { className: "icon", title: meal.categoryNames.join(", "), text: icon }));
  }

  const main = el("div", { className: "meal-main" }, [
    nameSpan,
    el("span", { className: "meal-price", text: `${meal.priceStudent} €` }),
  ]);

  const li = el("li", { className: "meal" }, [main]);

  if (meal.allergens.length) {
    const details = document.createElement("details");
    details.className = "allergens";
    const summary = el("summary", { text: "Allergene & Zusatzstoffe" });
    const p = el("p", { text: meal.allergens.join(", ") });
    details.appendChild(summary);
    details.appendChild(p);
    li.appendChild(details);
  }

  return li;
}

function renderLane(lane) {
  const list = el(
    "ul",
    { className: "meal-list" },
    lane.meals.map(renderMeal)
  );
  return el("div", { className: "lane" }, [el("h3", { text: lane.name }), list]);
}

function renderDayPanel(day, index) {
  const heading = el("h2", { text: `${day.weekday}, ${day.dateDisplay}` });
  if (day.isToday) heading.appendChild(el("span", { className: "badge", text: "Heute" }));

  const section = el(
    "section",
    { id: `day-${index}`, className: `day-panel${index === 0 ? " active" : ""}` },
    [heading, ...day.lanes.map(renderLane)]
  );
  return section;
}

function renderDayTab(day, index) {
  const children = [
    el("span", { className: "tab-weekday", text: day.weekday }),
    el("span", { className: "tab-date", text: day.dateDisplay }),
  ];
  if (day.isToday) children.push(el("span", { className: "tab-today", text: "Heute" }));

  const button = el(
    "button",
    { className: `day-tab${index === 0 ? " active" : ""}`, type: "button" },
    children
  );
  button.dataset.target = `day-${index}`;
  button.addEventListener("click", () => {
    document.querySelectorAll(".day-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".day-panel").forEach((p) => p.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.target).classList.add("active");
  });
  return button;
}

async function loadMenu() {
  const app = document.getElementById("app");
  const start = todayInBerlin();
  const end = addDays(start, DAYS_AHEAD);
  const url = `${API_BASE}/locations/${CANTEEN_ID}/menu/${start}/${end}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const days = groupByDay(data.meals || []);

    app.innerHTML = "";

    if (!days.length) {
      app.appendChild(el("p", { className: "empty", text: "Aktuell sind keine Gerichte verfügbar (z. B. am Wochenende)." }));
      return;
    }

    const nav = el("nav", { className: "day-tabs", role: "tablist" }, days.map(renderDayTab));
    const panels = el("div", { className: "days" }, days.map(renderDayPanel));

    app.appendChild(nav);
    app.appendChild(panels);
  } catch (err) {
    app.innerHTML = "";
    app.appendChild(
      el("p", { className: "error", text: `Der Speiseplan konnte nicht geladen werden: ${err.message}` })
    );
  }
}

document.addEventListener("DOMContentLoaded", loadMenu);
