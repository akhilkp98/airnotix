export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[char]));

const BADGES = {
  Active: "badge-ready",
  Approved: "badge-ready",
  Completed: "badge-ready",
  Available: "badge-ready",
  Accepted: "badge-ready",
  Satisfactory: "badge-ready",
  Published: "badge-ready",
  Recorded: "badge-ready",
  "Awaiting approval": "badge-soon",
  Pending: "badge-soon",
  "On Hold": "badge-soon",
  Restricted: "badge-soon",
  Limited: "badge-soon",
  Draft: "badge-progress",
  "In progress": "badge-progress",
  Open: "badge-progress",
  Archived: "badge-progress",
  "Further Training Required": "badge-soon",
  "Not Assessed": "badge-progress",
  Rejected: "badge-hold",
  Cancelled: "badge-hold",
  Overdue: "badge-hold",
  Maintenance: "badge-hold",
  High: "badge-hold",
  "Release recorded": "badge-ready",
  "Low stock": "badge-soon"
};

export const badge = (status) => `<span class="badge-status ${BADGES[status] || "badge-progress"}">${esc(status || "—")}</span>`;

export const toast = (message) => {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const item = document.createElement("div");
  item.className = "demo-toast";
  item.textContent = message;
  stack.appendChild(item);
  window.setTimeout(() => item.remove(), 4200);
};

export const mount = (html) => {
  const screen = document.getElementById("screen");
  if (screen) {
    screen.innerHTML = html;
  }
  if (window.feather) {
    window.feather.replace();
  }
};

export const confirmAction = ({ title, body, confirmLabel, danger }) => new Promise((resolve) => {
  const modalElement = document.getElementById("confirmModal");
  if (!modalElement || !window.bootstrap) {
    resolve(window.confirm(body.replace(/<[^>]+>/g, "")));
    return;
  }
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmBody").innerHTML = body;
  const accept = document.getElementById("confirmAccept");
  accept.textContent = confirmLabel || "Confirm";
  accept.classList.toggle("btn-danger", Boolean(danger));
  accept.classList.toggle("btn-accent", !danger);
  const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
  let settled = false;
  const finish = (value) => {
    if (settled) {
      return;
    }
    settled = true;
    accept.removeEventListener("click", onAccept);
    modalElement.removeEventListener("hidden.bs.modal", onHide);
    resolve(value);
  };
  const onAccept = () => {
    const reason = modalElement.querySelector("[data-confirm-reason]");
    finish({ ok: true, reason: reason ? reason.value.trim() : "" });
    modal.hide();
  };
  const onHide = () => finish({ ok: false, reason: "" });
  accept.addEventListener("click", onAccept);
  modalElement.addEventListener("hidden.bs.modal", onHide);
  modal.show();
});

export const reasonField = (label) => `<label class="form-label" for="confirm-reason">${esc(label)}</label><textarea class="form-control" id="confirm-reason" data-confirm-reason rows="3"></textarea>`;

export const emptyRow = (cols, message) => `<tr><td colspan="${cols}"><p class="table-empty">${esc(message)}</p></td></tr>`;

export const field = (id, label, control) => `<div class="mb-3"><label class="form-label" for="${id}">${esc(label)}</label>${control}</div>`;
