function authorized(sender) {
  if (sender.id !== chrome.runtime.id || !sender.url) return false;
  try {
    const u = new URL(sender.url);
    return (
      (u.origin === "https://jphayden22.github.io" ||
        ["http://localhost:5173", "http://127.0.0.1:5173"].includes(
          u.origin,
        )) &&
      u.pathname.startsWith("/Consumer_Profile-/")
    );
  } catch {
    return false;
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!authorized(sender)) {
    respond({ error: "Unauthorized dashboard origin." });
    return false;
  }
  const run = async () => {
    if (message.type === "ping") return { type: "ready" };
    if (message.type === "revoke") {
      await chrome.permissions.remove({ permissions: ["history"] });
      return { type: "revoked" };
    }
    if (message.type !== "history") throw Error("Unsupported request");
    if (!(await chrome.permissions.contains({ permissions: ["history"] })))
      throw Error("Approve history access in the Orbit extension popup first.");
    if (![7, 30, 90].includes(message.days))
      throw Error("Invalid history period.");
    const start = Date.now() - message.days * 86400000,
      end = Date.now();
    const pages = await chrome.history.search({
      text: "",
      startTime: start,
      endTime: end,
      maxResults: 5000,
    });
    const records = [];
    let truncated = pages.length >= 5000;
    for (const page of pages) {
      if (!page.url) continue;
      let u;
      try {
        u = new URL(page.url);
        if (
          !["https:", "http:"].includes(u.protocol) ||
          u.username ||
          u.password
        )
          continue;
        u.search = "";
        u.hash = "";
      } catch {
        continue;
      }
      const visits = await chrome.history.getVisits({ url: page.url });
      for (const v of visits) {
        if (v.visitTime >= start && v.visitTime <= end) {
          records.push({
            url: u.href,
            title: page.title || "",
            time: v.visitTime,
          });
          if (records.length >= 30000) {
            truncated = true;
            break;
          }
        }
      }
      if (records.length >= 30000) break;
    }
    return { records, truncated };
  };
  run()
    .then(respond)
    .catch((e) => respond({ error: e.message }));
  return true;
});
