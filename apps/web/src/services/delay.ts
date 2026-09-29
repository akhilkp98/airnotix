export function delay(ms = 180) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
