const ecosystemNav = document.createElement("script"); ecosystemNav.type="module"; ecosystemNav.src="/ecosystem/navigation.js"; document.head.append(ecosystemNav);
import { Experience } from "./Experience/Experience";
import { Modal } from "./Experience/Modal";
import "./style.css";

const experience = new Experience();

const infoModal = new Modal();
const infoBtn = document.getElementById("info-btn");

infoBtn.addEventListener("mouseenter", () => {
  experience.world?.raycaster?.showHitboxMarkers();
});

infoBtn.addEventListener("mouseleave", () => {
  experience.world?.raycaster?.hideHitboxMarkers();
});

infoBtn.addEventListener("click", () => {
  infoModal.openHTML(
    "Information & Credits",
    `This is a prototype comfort web experience for couples therapy. Digital mental health interventions often have high attrition rates (i.e., people stop using digital solutions quickly over time). This website is an experiment to personalize these solutions in more creative/playful ways to help keep retention up to the point where the website or the solutions in the website are no longer needed. <br><br>Of course, depending on the day, you might swing more avoidant or anxious and it doesn't necessarily mean you have an insecure attachment style; so don't take everything in this website as "binary" it's more of just general patterns.
<br><br>
Click around to explore!! For a full set of credits, see the <a href="https://github.com/andrewwoan/john-and-patricias-romantic-comfort-website" target="_blank" rel="noopener">GitHub Repository</a> and a <a href="https://www.youtube.com/watch?v=w2MnkhTGJQA" target="_blank" rel="noopener">YouTube tutorial</a> on how to create a comfort website with little technical knowledge required.`,
  );
});

const btn = document.getElementById("day-night-toggle");
const icon = btn.querySelector(".day-night-btn__icon");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.setAttribute("aria-label", "Loading lighting");
  try { await experience.world?.room?.toggleDayNight(); }
  catch { btn.setAttribute("aria-label", "Lighting could not load. Try again."); return; }
  finally { btn.disabled = false; }
  btn.setAttribute("aria-label", "Switch day and night");
  const goingNight = experience.world.room?.isNight ?? false;
  icon.innerHTML = goingNight ? "&#9728;" : "&#9790;";
  experience.world?.raycaster?.setDayNightVolume(goingNight);
});
