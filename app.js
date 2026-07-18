const TXLINE_ORIGIN = "https://txline.txodds.com";
const REFRESH_MS = 30_000;
const storage = window.sessionStorage;

const elements = {
  badge: document.querySelector("#connectionBadge"),
  status: document.querySelector("#statusText"),
  lastUpdated: document.querySelector("#lastUpdated"),
  dialog: document.querySelector("#setupDialog"),
  setupForm: document.querySelector("#setupForm"),
  tokenInput: document.querySelector("#apiToken"),
  startGuest: document.querySelector("#startGuest"),
  closeSetup: document.querySelector("#closeSetup"),
  openSetup: document.querySelector("#openSetup"),
  heroConnect: document.querySelector("#heroConnect"),
  refresh: document.querySelector("#refreshData"),
  fixtureList: document.querySelector("#fixtureList"),
  fixtureCount: document.querySelector("#fixtureCount"),
  fixtureTemplate: document.querySelector("#fixtureTemplate"),
  selectedFixture: document.querySelector("#selectedFixture"),
  pickControls: document.querySelector("#pickControls"),
  pickNotice: document.querySelector("#pickNotice"),
  eventDetails: document.querySelector("#eventDetails"),
};

const state = {
  guestJwt: storage.getItem("txline_guest_jwt") || "",
  apiToken: storage.getItem("txline_api_token") || "",
  fixtures: [],
  selected: null,
  picks: JSON.parse(storage.getItem("match_pulse_picks") || "{}"),
  refreshTimer: null,
};

function setStatus(text, tone = "idle") {
  elements.status.textContent = text;
  elements.badge.textContent = tone === "ready" ? "Live data ready" : tone === "error" ? "Connection issue" : "Not connected";
  elements.badge.className = `connection-badge is-${tone}`;
}

function storeCredentials() {
  storage.setItem("txline_guest_jwt", state.guestJwt);
  storage.setItem("txline_api_token", state.apiToken);
}

function clearLiveRead() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = null;
  elements.refresh.disabled = true;
}

async function startGuestSession() {
  elements.startGuest.disabled = true;
  elements.startGuest.textContent = "Starting…";
  try {
    const response = await fetch(`${TXLINE_ORIGIN}/auth/guest/start`, { method: "POST" });
    if (!response.ok) throw new Error(`Guest session request returned ${response.status}`);
    const body = await response.json();
    if (!body?.token) throw new Error("TxLINE did not return a guest session token");
    state.guestJwt = body.token;
    storeCredentials();
    setStatus("Guest session started. Add your activated API token to read fixtures.");
    elements.startGuest.textContent = "Guest session ready";
  } catch (error) {
    setStatus(`Could not start a TxLINE guest session: ${error.message}`, "error");
    elements.startGuest.textContent = "Try guest session again";
  } finally {
    elements.startGuest.disabled = false;
  }
}

function apiHeaders() {
  if (!state.guestJwt || !state.apiToken) {
    throw new Error("Start a guest session and add an activated TxLINE API token first.");
  }
  return { Authorization: `Bearer ${state.guestJwt}`, "X-Api-Token": state.apiToken };
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["items", "data", "fixtures", "result"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function pickValue(value, ...keys) {
  for (const key of keys) {
    if (value?.[key] !== undefined && value?.[key] !== null && value?.[key] !== "") return value[key];
  }
  return "";
}

function normalizeFixture(raw) {
  const startsAt = Number(pickValue(raw, "StartTime", "startTime", "start_time", "Ts", "ts"));
  const home = String(pickValue(raw, "Participant1", "participant1", "homeTeam", "home", "team1") || "Home team");
  const away = String(pickValue(raw, "Participant2", "participant2", "awayTeam", "away", "team2") || "Away team");
  return {
    id: String(pickValue(raw, "FixtureId", "fixtureId", "id")),
    competition: String(pickValue(raw, "Competition", "competition", "competitionName") || "World Cup"),
    home,
    away,
    startsAt: Number.isFinite(startsAt) ? startsAt : 0,
    raw,
  };
}

function dateForFixture(fixture) {
  if (!fixture.startsAt) return "Time pending";
  const timestamp = fixture.startsAt > 10_000_000_000 ? fixture.startsAt : fixture.startsAt * 1000;
  return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", month: "short", timeZoneName: "short" }).format(timestamp);
}

function isWorldCup(fixture) {
  return /world\s*cup|fifa/i.test(fixture.competition);
}

async function loadFixtures() {
  clearLiveRead();
  setStatus("Reading the latest TxLINE fixture snapshot…");
  elements.refresh.disabled = true;
  try {
    const response = await fetch(`${TXLINE_ORIGIN}/api/fixtures/snapshot`, { headers: apiHeaders() });
    if (!response.ok) throw new Error(`Fixture snapshot returned ${response.status}`);
    const rawFixtures = asArray(await response.json());
    state.fixtures = rawFixtures.map(normalizeFixture).filter((fixture) => fixture.id);
    const worldCupFixtures = state.fixtures.filter(isWorldCup);
    if (worldCupFixtures.length) state.fixtures = worldCupFixtures;
    state.fixtures.sort((left, right) => left.startsAt - right.startsAt);
    renderFixtures();
    const now = new Date();
    elements.lastUpdated.textContent = `Updated ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
    setStatus(`Live TxLINE snapshot loaded — refreshing every ${REFRESH_MS / 1000} seconds.`, "ready");
    elements.refresh.disabled = false;
    state.refreshTimer = setInterval(loadFixtures, REFRESH_MS);
  } catch (error) {
    setStatus(`Live data could not load: ${error.message}`, "error");
    elements.fixtureList.innerHTML = `<div class="empty-state"><strong>Live read unavailable</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function renderFixtures() {
  elements.fixtureList.replaceChildren();
  elements.fixtureCount.textContent = `${state.fixtures.length} fixture${state.fixtures.length === 1 ? "" : "s"}`;
  if (!state.fixtures.length) {
    elements.fixtureList.innerHTML = "<div class=\"empty-state\"><strong>No World Cup fixtures returned</strong><p>TxLINE returned a valid snapshot but no matching World Cup fixture rows.</p></div>";
    return;
  }
  for (const fixture of state.fixtures.slice(0, 18)) {
    const card = elements.fixtureTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-selected", state.selected?.id === fixture.id);
    card.querySelector(".fixture-competition").textContent = fixture.competition;
    card.querySelector(".fixture-time").textContent = dateForFixture(fixture);
    card.querySelector(".team-home").textContent = fixture.home;
    card.querySelector(".team-away").textContent = fixture.away;
    card.querySelector(".fixture-state").textContent = state.selected?.id === fixture.id ? "Open in pulse" : "Fixture";
    card.querySelector(".fixture-main").addEventListener("click", () => selectFixture(fixture));
    elements.fixtureList.append(card);
  }
}

async function selectFixture(fixture) {
  state.selected = fixture;
  renderFixtures();
  elements.selectedFixture.innerHTML = `<div class="match-name">${escapeHtml(fixture.home)} <span>vs</span> ${escapeHtml(fixture.away)}</div><span class="match-meta">${escapeHtml(fixture.competition)} · ${escapeHtml(dateForFixture(fixture))}</span>`;
  elements.pickControls.hidden = false;
  const buttons = [...elements.pickControls.querySelectorAll("button")];
  buttons[0].textContent = fixture.home;
  buttons[2].textContent = fixture.away;
  for (const button of buttons) {
    button.classList.toggle("is-active", state.picks[fixture.id] === button.dataset.pick);
    button.onclick = () => savePick(fixture, button.dataset.pick);
  }
  await loadScoreEvent(fixture);
}

function savePick(fixture, pick) {
  state.picks[fixture.id] = pick;
  storage.setItem("match_pulse_picks", JSON.stringify(state.picks));
  [...elements.pickControls.querySelectorAll("button")].forEach((button) => button.classList.toggle("is-active", button.dataset.pick === pick));
  const label = pick === "home" ? fixture.home : pick === "away" ? fixture.away : "a draw";
  elements.pickNotice.textContent = `Local pick saved: ${label}. This stays on this device and never creates a wager.`;
}

async function loadScoreEvent(fixture) {
  elements.eventDetails.innerHTML = "<strong>Loading latest event…</strong><p>Reading the TxLINE score snapshot for this fixture.</p>";
  try {
    const response = await fetch(`${TXLINE_ORIGIN}/api/scores/snapshot/${encodeURIComponent(fixture.id)}`, { headers: apiHeaders() });
    if (!response.ok) throw new Error(`Score snapshot returned ${response.status}`);
    const payload = await response.json();
    const events = asArray(payload);
    const latest = events.at(-1) || payload;
    renderEvent(latest, fixture);
  } catch (error) {
    elements.eventDetails.innerHTML = `<strong>Score state unavailable</strong><p>${escapeHtml(error.message)}</p>`;
  }
}

function renderEvent(event, fixture) {
  const action = String(pickValue(event, "action", "Action", "gameState", "GameState", "status") || "No score event yet");
  const gameState = String(pickValue(event, "gameState", "GameState", "status") || "Awaiting event");
  const timestamp = Number(pickValue(event, "ts", "Ts", "timestamp"));
  const properties = [
    ["State", gameState],
    ["Fixture", fixture.id],
    ["Event time", timestamp ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000).toLocaleString() : "Not supplied"],
  ];
  elements.eventDetails.innerHTML = `<div class="event-action">${escapeHtml(action)}</div><p>${escapeHtml(fixture.home)} vs ${escapeHtml(fixture.away)}</p><dl>${properties.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(String(value))}</dd>`).join("")}</dl>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function openSetup() {
  elements.tokenInput.value = state.apiToken;
  elements.dialog.showModal();
}

elements.openSetup.addEventListener("click", openSetup);
elements.heroConnect.addEventListener("click", openSetup);
elements.startGuest.addEventListener("click", startGuestSession);
elements.closeSetup.addEventListener("click", () => elements.dialog.close());
elements.refresh.addEventListener("click", loadFixtures);
elements.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.apiToken = elements.tokenInput.value.trim();
  storeCredentials();
  elements.dialog.close();
  loadFixtures();
});

if (state.guestJwt && state.apiToken) loadFixtures();
