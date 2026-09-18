document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".day-tab");
  const panels = document.querySelectorAll(".day-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });
});
