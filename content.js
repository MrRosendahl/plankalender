(() => {
  "use strict";

  const TARGET_CALENDAR_ID = "370929";
  const VENUES = ["Norrvallen", "Rosvalla", "Hedvalla", "Sjulevi"];
  const ACTIVITY_TYPES = ["Match", "Träning", "Övrigt"];
  const TOOLBAR_ID = "fcn-plankalender";
  const EVENT_ROW_SELECTOR = ":scope > td:nth-child(4) > table > tbody > tr";
  let observedEventRows = [];

  if (new URLSearchParams(window.location.search).get("ID") !== TARGET_CALENDAR_ID) {
    return;
  }

  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  function findCalendars() {
    const form = document.querySelector("#myForm");
    if (!form) return [];

    return [...form.querySelectorAll("table.mCal")].filter((table) => getDayRows(table).length);
  }

  function getDayRows(calendar) {
    const rows = calendar.tBodies[0]?.rows ?? [];
    return [...rows].filter((row) => row.querySelector(EVENT_ROW_SELECTOR));
  }

  function getEventRows(container) {
    return getDayRows(container)
      .flatMap((dayRow) => [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)]);
  }

  function parseEvent(row) {
    const cells = row.cells;
    if (cells.length < 2) return null;

    const links = [...cells[1].querySelectorAll("a")];
    const team = normalize(links[0]?.textContent ?? "");
    const eventLink = links.find((link) => link.classList.contains("kal")) ?? links[1];
    const eventText = normalize(eventLink?.textContent ?? cells[1].textContent);
    const venue = VENUES.find((name) =>
      eventText.toLocaleLowerCase("sv-SE").includes(name.toLocaleLowerCase("sv-SE"))
    );
    const activityLabel = normalize(
      row.querySelector(".calBox")?.getAttribute("data-original-title") ?? ""
    );
    const activityType = ACTIVITY_TYPES.includes(activityLabel) ? activityLabel : "Övrigt";
    let pitch = "";

    if (venue) {
      const commaIndex = eventText.lastIndexOf(",");
      const location = commaIndex >= 0 ? normalize(eventText.slice(commaIndex + 1)) : eventText;
      pitch = normalize(
        location
          .replace(new RegExp(`^${venue}\\s*`, "i"), "")
          .replace(/\s*\(\s*\)\s*$/, "")
      ) || "Ospecificerad plan";
    }

    return {
      row,
      venue,
      pitch,
      activityType,
      team,
      text: eventText
    };
  }

  function collectEvents(calendars) {
    return calendars
      .flatMap(getEventRows)
      .map(parseEvent)
      .filter(Boolean);
  }

  function createOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
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

    const events = collectEvents(calendars);
    if (!events.length) return false;
    observedEventRows = allEventRows;
    const eventsByRow = new Map(events.map((event) => [event.row, event]));

    const toolbar = document.createElement("section");
    toolbar.id = TOOLBAR_ID;
    toolbar.setAttribute("aria-label", "Filtrera kalendern per anläggning, plan och aktivitetstyp");
    toolbar.innerHTML = `
      <div class="fcn-filter-heading">
        <strong>Plankalender</strong>
        <span>Visa bokningar för en viss anläggning, plan och aktivitetstyp.</span>
      </div>
      <div class="fcn-filter-controls">
        <label>
          <span>Anläggning</span>
          <select id="fcn-venue-filter"></select>
        </label>
        <label>
          <span>Plan</span>
          <select id="fcn-pitch-filter" disabled></select>
        </label>
        <label>
          <span>Aktivitetstyp</span>
          <select id="fcn-activity-filter"></select>
        </label>
        <button type="button" id="fcn-reset-filter">Rensa filter</button>
      </div>
      <p id="fcn-filter-result" aria-live="polite"></p>
    `;

    calendars[0].parentElement.insertBefore(toolbar, calendars[0]);

    const venueSelect = toolbar.querySelector("#fcn-venue-filter");
    const pitchSelect = toolbar.querySelector("#fcn-pitch-filter");
    const activitySelect = toolbar.querySelector("#fcn-activity-filter");
    const resetButton = toolbar.querySelector("#fcn-reset-filter");
    const result = toolbar.querySelector("#fcn-filter-result");

    venueSelect.append(createOption("", "Alla anläggningar"));
    VENUES.forEach((venue) => venueSelect.append(createOption(venue)));
    venueSelect.value = VENUES.includes(previousVenue) ? previousVenue : "";

    activitySelect.append(createOption("", "Alla aktivitetstyper"));
    ACTIVITY_TYPES.forEach((activityType) => activitySelect.append(createOption(activityType)));
    activitySelect.value = ACTIVITY_TYPES.includes(previousActivity) ? previousActivity : "";

    function updatePitchOptions() {
      const selectedVenue = venueSelect.value;
      const previousPitch = pitchSelect.value;
      const pitches = [...new Set(
        events
          .filter((event) => !selectedVenue || event.venue === selectedVenue)
          .map((event) => event.pitch)
      )].sort((a, b) => a.localeCompare(b, "sv"));

      pitchSelect.replaceChildren(createOption("", "Alla planer"));
      pitches.forEach((pitch) => pitchSelect.append(createOption(pitch)));
      pitchSelect.disabled = !selectedVenue;
      pitchSelect.value = pitches.includes(previousPitch) ? previousPitch : "";
    }

    function applyFilter() {
      const selectedVenue = venueSelect.value;
      const selectedPitch = pitchSelect.value;
      const selectedActivity = activitySelect.value;
      const active = selectedVenue || selectedPitch || selectedActivity;
      let visibleCount = 0;

      allEventRows.forEach((row) => {
        const event = eventsByRow.get(row);
        const visible = !active || Boolean(
          event
          && (!selectedVenue || event.venue === selectedVenue)
          && (!selectedPitch || event.pitch === selectedPitch)
          && (!selectedActivity || event.activityType === selectedActivity)
        );
        row.classList.toggle("fcn-hidden-by-filter", !visible);
        row.hidden = !visible;
        if (visible) {
          row.style.removeProperty("display");
        } else {
          row.style.setProperty("display", "none", "important");
        }
        if (active && visible) visibleCount += 1;
      });

      const dayRows = calendars.flatMap(getDayRows);
      dayRows.forEach((dayRow) => {
        const eventRows = [...dayRow.querySelectorAll(EVENT_ROW_SELECTOR)];
        const hasVisibleEvent = eventRows.some((row) => !row.classList.contains("fcn-hidden-by-filter"));
        const hideDay = Boolean(active) && !hasVisibleEvent;
        dayRow.classList.toggle("fcn-hidden-by-filter", hideDay);
        dayRow.hidden = hideDay;
        if (hideDay) {
          dayRow.style.setProperty("display", "none", "important");
        } else {
          dayRow.style.removeProperty("display");
        }
      });

      calendars.forEach((calendar) => {
        calendar.classList.toggle("fcn-filter-active", Boolean(active));
      });
      result.textContent = active
        ? `${visibleCount} bokningar visas.`
        : `Alla ${events.length} bokningar på de fyra anläggningarna visas.`;
    }

    venueSelect.addEventListener("change", () => {
      updatePitchOptions();
      applyFilter();
    });
    pitchSelect.addEventListener("change", applyFilter);
    activitySelect.addEventListener("change", applyFilter);
    resetButton.addEventListener("click", () => {
      venueSelect.value = "";
      activitySelect.value = "";
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

  // Kalendern hämtas ibland via JavaScript efter att content-scriptet har körts.
  // Bevaka därför sidan tills kalendern finns, och även om månadsvyn ersätts senare.
  const observer = new MutationObserver(scheduleInitialization);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleInitialization();
})();
