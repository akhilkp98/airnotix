const initFilters = () => {
  const tables = new Set();

  document.querySelectorAll("[data-table-filter], [data-status-filter]").forEach((control) => {
    const selector = control.getAttribute("data-table-filter") || control.getAttribute("data-status-filter");
    const table = document.querySelector(selector);
    if (!table) {
      return;
    }
    tables.add(table);
    control.addEventListener("input", () => applyFilters(table));
    control.addEventListener("change", () => applyFilters(table));
  });

  tables.forEach((table) => applyFilters(table));
};

const applyFilters = (table) => {
  const search = document.querySelector(`[data-table-filter="#${table.id}"]`);
  const status = document.querySelector(`[data-status-filter="#${table.id}"]`);
  const query = (search && search.value ? search.value : "").trim().toLowerCase();
  const selected = status && status.value ? status.value : "";
  let visible = 0;

  table.querySelectorAll("tbody tr").forEach((row) => {
    const haystack = (row.getAttribute("data-search") || row.textContent).toLowerCase();
    const rowStatus = row.getAttribute("data-status") || "";
    const show = (!query || haystack.includes(query)) && (!selected || rowStatus === selected);
    row.hidden = !show;
    if (show) {
      visible += 1;
    }
  });

  const empty = document.querySelector(`[data-empty-for="#${table.id}"]`);
  if (empty) {
    empty.classList.toggle("d-none", visible !== 0);
  }
};

const initRecords = () => {
  const modalElement = document.getElementById("recordModal");
  if (!modalElement || !window.bootstrap) {
    return;
  }

  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-record-template]");
    if (!trigger) {
      return;
    }

    const template = document.getElementById(trigger.getAttribute("data-record-template"));
    if (!template) {
      return;
    }

    document.getElementById("recordModalTitle").textContent = trigger.getAttribute("data-record-title") || "Details";
    const body = document.getElementById("recordModalBody");
    body.innerHTML = "";
    body.appendChild(template.content.cloneNode(true));

    if (window.feather) {
      window.feather.replace();
    }

    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
  });
};

const initRosterDate = () => {
  const input = document.querySelector("[data-datepicker]");
  const note = document.getElementById("roster-note");
  if (!input || !window.flatpickr) {
    return;
  }

  window.flatpickr(input, {
    dateFormat: "Y-m-d",
    defaultDate: input.value || "2026-09-29",
    onChange: (dates, dateStr) => {
      if (note) {
        note.textContent = `Showing the demonstration roster. ${dateStr} uses the same sample programme.`;
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initFilters();
  initRecords();
  initRosterDate();
});
