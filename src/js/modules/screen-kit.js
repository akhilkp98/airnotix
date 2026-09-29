import { getState } from "../data/store";
import { isReady } from "./session";

const formHandlers = {};
const clickHandlers = {};
let renderer = () => {};

export const onForm = (name, handler) => {
  formHandlers[name] = handler;
};

export const onClick = (name, handler) => {
  clickHandlers[name] = handler;
};

export const setRenderer = (next) => {
  renderer = next;
};

export const refresh = () => renderer(getState());

document.addEventListener("click", async (event) => {
  const button = event.target.closest("#screen [data-action]");
  if (!button) {
    return;
  }
  const handler = clickHandlers[button.getAttribute("data-action")];
  if (handler) {
    await handler(button);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.form || !form.closest("#screen")) {
    return;
  }
  const handler = formHandlers[form.dataset.form];
  if (!handler) {
    return;
  }
  event.preventDefault();
  handler(form, Object.fromEntries(new FormData(form).entries()), event);
});

document.addEventListener("DOMContentLoaded", () => {
  if (isReady()) {
    refresh();
  }
});
