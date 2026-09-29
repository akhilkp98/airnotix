import { DEMO_PASSWORD, ROLE_LABELS } from "../data/seed";
import {
  can,
  currentUser,
  getState,
  markAllNotificationsRead,
  markNotificationRead,
  resetDemo,
  setActiveUser,
  signIn,
  signOut
} from "../data/store";
import { esc, toast } from "./ui";

let ready = false;

export const isReady = () => ready;

const homeFor = (user) => (user && user.role === "cadet" ? "portal.html" : "index.html");

const visibleNotifications = (state, user) => state.notifications.filter((item) => {
  if (!user) {
    return false;
  }
  if (item.userId && item.userId === user.id) {
    return true;
  }
  return item.audienceRole && item.audienceRole === user.role;
});

const applyNavigation = (user) => {
  const cadet = user && user.role === "cadet";
  document.querySelectorAll("[data-nav-set]").forEach((list) => {
    list.hidden = (list.getAttribute("data-nav-set") === "cadet") !== cadet;
  });
  document.querySelectorAll("[data-nav-set='staff'] [data-permission]").forEach((item) => {
    item.hidden = !can(item.getAttribute("data-permission"));
  });
  document.querySelectorAll("[data-nav-set='staff'] .sidebar-header").forEach((header) => {
    let sibling = header.nextElementSibling;
    let any = false;
    while (sibling && !sibling.classList.contains("sidebar-header")) {
      if (!sibling.hidden && sibling.matches("[data-permission]")) {
        any = true;
      }
      sibling = sibling.nextElementSibling;
    }
    header.hidden = !any;
  });
  document.querySelectorAll("[data-shell-permission]").forEach((item) => {
    item.hidden = !can(item.getAttribute("data-shell-permission"));
  });
  const brand = document.querySelector(".sidebar-brand");
  if (brand) {
    brand.setAttribute("href", homeFor(user));
  }
};

const renderIdentity = (state) => {
  const user = currentUser();
  if (!user) {
    return;
  }
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = user.name;
  });
  document.querySelectorAll("[data-user-role]").forEach((node) => {
    node.textContent = ROLE_LABELS[user.role] || user.role;
  });
  document.querySelectorAll("[data-user-initials]").forEach((node) => {
    node.textContent = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  });
  const branch = document.getElementById("branch-label");
  if (branch) {
    branch.textContent = state.academy.branchName;
  }
  const menu = document.getElementById("role-switcher");
  if (menu) {
    menu.innerHTML = state.users.map((item) => `<button class="dropdown-item${item.id === user.id ? " active" : ""}" type="button" data-action="switch-user" data-user="${esc(item.id)}">${esc(item.name)}<span class="d-block small text-muted">${esc(ROLE_LABELS[item.role])}</span></button>`).join("");
  }
  const notes = visibleNotifications(state, user);
  const unread = notes.filter((item) => !item.read).length;
  const indicator = document.getElementById("notification-count");
  if (indicator) {
    indicator.textContent = String(unread);
    indicator.hidden = unread === 0;
  }
  const list = document.getElementById("notification-list");
  if (list) {
    list.innerHTML = notes.length ? notes.slice(0, 6).map((item) => `<a class="list-group-item" href="${esc(item.href)}" data-notification="${esc(item.id)}"><div class="text-dark">${esc(item.title)}</div><div class="text-muted small mt-1">${esc(item.body)}</div></a>`).join("") : `<div class="list-group-item text-muted">No notifications for this role.</div>`;
    const header = document.getElementById("notification-header");
    if (header) {
      header.textContent = unread ? `${unread} unread` : "Notifications";
    }
  }
};

const bindSearch = (state) => {
  const input = document.getElementById("global-search");
  const results = document.getElementById("search-results");
  if (!input || !results) {
    return;
  }
  const wrap = input.closest(".search-wrap");
  if (wrap) {
    wrap.hidden = !(can("cadets.view") || can("flights.view") || can("fleet.view"));
  }
  const render = () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }
    const hits = [];
    if (can("cadets.view")) {
      state.cadets.forEach((cadet) => {
        const name = `${cadet.firstName} ${cadet.lastName}`;
        if (`${name} ${cadet.code}`.toLowerCase().includes(query)) {
          hits.push({ href: `cadets.html?id=${cadet.id}`, label: name, meta: cadet.code });
        }
      });
    }
    if (can("flights.view")) {
      state.flights.forEach((flight) => {
        if (flight.reference.toLowerCase().includes(query)) {
          hits.push({ href: `flight-operations.html?id=${flight.id}`, label: flight.reference, meta: flight.status });
        }
      });
    }
    if (can("fleet.view")) {
      state.aircraft.forEach((aircraft) => {
        if (`${aircraft.code} ${aircraft.type}`.toLowerCase().includes(query)) {
          hits.push({ href: `fleet.html?id=${aircraft.id}`, label: aircraft.code, meta: aircraft.status });
        }
      });
    }
    results.innerHTML = hits.slice(0, 8).map((hit) => `<a href="${esc(hit.href)}">${esc(hit.label)}<span>${esc(hit.meta)}</span></a>`).join("") || `<p class="search-empty">No matching demo records.</p>`;
    results.hidden = false;
  };
  input.addEventListener("input", render);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) {
      results.hidden = true;
    }
  });
};

const bindShellActions = () => {
  document.addEventListener("click", (event) => {
    const notification = event.target.closest("[data-notification]");
    if (notification) {
      markNotificationRead(notification.getAttribute("data-notification"));
    }
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    const name = action.getAttribute("data-action");
    if (name === "switch-user") {
      setActiveUser(action.getAttribute("data-user"));
      const user = currentUser();
      window.location.href = homeFor(user);
    }
    if (name === "sign-out") {
      signOut();
      window.location.href = "sign-in.html";
    }
    if (name === "reset-demo") {
      resetDemo();
      toast("Demo data restored.");
      window.location.reload();
    }
    if (name === "mark-notifications") {
      event.preventDefault();
      markAllNotificationsRead();
      window.location.reload();
    }
  });
};

const initSignIn = () => {
  const form = document.getElementById("sign-in-form");
  if (!form) {
    return;
  }
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const error = document.getElementById("sign-in-error");
  const remember = document.getElementById("remember-demo");
  const storedEmail = window.localStorage.getItem("airnotix-demo-email");
  if (storedEmail && email) {
    email.value = storedEmail;
    if (remember) {
      remember.checked = true;
    }
  }
  const account = document.getElementById("demo-account");
  if (account && email) {
    account.addEventListener("change", () => {
      if (account.value) {
        email.value = account.value;
      }
    });
  }
  const toggle = document.getElementById("toggle-password");
  if (toggle && password) {
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", show ? "true" : "false");
    });
  }
  const forgot = document.getElementById("forgot-password");
  const resetNote = document.getElementById("reset-note");
  if (forgot && resetNote) {
    forgot.addEventListener("click", (event) => {
      event.preventDefault();
      resetNote.hidden = false;
      resetNote.textContent = `In this prototype, no email is sent. Use password “${DEMO_PASSWORD}”.`;
    });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = signIn(email.value, password.value);
    if (!result.ok) {
      error.hidden = false;
      error.textContent = result.error;
      return;
    }
    if (remember && remember.checked) {
      window.localStorage.setItem("airnotix-demo-email", email.value.trim());
    } else {
      window.localStorage.removeItem("airnotix-demo-email");
    }
    window.location.href = homeFor(result.user);
  });
};

const boot = () => {
  const page = document.body.dataset.page || "";
  if (page === "sign-in") {
    initSignIn();
    ready = false;
    return;
  }
  const state = getState();
  if (!state.signedIn) {
    window.location.href = "sign-in.html";
    ready = false;
    return;
  }
  const user = currentUser();
  applyNavigation(user);
  renderIdentity(state);
  bindSearch(state);
  const permission = document.body.dataset.permission || "";
  if (permission && !can(permission)) {
    const screen = document.getElementById("screen");
    if (screen) {
      const dest = homeFor(user);
      screen.innerHTML = `<section class="card"><div class="card-body"><h2 class="h5">This area is not available for ${esc(ROLE_LABELS[user.role] || "this role")}</h2><p class="text-muted mb-3">The demo role switcher only hides screens. A production system would enforce this on the server.</p><a class="btn btn-accent" href="${dest}">Back to your workspace</a></div></section>`;
    }
    ready = false;
    return;
  }
  const subtitle = document.querySelector(".header-subtitle");
  if (subtitle && !subtitle.textContent.includes(state.academy.name)) {
    subtitle.textContent = `${subtitle.textContent} · ${state.academy.name}`;
  }
  ready = true;
};

bindShellActions();
document.addEventListener("DOMContentLoaded", boot);
