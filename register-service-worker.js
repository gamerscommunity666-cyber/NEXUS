// Copy this snippet into your EXISTING index.html before </body>.
// Do not replace your current game scripts.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(registration => console.log("NEXUS PWA ready:", registration.scope))
      .catch(error => console.error("NEXUS PWA registration failed:", error));
  });
}
