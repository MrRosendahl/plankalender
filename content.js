(() => {
  "use strict";

  const TARGET_CALENDAR_ID = "370929";
  const VENUES = ["Norrvallen", "Rosvalla", "Hedvalla", "Sjulevi"];
  const ACTIVITY_TYPES = ["Match", "Träning", "Övrigt"];
  const GAME_FORMATS = ["3v3", "5v5", "7v7", "9v9", "11v11"];
  const DEFAULT_MATCH_MINUTES = Object.fromEntries(GAME_FORMATS.map((format) => [format, 120]));
  const MATCH_DURATION_KEY = "fcn-match-duration-by-format";
  const TOOLBAR_ID = "fcn-plankalender";
  const EVENT_ROW_SELECTOR = ":scope > td:nth-child(4) > table > tbody > tr";
  let observedEventRows = [];

  if (new URLSearchParams(window.location.search).get("ID") !== TARGET_CALENDAR_ID) return;

  const normalize = (value) => value.replace(/\s+/g, " ").trim();
  const normalizePitch = (value) => normalize(value).toLocaleLowerCase("sv-SE");

  function loadMatchDurations() {
    try {
      const saved = JSON.parse(localStorage.getItem(MATCH_DURATION_KEY) ?? "{}");
      return Object.fromEntries(GAME_FORMATS.map((format) => {
        const minutes = Number(saved[format]);
        return [format, minutes >= 15 && minutes <= 360 ? minutes : DEFAULT_MATCH_MINUTES[format]];
      }));
    } catch {
      return { ...DEFAULT_MATCH_MINUTES };
    }
  }

  function findCalendars() {
    const form = document.querySelector("#myForm");
    if (!form) return [];
    return [...form.querySelectorAll("table.mCal")].filter((table) => getDayRows(table).length);
  }

  function getDayRows(calendar) {
    return [...(calendar.tBodies[0]?.rows ?? [])].filter((row) => row.querySelector(EVENT_ROW_SELECTOR));
  }

  function getEventRows(container) {
    return getDayRows(container).flatMap((dayRow) => [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)]);
  }

  function parseClock(value) {
    const match = value.match(/\b(\d{1,2}):(\d{2})\b/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function formatClock(minutes) {
    const value = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function inferGameFormat(team, text) {
    const stated = text.match(/\b(3|5|7|9|11)\s*(?:v|mot)\s*\1\b/i)?.[1];
    if (stated) return `${stated}v${stated}`;
    const pitch = text.match(/\b(3|5|7|9|11)v\1\b/i)?.[1];
    if (pitch) return `${pitch}v${pitch}`;

    const birthYear = team.match(/\b(?:F|P)\s*(\d{2})\b/i)?.[1];
    if (!birthYear) return "11v11";
    const age = new Date().getFullYear() - (2000 + Number(birthYear));
    if (age <= 7) return "3v3";
    if (age <= 9) return "5v5";
    if (age <= 12) return "7v7";
    if (age <= 14) return "9v9";
    return "11v11";
  }

  function parseEvent(row, dayRow, matchDurations) {
    const cells = row.cells;
    if (cells.length < 2) return null;

    const links = [...cells[1].querySelectorAll("a")];
    const team = normalize(links[0]?.textContent ?? "");
    const eventLink = links.find((link) => link.classList.contains("kal")) ?? links[1];
    const eventText = normalize(eventLink?.textContent ?? cells[1].textContent);
    const venue = VENUES.find((name) => eventText.toLocaleLowerCase("sv-SE").includes(name.toLocaleLowerCase("sv-SE")));
    const activityLabel = normalize(row.querySelector(".calBox")?.getAttribute("data-original-title") ?? "");
    const activityType = ACTIVITY_TYPES.includes(activityLabel) ? activityLabel : "Övrigt";
    const times = [...normalize(cells[0].textContent).matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((match) => parseClock(match[1]));
    const start = times[0];
    const gameFormat = activityType === "Match" ? inferGameFormat(team, eventText) : "";
    const end = times[1] ?? (activityType === "Match" && start !== null ? start + matchDurations[gameFormat] : null);
    let pitch = "";

    if (venue) {
      const commaIndex = eventText.lastIndexOf(",");
      const location = commaIndex >= 0 ? normalize(eventText.slice(commaIndex + 1)) : eventText;
      pitch = normalize(location
        .replace(/\s*\([^)]*\)\s*(?:\([^)]*\)\s*)*$/, "")
        .replace(new RegExp(`^${venue}\\s*`, "i"), "")) || "Ospecificerad plan";
    }

    return {
      row, dayRow, venue, pitch, activityType, team, text: eventText,
      day: normalize(dayRow.cells[1]?.textContent ?? ""),
      weekday: normalize(dayRow.cells[2]?.textContent ?? ""),
      href: eventLink?.href ?? "", start, end, gameFormat,
      hasCalculatedEnd: times.length === 1 && activityType === "Match"
    };
  }

  function collectEvents(calendars, matchDurations) {
    return calendars.flatMap(getDayRows).flatMap((dayRow) =>
      [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)]
        .map((row) => parseEvent(row, dayRow, matchDurations))
        .filter(Boolean));
  }

  function createOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function pitchesOverlap(firstPitch, secondPitch) {
    const first = normalizePitch(firstPitch);
    const second = normalizePitch(secondPitch);
    if (first === second) return true;

    const firstIsArtificial = first.includes("konstgräs");
    const secondIsArtificial = second.includes("konstgräs");
    const firstIsWhole = first === "konstgräs" || first.includes("hela");
    const secondIsWhole = second === "konstgräs" || second.includes("hela");
    return firstIsArtificial && secondIsArtificial && (firstIsWhole || secondIsWhole);
  }

  function eventsOverlap(first, second) {
    return first.dayRow === second.dayRow
      && first.venue === second.venue
      && pitchesOverlap(first.pitch, second.pitch)
      && first.start !== null && first.end !== null && second.start !== null && second.end !== null
      && first.start < second.end && second.start < first.end;
  }

  function findConflictGroups(events) {
    const candidates = events.filter((event) => event.venue && event.pitch && event.start !== null && event.end !== null);
    const visited = new Set();
    const groups = [];
    candidates.forEach((event) => {
      if (visited.has(event)) return;
      const group = new Set([event]);
      const queue = [event];
      while (queue.length) {
        const current = queue.shift();
        candidates.forEach((candidate) => {
          if (!group.has(candidate) && eventsOverlap(current, candidate)) {
            group.add(candidate);
            queue.push(candidate);
          }
        });
      }
      group.forEach((item) => visited.add(item));
      if (group.size > 1) groups.push([...group].sort((a, b) => a.start - b.start));
    });
    return groups.sort((a, b) => Number(a[0].day) - Number(b[0].day) || a[0].start - b[0].start);
  }

  function renderConflictOverview(container, events) {
    const groups = findConflictGroups(events);
    const conflictingEvents = new Set(groups.flat());
    document.querySelectorAll(".fcn-conflicting-event").forEach((row) => row.classList.remove("fcn-conflicting-event"));
    conflictingEvents.forEach((event) => event.row.classList.add("fcn-conflicting-event"));

    if (!groups.length) {
      container.innerHTML = '<div class="fcn-no-conflicts"><strong>Inga krockar hittades</strong><span>för de filter som är valda.</span></div>';
      return;
    }

    const byDay = new Map();
    groups.forEach((group) => {
      if (!byDay.has(group[0].dayRow)) byDay.set(group[0].dayRow, []);
      byDay.get(group[0].dayRow).push(group);
    });

    const fragment = document.createDocumentFragment();
    byDay.forEach((dayGroups) => {
      const section = document.createElement("section");
      section.className = "fcn-conflict-day";
      const heading = document.createElement("h3");
      heading.textContent = `${dayGroups[0][0].day} ${dayGroups[0][0].weekday}`;
      section.append(heading);
      dayGroups.forEach((group) => {
        const conflict = document.createElement("article");
        conflict.className = "fcn-conflict-group";
        conflict.innerHTML = `<header><strong>${group[0].venue} · ${group[0].pitch}</strong><span>${group.length} överlappande bokningar</span></header>`;
        const list = document.createElement("ul");
        group.forEach((event) => {
          const item = document.createElement("li");
          const typeClass = event.activityType.toLocaleLowerCase("sv-SE").replace("ä", "a").replace("ö", "o");
          item.innerHTML = `<time>${formatClock(event.start)}–${formatClock(event.end)}</time><span class="fcn-type fcn-type-${typeClass}">${event.activityType}</span>`;
          const title = event.href ? document.createElement("a") : document.createElement("span");
          title.className = "fcn-event-title";
          title.textContent = `${event.team ? `${event.team} · ` : ""}${event.text.split(",")[0]}`;
          if (event.href) title.href = event.href;
          item.append(title);
          if (event.hasCalculatedEnd) {
            const calculated = document.createElement("small");
            calculated.textContent = `${event.gameFormat}, beräknad sluttid`;
            item.append(calculated);
          }
          list.append(item);
        });
        conflict.append(list);
        section.append(conflict);
      });
      fragment.append(section);
    });
    container.replaceChildren(fragment);
  }

  function initialize() {
    const calendars = findCalendars();
    if (!calendars.length) return false;
    const allEventRows = calendars.flatMap(getEventRows);
    const existingToolbar = document.getElementById(TOOLBAR_ID);
    const rowsAreUnchanged = allEventRows.length === observedEventRows.length
      && allEventRows.every((row, index) => row === observedEventRows[index]);
    if (existingToolbar && rowsAreUnchanged) return true;

    const previousVenue = existingToolbar?.querySelector("#fcn-venue-filter")?.value ?? "";
    const previousPitch = existingToolbar?.querySelector("#fcn-pitch-filter")?.value ?? "";
    const previousActivity = existingToolbar?.querySelector("#fcn-activity-filter")?.value ?? "";
    existingToolbar?.remove();

    let matchDurations = loadMatchDurations();
    let events = collectEvents(calendars, matchDurations);
    if (!events.length) return false;
    observedEventRows = allEventRows;

    const toolbar = document.createElement("section");
    toolbar.id = TOOLBAR_ID;
    toolbar.setAttribute("aria-label", "Hitta krockar i plankalendern");
    toolbar.innerHTML = `
      <div class="fcn-filter-heading">
        <div><strong>Plankrockar</strong><span>Överlappande bokningar på samma plan visas samlat.</span></div>
        <output id="fcn-conflict-count" aria-live="polite"></output>
      </div>
      <div class="fcn-filter-controls">
        <label><span>Anläggning</span><select id="fcn-venue-filter"></select></label>
        <label><span>Plan</span><select id="fcn-pitch-filter" disabled></select></label>
        <label><span>Aktivitetstyp</span><select id="fcn-activity-filter"></select></label>
        <button type="button" id="fcn-reset-filter" class="fcn-secondary-button">Rensa</button>
      </div>
      <details class="fcn-duration-settings">
        <summary>Matchtider</summary>
        <p>Används när kalendern bara anger starttid. Ändringar sparas i webbläsaren.</p>
        <div class="fcn-duration-inputs"></div>
      </details>
      <div id="fcn-conflict-overview"></div>
      <p class="fcn-method-note">Krockar jämförs på samma datum och plan. Hela konstgräsplanen räknas även mot dess delplaner. En angiven sluttid gäller alltid före standardtiden.</p>`;
    calendars[0].parentElement.insertBefore(toolbar, calendars[0]);

    const venueSelect = toolbar.querySelector("#fcn-venue-filter");
    const pitchSelect = toolbar.querySelector("#fcn-pitch-filter");
    const activitySelect = toolbar.querySelector("#fcn-activity-filter");
    const overview = toolbar.querySelector("#fcn-conflict-overview");
    const count = toolbar.querySelector("#fcn-conflict-count");
    const durationInputs = toolbar.querySelector(".fcn-duration-inputs");

    venueSelect.append(createOption("", "Alla anläggningar"));
    VENUES.forEach((venue) => venueSelect.append(createOption(venue)));
    venueSelect.value = VENUES.includes(previousVenue) ? previousVenue : "";
    activitySelect.append(createOption("", "Alla aktivitetstyper"));
    ACTIVITY_TYPES.forEach((type) => activitySelect.append(createOption(type)));
    activitySelect.value = ACTIVITY_TYPES.includes(previousActivity) ? previousActivity : "";

    GAME_FORMATS.forEach((format) => {
      const label = document.createElement("label");
      label.innerHTML = `<span>${format}</span><span class="fcn-number-field"><input type="number" min="15" max="360" step="5" value="${matchDurations[format]}" data-format="${format}"><span>min</span></span>`;
      durationInputs.append(label);
    });

    function updatePitchOptions() {
      const selectedVenue = venueSelect.value;
      const currentPitch = pitchSelect.value;
      const pitches = [...new Set(events.filter((event) => !selectedVenue || event.venue === selectedVenue).map((event) => event.pitch).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "sv"));
      pitchSelect.replaceChildren(createOption("", "Alla planer"));
      pitches.forEach((pitch) => pitchSelect.append(createOption(pitch)));
      pitchSelect.disabled = !selectedVenue;
      pitchSelect.value = pitches.includes(currentPitch) ? currentPitch : "";
    }

    function applyFilter() {
      const active = venueSelect.value || pitchSelect.value || activitySelect.value;
      const filtered = events.filter((event) =>
        (!venueSelect.value || event.venue === venueSelect.value)
        && (!pitchSelect.value || event.pitch === pitchSelect.value)
        && (!activitySelect.value || event.activityType === activitySelect.value));

      const visibleRows = new Set(filtered.map((event) => event.row));
      allEventRows.forEach((row) => {
        const visible = !active || visibleRows.has(row);
        row.hidden = !visible;
        row.classList.toggle("fcn-hidden-by-filter", !visible);
        if (visible) row.style.removeProperty("display");
        else row.style.setProperty("display", "none", "important");
      });

      calendars.flatMap(getDayRows).forEach((dayRow) => {
        const rows = [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)];
        const visible = !active || rows.some((row) => visibleRows.has(row));
        dayRow.hidden = !visible;
        dayRow.classList.toggle("fcn-hidden-by-filter", !visible);
        if (visible) dayRow.style.removeProperty("display");
        else dayRow.style.setProperty("display", "none", "important");
      });

      const groups = findConflictGroups(filtered);
      count.textContent = `${groups.length} ${groups.length === 1 ? "krock" : "krockar"}`;
      count.classList.toggle("fcn-count-clear", groups.length === 0);
      renderConflictOverview(overview, filtered);
    }

    venueSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    pitchSelect.addEventListener("change", applyFilter);
    activitySelect.addEventListener("change", applyFilter);
    toolbar.querySelector("#fcn-reset-filter").addEventListener("click", () => {
      venueSelect.value = "";
      pitchSelect.value = "";
      activitySelect.value = "";
      updatePitchOptions();
      applyFilter();
    });
    durationInputs.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-format]");
      if (!input) return;
      input.value = String(Math.min(360, Math.max(15, Number(input.value) || 120)));
      matchDurations[input.dataset.format] = Number(input.value);
      localStorage.setItem(MATCH_DURATION_KEY, JSON.stringify(matchDurations));
      events = collectEvents(calendars, matchDurations);
      updatePitchOptions();
      applyFilter();
    });

    updatePitchOptions();
    if ([...pitchSelect.options].some((option) => option.value === previousPitch)) {
      pitchSelect.value = previousPitch;
    }
    applyFilter();
    return true;
  }

  let initializationScheduled = false;
  function scheduleInitialization() {
    if (initializationScheduled) return;
    initializationScheduled = true;
    window.requestAnimationFrame(() => {
      initializationScheduled = false;
      initialize();
    });
  }

  const observer = new MutationObserver(scheduleInitialization);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleInitialization();
})();
