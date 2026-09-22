(() => {
  "use strict";

  const TARGET_CALENDAR_ID = "370929";
  const VENUES = ["Norrvallen", "Rosvalla", "Hedvalla", "Sjulevi"];
  const UNKNOWN_VENUE = "Utan anläggning";
  const UNKNOWN_PITCH = "Ingen plan angiven";
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

  function getCalendarWeek(calendar) {
    const weekText = normalize(calendar.previousElementSibling?.textContent ?? "");
    return weekText.match(/v\.\s*(\d+)/i)?.[1] ?? "";
  }

  function parseClock(value) {
    const match = value.match(/\b(\d{1,2}):(\d{2})\b/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function parseEventTimes(cell) {
    // SportAdmin renders both a mobile start time and a desktop time range in
    // the same cell. Read the desktop span first to avoid parsing 18:00 twice.
    const desktopTime = normalize(cell.querySelector(".hidden-phone span")?.textContent ?? "");
    const source = desktopTime || normalize(cell.textContent);
    return [...source.matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((match) => parseClock(match[1]));
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

  function parseEvent(row, dayRow, week, matchDurations) {
    const cells = row.cells;
    if (cells.length < 2) return null;

    const links = [...cells[1].querySelectorAll("a")];
    const team = normalize(links[0]?.textContent ?? "");
    const eventLink = links.find((link) => link.classList.contains("kal")) ?? links[1];
    const eventText = normalize(eventLink?.textContent ?? cells[1].textContent);
    const detectedVenue = VENUES.find((name) => eventText.toLocaleLowerCase("sv-SE").includes(name.toLocaleLowerCase("sv-SE")));
    const venue = detectedVenue ?? UNKNOWN_VENUE;
    const activityLabel = normalize(row.querySelector(".calBox")?.getAttribute("data-original-title") ?? "");
    const activityType = ACTIVITY_TYPES.includes(activityLabel) ? activityLabel : "Övrigt";
    const times = parseEventTimes(cells[0]);
    const start = times[0];
    const gameFormat = activityType === "Match" ? inferGameFormat(team, eventText) : "";
    const end = times[1] ?? (activityType === "Match" && start !== null ? start + matchDurations[gameFormat] : null);
    let pitch = UNKNOWN_PITCH;

    if (detectedVenue) {
      const commaIndex = eventText.lastIndexOf(",");
      const location = commaIndex >= 0 ? normalize(eventText.slice(commaIndex + 1)) : eventText;
      pitch = normalize(location
        .replace(/\s*\([^)]*\)\s*(?:\([^)]*\)\s*)*$/, "")
        .replace(new RegExp(`^${detectedVenue}\\s*`, "i"), "")) || "Ospecificerad plan";
    }

    return {
      row, dayRow, venue, pitch, hasKnownVenue: Boolean(detectedVenue), activityType, team, text: eventText,
      day: normalize(dayRow.cells[1]?.textContent ?? ""), week,
      weekday: normalize(dayRow.cells[2]?.textContent ?? ""),
      href: eventLink?.href ?? "", start, end, gameFormat,
      hasCalculatedEnd: times.length === 1 && activityType === "Match"
    };
  }

  function collectEvents(calendars, matchDurations) {
    return calendars.flatMap((calendar) => {
      const week = getCalendarWeek(calendar);
      return getDayRows(calendar).flatMap((dayRow) =>
        [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)]
          .map((row) => parseEvent(row, dayRow, week, matchDurations))
          .filter(Boolean));
    });
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

  function activitiesCanConflict(first, second) {
    const firstIsOther = first.activityType === "Övrigt";
    const secondIsOther = second.activityType === "Övrigt";
    if (!firstIsOther && !secondIsOther) return true;

    return firstIsOther && secondIsOther
      && normalizePitch(first.pitch).includes("konferensrum")
      && normalizePitch(second.pitch).includes("konferensrum");
  }

  function eventsOverlap(first, second) {
    return first.hasKnownVenue && second.hasKnownVenue
      && first.dayRow === second.dayRow
      && first.venue === second.venue
      && activitiesCanConflict(first, second)
      && pitchesOverlap(first.pitch, second.pitch)
      && first.start !== null && first.end !== null && second.start !== null && second.end !== null
      && first.start < second.end && second.start < first.end;
  }

  function findConflictGroups(events) {
    const candidates = events.filter((event) => event.hasKnownVenue && event.pitch && event.start !== null && event.end !== null);
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

  function findConflictPartners(events) {
    const partners = new Map(events.map((event) => [event, []]));
    for (let firstIndex = 0; firstIndex < events.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < events.length; secondIndex += 1) {
        const first = events[firstIndex];
        const second = events[secondIndex];
        if (!eventsOverlap(first, second)) continue;
        partners.get(first).push(second);
        partners.get(second).push(first);
      }
    }
    partners.forEach((items) => items.sort((first, second) => first.start - second.start));
    return partners;
  }

  function renderScheduleOverview(container, events) {
    const conflictGroups = findConflictGroups(events);
    const conflictingEvents = new Set(conflictGroups.flat());
    const conflictPartners = findConflictPartners(events);
    document.querySelectorAll(".fcn-conflicting-event").forEach((row) => row.classList.remove("fcn-conflicting-event"));
    conflictingEvents.forEach((event) => event.row.classList.add("fcn-conflicting-event"));

    const scheduledEvents = events.filter((event) => event.start !== null);
    if (!scheduledEvents.length) {
      container.innerHTML = '<div class="fcn-no-conflicts"><strong>Inga bokningar hittades</strong><span>för de filter som är valda.</span></div>';
      return;
    }

    const byDay = new Map();
    scheduledEvents.forEach((event) => {
      if (!byDay.has(event.dayRow)) byDay.set(event.dayRow, []);
      byDay.get(event.dayRow).push(event);
    });

    const fragment = document.createDocumentFragment();
    let currentWeek = null;
    byDay.forEach((dayEvents) => {
      const week = dayEvents[0].week;
      const isFirstDayOfWeek = week !== currentWeek;
      if (isFirstDayOfWeek) {
        currentWeek = week;
      }

      const section = document.createElement("section");
      section.className = "fcn-conflict-day";
      const heading = document.createElement("h3");
      const dayLabel = document.createElement("span");
      dayLabel.textContent = `${dayEvents[0].day} ${dayEvents[0].weekday}`;
      heading.append(dayLabel);
      if (isFirstDayOfWeek && week) {
        const weekLabel = document.createElement("small");
        weekLabel.textContent = `Vecka ${week}`;
        heading.append(weekLabel);
      }
      section.append(heading);

      const byPitch = new Map();
      dayEvents.forEach((event) => {
        const key = `${event.venue}\u0000${normalizePitch(event.pitch)}`;
        if (!byPitch.has(key)) byPitch.set(key, []);
        byPitch.get(key).push(event);
      });

      [...byPitch.values()]
        .sort((first, second) => first[0].venue.localeCompare(second[0].venue, "sv")
          || first[0].pitch.localeCompare(second[0].pitch, "sv"))
        .forEach((pitchEvents) => {
        pitchEvents.sort((first, second) => first.start - second.start);
        const hasConflict = pitchEvents.some((event) => conflictingEvents.has(event));
        const group = document.createElement("article");
        group.className = `fcn-conflict-group${hasConflict ? " fcn-group-has-conflict" : ""}`;

        const header = document.createElement("header");
        const title = document.createElement("strong");
        title.textContent = `${pitchEvents[0].venue} · ${pitchEvents[0].pitch}`;
        const status = document.createElement("span");
        const conflictCount = pitchEvents.filter((event) => conflictingEvents.has(event)).length;
        status.textContent = hasConflict
          ? `${conflictCount} krockande ${conflictCount === 1 ? "bokning" : "bokningar"}`
          : `${pitchEvents.length} ${pitchEvents.length === 1 ? "bokning" : "bokningar"}`;
        header.append(title, status);
        group.append(header);

        const list = document.createElement("ul");
        pitchEvents.forEach((event) => {
          const item = document.createElement("li");
          item.classList.toggle("fcn-list-event-conflict", conflictingEvents.has(event));
          const typeClass = event.activityType.toLocaleLowerCase("sv-SE").replace("ä", "a").replace("ö", "o");
          item.classList.add(`fcn-event-${typeClass}`);
          const timeText = event.end === null ? formatClock(event.start) : `${formatClock(event.start)}–${formatClock(event.end)}`;
          item.innerHTML = `<time>${timeText}</time><span class="fcn-type fcn-type-${typeClass}">${event.activityType}</span>`;
          const eventTitle = event.href ? document.createElement("a") : document.createElement("span");
          eventTitle.className = "fcn-event-title";
          eventTitle.textContent = `${event.team ? `${event.team} · ` : ""}${event.text.split(",")[0]}`;
          if (event.href) eventTitle.href = event.href;
          item.append(eventTitle);
          const partners = conflictPartners.get(event) ?? [];
          if (partners.length) {
            const conflictDetails = document.createElement("small");
            conflictDetails.className = "fcn-conflict-details";
            conflictDetails.textContent = `Överlappar: ${partners.map((partner) =>
              `${formatClock(partner.start)}–${formatClock(partner.end)} · ${partner.team || partner.activityType} · ${partner.pitch}`
            ).join("; ")}`;
            item.append(conflictDetails);

            const conflictsWithMatch = partners.some((partner) => partner.activityType === "Match");
            const conflictsWithTraining = partners.some((partner) => partner.activityType === "Träning");
            if (event.activityType === "Match" && conflictsWithTraining) {
              const priority = document.createElement("strong");
              priority.className = "fcn-priority-note fcn-priority-match";
              priority.textContent = "Match har företräde";
              item.append(priority);
            } else if (event.activityType === "Träning" && conflictsWithMatch) {
              const priority = document.createElement("strong");
              priority.className = "fcn-priority-note fcn-priority-training";
              priority.textContent = "Behöver samordnas – överlappande match har företräde";
              item.append(priority);
            }
          }
          if (event.hasCalculatedEnd) {
            const calculated = document.createElement("small");
            calculated.className = "fcn-calculated-end";
            calculated.textContent = `${event.gameFormat}, beräknad sluttid`;
            item.append(calculated);
          }
          list.append(item);
        });
        group.append(list);
        section.append(group);
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
    const previousWeek = existingToolbar?.querySelector("#fcn-week-filter")?.value ?? "";
    existingToolbar?.remove();

    let matchDurations = loadMatchDurations();
    let events = collectEvents(calendars, matchDurations);
    if (!events.length) return false;
    observedEventRows = allEventRows;

    const calendarWrapper = calendars[0].closest("#calWrap");
    calendarWrapper?.classList.add("fcn-calendar-replaced");

    const toolbar = document.createElement("section");
    toolbar.id = TOOLBAR_ID;
    toolbar.setAttribute("aria-label", "Grupperad plankalender med krockar");
    toolbar.innerHTML = `
      <div class="fcn-filter-heading">
        <div><strong>Plankalender</strong><span>Alla bokningar grupperas per dag, anläggning och plan. Krockar markeras rött.</span></div>
        <output id="fcn-conflict-count" aria-live="polite"></output>
      </div>
      <div class="fcn-filter-controls">
        <label><span>Period</span><select id="fcn-week-filter"></select></label>
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
      <p class="fcn-method-note">Krockar jämförs på samma datum och plan. Vid krock mellan match och träning har matchen företräde som standard. Lagen kan därefter komma överens om annat. Hela konstgräsplanen räknas även mot dess delplaner. Övrigt räknas bara som krock när två Övrigt-bokningar överlappar i konferensrummet. En angiven sluttid gäller alltid före standardtiden.</p>`;
    calendars[0].parentElement.insertBefore(toolbar, calendars[0]);

    const weekSelect = toolbar.querySelector("#fcn-week-filter");
    const venueSelect = toolbar.querySelector("#fcn-venue-filter");
    const pitchSelect = toolbar.querySelector("#fcn-pitch-filter");
    const activitySelect = toolbar.querySelector("#fcn-activity-filter");
    const overview = toolbar.querySelector("#fcn-conflict-overview");
    const count = toolbar.querySelector("#fcn-conflict-count");
    const durationInputs = toolbar.querySelector(".fcn-duration-inputs");

    const weeks = [...new Set(events.map((event) => event.week).filter(Boolean))]
      .sort((first, second) => Number(first) - Number(second));
    weekSelect.append(createOption("", "Hela månaden"));
    weeks.forEach((week) => weekSelect.append(createOption(week, `Vecka ${week}`)));
    weekSelect.value = weeks.includes(previousWeek) ? previousWeek : "";

    venueSelect.append(createOption("", "Alla anläggningar"));
    VENUES.forEach((venue) => venueSelect.append(createOption(venue)));
    if (events.some((event) => !event.hasKnownVenue)) venueSelect.append(createOption(UNKNOWN_VENUE));
    venueSelect.value = [...venueSelect.options].some((option) => option.value === previousVenue) ? previousVenue : "";
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
      const pitches = [...new Set(events.filter((event) =>
        (!weekSelect.value || event.week === weekSelect.value)
        && (!selectedVenue || event.venue === selectedVenue))
        .map((event) => event.pitch).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "sv"));
      pitchSelect.replaceChildren(createOption("", "Alla planer"));
      pitches.forEach((pitch) => pitchSelect.append(createOption(pitch)));
      pitchSelect.disabled = !selectedVenue;
      pitchSelect.value = pitches.includes(currentPitch) ? currentPitch : "";
    }

    function applyFilter() {
      const active = weekSelect.value || venueSelect.value || pitchSelect.value || activitySelect.value;
      const filtered = events.filter((event) =>
        (!weekSelect.value || event.week === weekSelect.value)
        && (!venueSelect.value || event.venue === venueSelect.value)
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
      const bookingCount = filtered.length;
      count.textContent = `${groups.length} ${groups.length === 1 ? "krock" : "krockar"} · ${bookingCount} bokningar`;
      count.classList.toggle("fcn-count-clear", groups.length === 0);
      renderScheduleOverview(overview, filtered);
    }

    weekSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    venueSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    pitchSelect.addEventListener("change", applyFilter);
    activitySelect.addEventListener("change", applyFilter);
    toolbar.querySelector("#fcn-reset-filter").addEventListener("click", () => {
      weekSelect.value = "";
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
