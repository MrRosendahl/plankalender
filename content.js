(() => {
  "use strict";

  const TARGET_CALENDAR_ID = "370929";
  const VENUES = ["Norrvallen", "Rosvalla", "Hedvalla", "Sjulevi"];
  const UNKNOWN_VENUE = "Utan anläggning";
  const UNKNOWN_PITCH = "Ingen bokningsyta angiven";
  const ACTIVITY_TYPES = ["Match", "Träning", "Övrigt"];
  const GAME_FORMATS = ["3v3", "5v5", "7v7", "9v9", "11v11"];
  const DEFAULT_MATCH_MINUTES = Object.fromEntries(GAME_FORMATS.map((format) => [format, 120]));
  const MATCH_DURATION_KEY = "fcn-match-duration-by-format";
  const CALENDAR_VIEW_KEY = "fcn-calendar-view";
  const TOOLBAR_ID = "fcn-plankalender";
  const VIEW_SWITCH_ID = "fcn-calendar-view-switch";
  const LEGACY_EVENT_ROW_SELECTOR = ":scope > td:nth-child(4) > table > tbody > tr";
  const MODERN_CALENDAR_SELECTOR = ".sa-calendar";
  const MODERN_DAY_SELECTOR = ":scope > .sa-calendar__date-group";
  const MODERN_EVENT_SELECTOR = ":scope > .sa-calendar__events > .sa-calendar__event";
  let observedEventRows = [];
  let eventHeadingObserver = null;

  if (new URLSearchParams(window.location.search).get("ID") !== TARGET_CALENDAR_ID) return;

  const normalize = (value) => String(value ?? "")
    .replace(/undefined/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizePitch = (value) => normalize(value).toLocaleLowerCase("sv-SE");
  const canonicalizePitch = (value) => normalizePitch(value) === "konstgräs"
    ? "Konstgräs Hela"
    : normalize(value);

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
    const modernCalendars = [...document.querySelectorAll(MODERN_CALENDAR_SELECTOR)]
      .filter((calendar) => getDayRows(calendar).length);
    if (modernCalendars.length) return modernCalendars;

    const form = document.querySelector("#myForm");
    if (!form) return [];
    return [...form.querySelectorAll("table.mCal")].filter((table) => getDayRows(table).length);
  }

  function getDayRows(calendar) {
    if (calendar.matches(MODERN_CALENDAR_SELECTOR)) {
      return [...calendar.querySelectorAll(MODERN_DAY_SELECTOR)].filter((group) => group.querySelector(MODERN_EVENT_SELECTOR));
    }
    return [...(calendar.tBodies[0]?.rows ?? [])].filter((row) => row.querySelector(LEGACY_EVENT_ROW_SELECTOR));
  }

  function getEventRows(container) {
    return getDayRows(container).flatMap((dayRow) => [...dayRow.querySelectorAll(
      dayRow.matches(".sa-calendar__date-group") ? MODERN_EVENT_SELECTOR : LEGACY_EVENT_ROW_SELECTOR
    )]);
  }

  function getCalendarWeek(calendar, dayRow) {
    let weekElement = dayRow?.previousElementSibling ?? calendar.previousElementSibling;
    while (weekElement && !weekElement.matches(".sa-calendar__week-header")) {
      weekElement = weekElement.previousElementSibling;
    }
    const weekText = normalize(weekElement?.textContent ?? calendar.previousElementSibling?.textContent ?? "");
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
    if (row.matches(".sa-calendar__event")) {
      const team = normalize(row.querySelector(".sa-calendar__event-label")?.textContent ?? "");
      const eventLink = row.querySelector(".sa-calendar__event-link");
      const heading = normalize(row.querySelector(".sa-calendar__event-heading")?.textContent ?? "");
      const location = normalize(row.querySelector(".sa-calendar__event-location")?.textContent ?? "").replace(/^,\s*/, "");
      const eventText = normalize([heading, location].filter(Boolean).join(", "));
      const detectedVenue = VENUES.find((name) => location.toLocaleLowerCase("sv-SE").includes(name.toLocaleLowerCase("sv-SE")));
      const venue = detectedVenue ?? UNKNOWN_VENUE;
      const headingLower = heading.toLocaleLowerCase("sv-SE");
      const activityType = headingLower.includes("träning")
        ? "Träning"
        : /\b(?:hemma|borta)\b/i.test(heading) ? "Match" : "Övrigt";
      const start = parseClock(row.querySelector(".sa-calendar__time-start")?.textContent ?? "");
      const explicitEnd = parseClock(row.querySelector(".sa-calendar__time-end")?.textContent ?? "");
      const gameFormat = activityType === "Match" ? inferGameFormat(team, eventText) : "";
      const end = explicitEnd ?? (activityType === "Match" && start !== null ? start + matchDurations[gameFormat] : null);
      const pitch = detectedVenue
        ? canonicalizePitch(location.replace(new RegExp(`^${detectedVenue}\\s*`, "i"))) || "Ospecificerad bokningsyta"
        : UNKNOWN_PITCH;

      return {
        row, dayRow, venue, pitch, hasKnownVenue: Boolean(detectedVenue), activityType, team, text: eventText,
        day: normalize(dayRow.querySelector(".sa-calendar__date-number")?.textContent ?? ""), week,
        weekday: normalize(dayRow.querySelector(".sa-calendar__date-day")?.textContent ?? ""),
        href: eventLink?.href ?? "", start, end, gameFormat,
        hasCalculatedEnd: explicitEnd === null && activityType === "Match" && start !== null
      };
    }

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
      pitch = canonicalizePitch(location
        .replace(/\s*\([^)]*\)\s*(?:\([^)]*\)\s*)*$/, "")
        .replace(new RegExp(`^${detectedVenue}\\s*`, "i"), "")) || "Ospecificerad bokningsyta";
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
      return getDayRows(calendar).flatMap((dayRow) =>
        [...dayRow.querySelectorAll(dayRow.matches(".sa-calendar__date-group") ? MODERN_EVENT_SELECTOR : LEGACY_EVENT_ROW_SELECTOR)]
          .map((row) => parseEvent(row, dayRow, getCalendarWeek(calendar, dayRow), matchDurations))
          .filter(Boolean));
    });
  }

  function createOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function eventBelongsToSection(event, section) {
    if (!section) return true;
    const normalizedTeam = normalize(event.team).toLocaleLowerCase("sv-SE");
    const normalizedSection = normalize(section).toLocaleLowerCase("sv-SE");
    return normalizedTeam === normalizedSection
      || normalizedTeam.startsWith(`${normalizedSection} `)
      || normalizedTeam.includes(` ${normalizedSection} `)
      || normalizedTeam.endsWith(` ${normalizedSection}`);
  }

  function pitchesOverlap(firstPitch, secondPitch) {
    const first = normalizePitch(firstPitch);
    const second = normalizePitch(secondPitch);
    if (first === second) return true;

    const firstIsArtificial = first.includes("konstgräs");
    const secondIsArtificial = second.includes("konstgräs");
    if (!firstIsArtificial || !secondIsArtificial) return false;
    const [firstStart, firstEnd] = getPitchSubdivisionRange(firstPitch);
    const [secondStart, secondEnd] = getPitchSubdivisionRange(secondPitch);
    return firstStart < secondEnd && secondStart < firstEnd;
  }

  function activitiesCanConflict(first, second) {
    const hasBookableArea = (event) => event.hasKnownVenue
      && event.pitch !== UNKNOWN_PITCH
      && normalizePitch(event.pitch) !== normalizePitch("Ospecificerad bokningsyta");
    return hasBookableArea(first) && hasBookableArea(second);
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

  function isWholeArtificialPitch(pitch) {
    const normalized = normalizePitch(pitch);
    return normalized.includes("konstgräs") && (normalized === "konstgräs" || normalized.includes("hela"));
  }

  function getMatrixColumns(events) {
    const pitchesByNormalizedName = new Map();
    events.forEach((event) => {
      const normalized = normalizePitch(event.pitch);
      if (!pitchesByNormalizedName.has(normalized)) pitchesByNormalizedName.set(normalized, event.pitch);
    });
    const pitches = [...pitchesByNormalizedName.values()].sort((first, second) => first.localeCompare(second, "sv"));
    const artificialParts = pitches.filter((pitch) => normalizePitch(pitch).includes("konstgräs") && !isWholeArtificialPitch(pitch));
    return pitches.filter((pitch) => !isWholeArtificialPitch(pitch) || artificialParts.length === 0);
  }

  function getEventColumnRange(event, columns) {
    if (isWholeArtificialPitch(event.pitch)) {
      const indexes = columns.map((pitch, index) => normalizePitch(pitch).includes("konstgräs") ? index : -1)
        .filter((index) => index >= 0);
      if (indexes.length) return [Math.min(...indexes), Math.max(...indexes) + 1];
    }
    const index = Math.max(0, columns.findIndex((pitch) => normalizePitch(pitch) === normalizePitch(event.pitch)));
    return [index, index + 1];
  }

  function getPitchSubdivisionRange(pitch) {
    const normalized = normalizePitch(pitch);
    if (isWholeArtificialPitch(pitch)) return [0, 4];

    const quarter = normalized.match(/1\s*\/\s*4\s*([a-d])/i)?.[1]?.toLocaleLowerCase("sv-SE");
    if (quarter) {
      const start = quarter.charCodeAt(0) - "a".charCodeAt(0);
      return [start, start + 1];
    }

    const half = Number(normalized.match(/halvplan\s*([12])/)?.[1]);
    if (half === 1) return [0, 2];
    if (half === 2) return [2, 4];
    return [0, 4];
  }

  function getConflictEntryRows(events, columns, groupColumnStart) {
    const layout = new Map();
    const rowCountByRange = new Map();
    const wholePitchEvents = [];

    events.forEach((event) => {
      const [columnStart, columnEnd] = getEventColumnRange(event, columns);
      const range = [columnStart - groupColumnStart, columnEnd - groupColumnStart];
      if (isWholeArtificialPitch(event.pitch)) {
        wholePitchEvents.push({ event, range });
        return;
      }

      const rangeKey = range.join(":");
      const row = (rowCountByRange.get(rangeKey) ?? 0) + 1;
      rowCountByRange.set(rangeKey, row);
      layout.set(event, { range, row });
    });

    let wholePitchRow = Math.max(0, ...rowCountByRange.values());
    wholePitchEvents.forEach(({ event, range }) => {
      wholePitchRow += 1;
      layout.set(event, { range, row: wholePitchRow });
    });
    return layout;
  }

  function getEventLaneLayout(events, columns) {
    const layout = new Map();
    const byColumnRange = new Map();

    events.forEach((event) => {
      const range = getEventColumnRange(event, columns);
      const key = range.join(":");
      if (!byColumnRange.has(key)) byColumnRange.set(key, []);
      byColumnRange.get(key).push({ event, range });
    });

    byColumnRange.forEach((items) => {
      items.sort((first, second) => first.event.start - second.event.start
        || (first.event.end ?? first.event.start + 30) - (second.event.end ?? second.event.start + 30));

      let cluster = [];
      let clusterEnd = -Infinity;
      const finishCluster = () => {
        if (!cluster.length) return;
        const laneEnds = [];
        cluster.forEach((item) => {
          const availableLane = laneEnds.findIndex((end) => end <= item.event.start);
          item.lane = availableLane < 0 ? laneEnds.length : availableLane;
          laneEnds[item.lane] = item.event.end ?? item.event.start + 30;
        });
        const laneCount = Math.max(1, laneEnds.length);
        cluster.forEach((item) => layout.set(item.event, { range: item.range, lane: item.lane, laneCount }));
      };

      items.forEach((item) => {
        if (cluster.length && item.event.start >= clusterEnd) {
          finishCluster();
          cluster = [];
          clusterEnd = -Infinity;
        }
        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.event.end ?? item.event.start + 30);
      });
      finishCluster();
    });

    return layout;
  }

  function shortTeamName(team) {
    const compact = normalize(team).replace(/^FC\s+Norrsken\s*/i, "");
    return compact || "Bokning";
  }

  function additionalEventInfo(event) {
    const knownValues = [event.team, event.activityType, event.venue, event.pitch]
      .map(normalize)
      .filter((value) => value && value !== UNKNOWN_VENUE && value !== UNKNOWN_PITCH)
      .sort((first, second) => second.length - first.length);
    const remaining = knownValues.reduce((text, value) => {
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return text.replace(new RegExp(escapedValue, "gi"), " ");
    }, event.text);
    return normalize(remaining.replace(/^[\s,·–—:;-]+|[\s,·–—:;-]+$/g, "").replace(/\s*[,·]\s*[,·]\s*/g, " · "));
  }

  function fitEventHeadings(container) {
    container.querySelectorAll(".fcn-matrix-event strong[data-full-heading], .fcn-conflict-entry strong[data-full-heading]").forEach((heading) => {
      const availableWidth = heading.parentElement.clientWidth - 18;
      const characterLimit = Math.max(4, Math.floor(availableWidth / 7));
      const fullHeading = heading.dataset.fullHeading;
      heading.textContent = fullHeading.length > characterLimit
        ? `${fullHeading.slice(0, characterLimit)}...`
        : fullHeading;
    });
  }

  function openEventDetails(event, partners) {
    let dialog = document.getElementById("fcn-event-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "fcn-event-dialog";
      document.body.append(dialog);
      dialog.addEventListener("click", (clickEvent) => {
        if (clickEvent.target === dialog) dialog.close();
      });
    }

    const calculatedText = event.hasCalculatedEnd
      ? `<p class="fcn-dialog-note">* Sluttiden är beräknad utifrån standardtiden för ${event.gameFormat}.</p>` : "";
    const conflictText = partners.length
      ? `<section class="fcn-dialog-conflicts"><strong>⚠ Krockar med</strong><div>${partners.map((partner) => `
        <article class="fcn-dialog-conflict">
          <span>${partner.activityType}</span>
          <h4>${shortTeamName(partner.team)}</h4>
          <dl>
            <div><dt>Tid</dt><dd>${formatClock(partner.start)}–${formatClock(partner.end)}</dd></div>
            <div><dt>Plats</dt><dd>${partner.venue} · ${partner.pitch}</dd></div>
            <div><dt>Aktivitet</dt><dd>${partner.text}</dd></div>
          </dl>
          ${partner.href ? `<a href="${partner.href}">Öppna kalenderhändelsen</a>` : ""}
        </article>`).join("")}</div></section>` : "";
    const link = event.href ? `<a href="${event.href}">Öppna kalenderhändelsen</a>` : "";
    dialog.innerHTML = `
      <button type="button" class="fcn-dialog-close" aria-label="Stäng">×</button>
      <span class="fcn-dialog-type">${event.activityType}</span>
      <h3>${shortTeamName(event.team)}</h3>
      <dl>
        <div><dt>Tid</dt><dd>${formatClock(event.start)}${event.end === null ? "" : `–${formatClock(event.end)}`} ${event.hasCalculatedEnd ? "*" : ""}</dd></div>
        <div><dt>Plats</dt><dd>${event.venue} · ${event.pitch}</dd></div>
        <div><dt>Aktivitet</dt><dd>${event.text}</dd></div>
      </dl>
      ${calculatedText}${conflictText}${link}`;
    dialog.querySelector(".fcn-dialog-close").addEventListener("click", () => dialog.close());
    if (!dialog.open) dialog.showModal();
  }

  function renderScheduleOverview(container, events, showVenueHeadings = true) {
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
      const section = document.createElement("section");
      section.className = "fcn-conflict-day";
      const heading = document.createElement("h3");
      heading.innerHTML = `<span>${dayEvents[0].day} ${dayEvents[0].weekday}</span>${week !== currentWeek && week ? `<small>Vecka ${week}</small>` : ""}`;
      currentWeek = week;
      section.append(heading);

      const byVenue = new Map();
      dayEvents.forEach((event) => {
        if (!byVenue.has(event.venue)) byVenue.set(event.venue, []);
        byVenue.get(event.venue).push(event);
      });

      [...byVenue.entries()].sort(([first], [second]) => first.localeCompare(second, "sv")).forEach(([venue, venueEvents]) => {
        const columns = getMatrixColumns(venueEvents);
        const eventLaneLayout = getEventLaneLayout(venueEvents, columns);
        const venueConflictGroups = findConflictGroups(venueEvents);
        const groupedEvents = new Set(venueConflictGroups.flat());
        const starts = venueEvents.map((event) => event.start);
        const ends = venueEvents.map((event) => event.end ?? event.start + 30);
        const firstMinute = Math.floor(Math.min(...starts) / 30) * 30;
        const roundedLastMinute = Math.ceil(Math.max(...ends) / 30) * 30;
        let lastMinute = Math.max(firstMinute + 60, roundedLastMinute);
        const latestEventTouchesEnd = Math.max(...ends) >= lastMinute;
        if (latestEventTouchesEnd) lastMinute += 30;
        const duration = lastMinute - firstMinute;
        const venueSection = document.createElement("article");
        venueSection.className = "fcn-matrix-section";
        if (showVenueHeadings) {
          const venueHeading = document.createElement("h4");
          venueHeading.textContent = venue;
          venueSection.append(venueHeading);
        }

        const scroll = document.createElement("div");
        scroll.className = "fcn-matrix-scroll";
        const matrix = document.createElement("div");
        matrix.className = "fcn-time-matrix";
        matrix.style.setProperty("--columns", columns.length);
        const corner = document.createElement("div");
        corner.className = "fcn-matrix-corner";
        corner.textContent = "Tid";
        const headers = document.createElement("div");
        headers.className = "fcn-matrix-headers";
        headers.style.gridTemplateColumns = `repeat(${columns.length}, minmax(0, 1fr))`;
        columns.forEach((pitch) => {
          const header = document.createElement("strong");
          header.textContent = pitch;
          headers.append(header);
        });
        const times = document.createElement("div");
        times.className = "fcn-matrix-times";
        const canvas = document.createElement("div");
        canvas.className = "fcn-matrix-canvas";
        canvas.style.height = `${duration * 1.2}px`;
        times.style.height = canvas.style.height;

        for (let minute = firstMinute; minute <= lastMinute; minute += 30) {
          const offset = (minute - firstMinute) * 1.2;
          const label = document.createElement("time");
          label.textContent = formatClock(minute);
          label.style.top = `${offset}px`;
          times.append(label);
          const line = document.createElement("i");
          line.style.top = `${offset}px`;
          line.className = minute % 60 === 0 ? "fcn-hour-line" : "";
          canvas.append(line);
        }

        venueEvents.filter((event) => !groupedEvents.has(event)).sort((first, second) => first.start - second.start).forEach((event) => {
          const { range: [columnStart, columnEnd], lane, laneCount } = eventLaneLayout.get(event);
          const columnWidth = (columnEnd - columnStart) / columns.length * 100;
          const laneWidth = columnWidth / laneCount;
          const button = document.createElement("button");
          const eventHeading = document.createElement("strong");
          const eventMeta = document.createElement("span");
          const typeClass = event.activityType.toLocaleLowerCase("sv-SE").replace("ä", "a").replace("ö", "o");
          const partners = conflictPartners.get(event) ?? [];
          const wholePitchClass = isWholeArtificialPitch(event.pitch) ? " fcn-event-whole-pitch" : "";
          const renderedHeight = Math.max(28, ((event.end ?? event.start + 30) - event.start) * 1.2);
          const compactClass = renderedHeight < 38 ? " fcn-event-compact" : "";
          button.type = "button";
          button.className = `fcn-matrix-event fcn-event-${typeClass}${wholePitchClass}${compactClass}${partners.length ? " fcn-list-event-conflict" : ""}`;
          button.style.top = `${(event.start - firstMinute) * 1.2}px`;
          button.style.height = `${renderedHeight}px`;
          button.style.left = `calc(${columnStart / columns.length * 100 + lane * laneWidth}% + 2px)`;
          button.style.width = `calc(${laneWidth}% - 4px)`;
          button.title = `${event.team} · ${event.text}`;
          eventHeading.dataset.fullHeading = [shortTeamName(event.team), additionalEventInfo(event)]
            .filter(Boolean)
            .join(" · ");
          eventHeading.textContent = eventHeading.dataset.fullHeading;
          eventMeta.textContent = `${formatClock(event.start)}–${formatClock(event.end ?? event.start + 30)}${event.hasCalculatedEnd ? "*" : ""} · ${event.activityType.charAt(0)}${partners.length ? " · ⚠" : ""}`;
          button.append(eventHeading, eventMeta);
          button.addEventListener("click", () => openEventDetails(event, partners));
          canvas.append(button);
        });

        venueConflictGroups.forEach((group) => {
          group.sort((first, second) => first.start - second.start
            || (first.end ?? first.start + 30) - (second.end ?? second.start + 30)
            || shortTeamName(first.team).localeCompare(shortTeamName(second.team), "sv"));
          const groupStart = Math.min(...group.map((event) => event.start));
          const groupEnd = Math.max(...group.map((event) => event.end ?? event.start + 30));
          const ranges = group.map((event) => getEventColumnRange(event, columns));
          const columnStart = Math.min(...ranges.map((range) => range[0]));
          const columnEnd = Math.max(...ranges.map((range) => range[1]));
          const conflictEntryRows = getConflictEntryRows(group, columns, columnStart);
          const conflictRowCount = Math.max(...[...conflictEntryRows.values()].map((item) => item.row));
          const conflictBlock = document.createElement("section");
          const conflictHeading = document.createElement("strong");
          const conflictEntries = document.createElement("div");
          conflictBlock.className = "fcn-matrix-conflict-block";
          conflictBlock.style.top = `${(groupStart - firstMinute) * 1.2}px`;
          conflictBlock.style.height = `${(groupEnd - groupStart) * 1.2}px`;
          conflictBlock.style.left = `calc(${columnStart / columns.length * 100}% + 2px)`;
          conflictBlock.style.width = `calc(${(columnEnd - columnStart) / columns.length * 100}% - 4px)`;
          conflictBlock.style.setProperty("--conflict-columns", columnEnd - columnStart);
          conflictBlock.style.setProperty("--conflict-rows", conflictRowCount);
          conflictHeading.textContent = `⚠ Krockgrupp · ${group.length} bokningar`;
          conflictEntries.className = "fcn-conflict-entries";

          group.forEach((event) => {
              const entry = document.createElement("button");
              const entryHeading = document.createElement("strong");
              const entryMeta = document.createElement("span");
              const typeClass = event.activityType.toLocaleLowerCase("sv-SE").replace("ä", "a").replace("ö", "o");
              const partners = conflictPartners.get(event) ?? [];
              const { range: [pitchStart, pitchEnd], row } = conflictEntryRows.get(event);
              entry.type = "button";
              entry.className = `fcn-conflict-entry fcn-event-${typeClass}`;
              entry.style.gridColumn = `${pitchStart + 1} / ${pitchEnd + 1}`;
              entry.style.gridRow = String(row);
              entry.title = `${event.team} · ${event.text}`;
              entryHeading.dataset.fullHeading = [shortTeamName(event.team), additionalEventInfo(event)].filter(Boolean).join(" · ");
              entryHeading.textContent = entryHeading.dataset.fullHeading;
              entryMeta.textContent = `${formatClock(event.start)}–${formatClock(event.end ?? event.start + 30)} · ${event.pitch}`;
              entry.append(entryHeading, entryMeta);
              entry.addEventListener("click", () => openEventDetails(event, partners));
              conflictEntries.append(entry);
            });

          conflictBlock.append(conflictHeading, conflictEntries);
          canvas.append(conflictBlock);
        });

        matrix.append(corner, headers, times, canvas);
        scroll.append(matrix);
        venueSection.append(scroll);
        section.append(venueSection);
      });
      fragment.append(section);
    });
    if (scheduledEvents.some((event) => event.hasCalculatedEnd)) {
      const calculatedNote = document.createElement("p");
      calculatedNote.className = "fcn-calculated-note";
      calculatedNote.title = "Sluttiden räknas fram med den standardtid som är inställd under Matchtider.";
      calculatedNote.innerHTML = '<span aria-hidden="true">*</span> Beräknad sluttid utifrån matchformatets standardtid. <span class="fcn-info-icon" aria-label="Sluttiden räknas fram med den standardtid som är inställd under Matchtider." role="img">i</span>';
      fragment.append(calculatedNote);
    }
    container.replaceChildren(fragment);
    eventHeadingObserver?.disconnect();
    eventHeadingObserver = new ResizeObserver(() => fitEventHeadings(container));
    eventHeadingObserver.observe(container);
    fitEventHeadings(container);
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
    const previousSection = existingToolbar?.querySelector("#fcn-section-filter")?.value ?? "";
    existingToolbar?.remove();
    document.getElementById(VIEW_SWITCH_ID)?.remove();

    let matchDurations = loadMatchDurations();
    let events = collectEvents(calendars, matchDurations);
    if (!events.length) return false;
    observedEventRows = allEventRows;

    const calendarWrapper = calendars[0].matches(MODERN_CALENDAR_SELECTOR)
      ? calendars[0]
      : calendars[0].closest("#calWrap");
    calendarWrapper?.classList.add("fcn-calendar-replaced");

    const toolbar = document.createElement("section");
    toolbar.id = TOOLBAR_ID;
    toolbar.setAttribute("aria-label", "Grupperad bokningskalender med krockar");
    toolbar.innerHTML = `
      <div class="fcn-filter-heading">
        <div><strong>Bokningskalender</strong><span>Tid visas lodrätt och bokningsytor som kolumner. Klicka på en bokning för detaljer.</span></div>
        <output id="fcn-conflict-count" aria-live="polite"></output>
      </div>
      <div class="fcn-filter-controls">
        <label><span>Sektion</span><select id="fcn-section-filter"></select></label>
        <label><span>Period</span><select id="fcn-week-filter"></select></label>
        <label><span>Anläggning</span><select id="fcn-venue-filter"></select></label>
        <label><span>Bokningsyta</span><select id="fcn-pitch-filter" disabled></select></label>
        <label><span>Aktivitetstyp</span><select id="fcn-activity-filter"></select></label>
        <button type="button" id="fcn-reset-filter" class="fcn-secondary-button">Rensa</button>
      </div>
      <details class="fcn-duration-settings">
        <summary>Matchtider</summary>
        <p>Används när kalendern bara anger starttid. Ändringar sparas i webbläsaren.</p>
        <div class="fcn-duration-inputs"></div>
      </details>
      <div id="fcn-conflict-overview"></div>
      <p class="fcn-method-note">Krockar jämförs på samma datum och bokningsyta för matcher, träningar och övriga aktiviteter med en angiven bokningsyta. Vid krock mellan match och träning har matchen företräde som standard. Lagen kan därefter komma överens om annat. Hela konstgräsplanen räknas även mot dess delplaner. En angiven sluttid gäller alltid före standardtiden.</p>`;

    const viewSwitch = document.createElement("div");
    viewSwitch.id = VIEW_SWITCH_ID;
    viewSwitch.setAttribute("role", "group");
    viewSwitch.setAttribute("aria-label", "Kalendervy");
    viewSwitch.innerHTML = `
      <span>Visa kalender:</span>
      <button type="button" data-view="advanced">Avancerad</button>
      <button type="button" data-view="original">Original</button>`;

    if (calendars[0].matches(MODERN_CALENDAR_SELECTOR)) {
      const calendarHeader = calendars[0].querySelector(":scope > .sa-calendar__header");
      if (calendarHeader) calendarHeader.after(viewSwitch, toolbar);
      else calendars[0].prepend(viewSwitch, toolbar);
    } else {
      calendars[0].parentElement.insertBefore(viewSwitch, calendars[0]);
      viewSwitch.after(toolbar);
    }

    const sectionSelect = toolbar.querySelector("#fcn-section-filter");
    const weekSelect = toolbar.querySelector("#fcn-week-filter");
    const venueSelect = toolbar.querySelector("#fcn-venue-filter");
    const pitchSelect = toolbar.querySelector("#fcn-pitch-filter");
    const activitySelect = toolbar.querySelector("#fcn-activity-filter");
    const overview = toolbar.querySelector("#fcn-conflict-overview");
    const count = toolbar.querySelector("#fcn-conflict-count");
    const durationInputs = toolbar.querySelector(".fcn-duration-inputs");

    const originalSectionSelect = document.querySelector(".sa-calendar__filters .sa-calendar__filter-select");
    const sections = [...(originalSectionSelect?.options ?? [])]
      .map((option) => normalize(option.textContent))
      .filter((section) => section && section.toLocaleLowerCase("sv-SE") !== "hem");
    sectionSelect.append(createOption("", "Alla sektioner"));
    sections.forEach((section) => sectionSelect.append(createOption(section)));
    sectionSelect.value = sections.includes(previousSection) ? previousSection : "";

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
      const pitchesByNormalizedName = new Map();
      events.filter((event) =>
        eventBelongsToSection(event, sectionSelect.value)
        && (!weekSelect.value || event.week === weekSelect.value)
        && (!selectedVenue || event.venue === selectedVenue))
        .map((event) => event.pitch).filter(Boolean)
        .forEach((pitch) => {
          const normalized = normalizePitch(pitch);
          if (!pitchesByNormalizedName.has(normalized)) pitchesByNormalizedName.set(normalized, pitch);
        });
      const pitches = [...pitchesByNormalizedName.values()].sort((a, b) => a.localeCompare(b, "sv"));
      pitchSelect.replaceChildren(createOption("", "Alla bokningsytor"));
      pitches.forEach((pitch) => pitchSelect.append(createOption(pitch)));
      pitchSelect.disabled = !selectedVenue;
      pitchSelect.value = pitches.find((pitch) => normalizePitch(pitch) === normalizePitch(currentPitch)) ?? "";
    }

    function applyFilter() {
      const active = sectionSelect.value || weekSelect.value || venueSelect.value || pitchSelect.value || activitySelect.value;
      const filtered = events.filter((event) =>
        eventBelongsToSection(event, sectionSelect.value)
        && (!weekSelect.value || event.week === weekSelect.value)
        && (!venueSelect.value || event.venue === venueSelect.value)
        && (!pitchSelect.value || normalizePitch(event.pitch) === normalizePitch(pitchSelect.value))
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
        const rows = [...dayRow.querySelectorAll(
          dayRow.matches(".sa-calendar__date-group") ? MODERN_EVENT_SELECTOR : LEGACY_EVENT_ROW_SELECTOR
        )];
        const visible = !active || rows.some((row) => visibleRows.has(row));
        dayRow.hidden = !visible;
        dayRow.classList.toggle("fcn-hidden-by-filter", !visible);
        if (visible) dayRow.style.removeProperty("display");
        else dayRow.style.setProperty("display", "none", "important");
      });

      const groups = findConflictGroups(filtered);
      count.textContent = groups.length
        ? `${groups.length} ${groups.length === 1 ? "krock" : "krockar"}`
        : "Inga krockar";
      count.classList.toggle("fcn-count-clear", groups.length === 0);
      renderScheduleOverview(overview, filtered, !venueSelect.value);
    }

    function setCalendarView(view) {
      const showOriginal = view === "original";
      calendars.forEach((calendar) => {
        const wrapper = calendar.matches(MODERN_CALENDAR_SELECTOR) ? calendar : calendar.closest("#calWrap");
        wrapper?.classList.toggle("fcn-show-original", showOriginal);
      });
      viewSwitch.querySelectorAll("button[data-view]").forEach((button) => {
        const selected = button.dataset.view === view;
        button.classList.toggle("fcn-view-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });

      if (showOriginal) {
        allEventRows.forEach((row) => {
          row.hidden = false;
          row.classList.remove("fcn-hidden-by-filter");
          row.style.removeProperty("display");
        });
        calendars.flatMap(getDayRows).forEach((dayRow) => {
          dayRow.hidden = false;
          dayRow.classList.remove("fcn-hidden-by-filter");
          dayRow.style.removeProperty("display");
        });
      } else {
        applyFilter();
      }
      localStorage.setItem(CALENDAR_VIEW_KEY, view);
    }

    sectionSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    weekSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    venueSelect.addEventListener("change", () => { updatePitchOptions(); applyFilter(); });
    pitchSelect.addEventListener("change", applyFilter);
    activitySelect.addEventListener("change", applyFilter);
    toolbar.querySelector("#fcn-reset-filter").addEventListener("click", () => {
      sectionSelect.value = "";
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
    viewSwitch.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (button) setCalendarView(button.dataset.view);
    });

    updatePitchOptions();
    if ([...pitchSelect.options].some((option) => option.value === previousPitch)) {
      pitchSelect.value = previousPitch;
    }
    setCalendarView(localStorage.getItem(CALENDAR_VIEW_KEY) === "original" ? "original" : "advanced");
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
