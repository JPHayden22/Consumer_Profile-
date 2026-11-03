document.getElementById("grant").onclick = async () => {
  try {
    const ok = await chrome.permissions.request({ permissions: ["history"] });
    document.getElementById("status").textContent = ok
      ? "Approved. Return to Orbit and reload the dashboard. Select a period and analyze."
      : "Permission declined.";
  } catch (e) {
    document.getElementById("status").textContent = e.message;
  }
};
document.getElementById("revoke").onclick = async () => {
  await chrome.permissions.remove({ permissions: ["history"] });
  document.getElementById("status").textContent =
    "History permission revoked. Delete already imported data in Orbit.";
};
