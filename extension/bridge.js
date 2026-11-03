const channel = "orbit-extension";
function send(data) {
  window.postMessage({ channel, ...data }, location.origin);
}
window.addEventListener("message", async (e) => {
  if (
    e.source !== window ||
    e.origin !== location.origin ||
    e.data?.channel !== "orbit-dashboard"
  )
    return;
  const { type, requestId } = e.data;
  if (!["ping", "history", "revoke"].includes(type)) return;
  try {
    const result = await chrome.runtime.sendMessage({
      type,
      days: e.data.days,
    });
    send({ ...result, requestId });
  } catch {
    send({
      requestId,
      error: "Extension unavailable. Reload the dashboard after installation.",
    });
  }
});
send({ type: "ready" });
