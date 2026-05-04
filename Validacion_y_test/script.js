const slides = [...document.querySelectorAll(".slide")];
const dotsHost = document.getElementById("slideDots");
const currentSlide = document.getElementById("currentSlide");
const totalSlides = document.getElementById("totalSlides");
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const trustData = [
  { label: "1", meaning: "Nada seguro", percent: 10, count: 1 },
  { label: "2", meaning: "Poco seguro", percent: 0, count: 0 },
  { label: "3", meaning: "Neutral", percent: 10, count: 1 },
  { label: "4", meaning: "Seguro", percent: 30, count: 3 },
  { label: "5", meaning: "Muy seguro", percent: 50, count: 5 }
];

const satisfactionData = [
  { label: "1", meaning: "No recomendaría", percent: 10, count: 1 },
  { label: "2", meaning: "Poco probable", percent: 0, count: 0 },
  { label: "3", meaning: "Neutral", percent: 10, count: 1 },
  { label: "4", meaning: "Lo recomendaría", percent: 30, count: 3 },
  { label: "5", meaning: "Sin dudarlo", percent: 50, count: 5 }
];

const navigationData = [
  { label: "1", meaning: "Muy difícil", percent: 0, count: 0 },
  { label: "2", meaning: "Difícil", percent: 0, count: 0 },
  { label: "3", meaning: "Intermedio", percent: 10, count: 1 },
  { label: "4", meaning: "Fácil", percent: 50, count: 5 },
  { label: "5", meaning: "Muy fácil", percent: 40, count: 4 }
];

const flowData = [
  { label: "No quedó completamente claro", percent: 40, count: 4 },
  { label: "Sí, definitivamente", percent: 30, count: 3 },
  { label: "Sí, quedó claro, aunque podría explicarse con más detalle", percent: 30, count: 3 },
  { label: "No, la información fue confusa o insuficiente", percent: 0, count: 0 }
];

const frictionData = [
  { label: "Ver el resumen del carrito", percent: 40, count: 4 },
  { label: "No tuve ninguna dificultad", percent: 30, count: 3 },
  { label: "Enviar el pedido por WhatsApp", percent: 20, count: 2 },
  { label: "Encontrar el producto en el catálogo", percent: 10, count: 1 },
  { label: "Entender cómo agregar al carrito", percent: 0, count: 0 },
  { label: "Otro", percent: 10, count: 1 }
];

const searchMissionData = [
  { label: "Completaron la tarea", value: 80, detail: "8 de 10 llegaron a la amoladora", className: "success" },
  { label: "Abandonaron la misión", value: 20, detail: "2 de 10 no terminaron", className: "drop" },
  { label: "Tuvieron clics fuera del objetivo", value: 50, detail: "5 de 10 hicieron misclick", className: "miss" }
];

const orderMissionData = [
  { label: "Completaron el envío", value: 70, detail: "7 de 10 llegaron a WhatsApp", className: "success" },
  { label: "Abandonaron la misión", value: 30, detail: "3 de 10 no terminaron", className: "drop" },
  { label: "Tuvieron clics fuera del objetivo", value: 27.6, detail: "fricción menor que en búsqueda", className: "miss" }
];

const wordData = [
  { label: "Fácil de usar", percent: 50, count: 5 },
  { label: "Útil", percent: 40, count: 4 },
  { label: "Moderno", percent: 30, count: 3 },
  { label: "Rápido", percent: 30, count: 3 },
  { label: "Familiar", percent: 20, count: 2 },
  { label: "Profesional", percent: 20, count: 2 },
  { label: "Atractivo", percent: 20, count: 2 },
  { label: "Confiable", percent: 20, count: 2 },
  { label: "Económico", percent: 10, count: 1 },
  { label: "Innovador", percent: 10, count: 1 },
  { label: "Amigable", percent: 10, count: 1 },
  { label: "Cercano", percent: 10, count: 1 },
  { label: "Confuso", percent: 10, count: 1 }
];

let activeIndex = 0;

function pad(value) {
  return String(value).padStart(2, "0");
}

function peopleText(count, total = 10) {
  const subject = count === 1 ? "persona" : "personas";
  return `${count} de ${total} ${subject}`;
}

function wordMentionText(count) {
  const action = count === 1 ? "lo asoció" : "lo asociaron";
  return `${peopleText(count)} ${action} con esta palabra`;
}

function renderDots() {
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slide-dot";
    dot.setAttribute("aria-label", `Ir a ${slide.dataset.title}`);
    dot.addEventListener("click", () => goToSlide(index));
    dotsHost.appendChild(dot);
  });
}

function goToSlide(index) {
  activeIndex = Math.max(0, Math.min(slides.length - 1, index));

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });

  [...dotsHost.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeIndex);
  });

  currentSlide.textContent = pad(activeIndex + 1);
  progressBar.style.width = `${((activeIndex + 1) / slides.length) * 100}%`;
  history.replaceState(null, "", `#slide-${activeIndex + 1}`);
}

function renderScaleChart(hostId, data) {
  const host = document.getElementById(hostId);
  const max = Math.max(...data.map((item) => item.percent));
  const total = data.reduce((sum, item) => sum + item.count, 0);
  host.innerHTML = data.map((item, index) => {
    const height = max === 0 ? 0 : Math.max(7, (item.percent / max) * 82);
    const choiceText = item.count === 1 ? "eligió" : "eligieron";
    return `
      <article class="scale-bar">
        <div class="bar-label">
          <strong>${item.percent}%</strong>
          <span>${peopleText(item.count, total)} ${choiceText} ${item.meaning} (${item.label})</span>
        </div>
        <div class="bar-fill" style="height: ${height}%; animation-delay: ${index * 80}ms"></div>
        <div class="bar-index"><strong>${item.label}</strong><span>${item.meaning}</span></div>
      </article>
    `;
  }).join("");
}

function renderHorizontalChart() {
  const host = document.getElementById("flowChart");
  host.innerHTML = flowData.map((item, index) => {
    const width = item.percent === 0 ? 100 : item.percent;
    const zeroClass = item.percent === 0 ? " zero" : "";
    return `
      <article class="h-row">
        <header>
          <span>${item.label}</span>
          <span>${peopleText(item.count)}</span>
        </header>
        <div class="h-track">
          <div class="h-fill${zeroClass}" style="--width: ${width}%; animation-delay: ${index * 90}ms"><strong>${item.percent}%</strong><span>${peopleText(item.count)}</span></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderDataBarChart(hostId, data) {
  const host = document.getElementById(hostId);
  host.innerHTML = data.map((item, index) => {
    const width = item.percent === 0 ? 100 : item.percent;
    const zeroClass = item.percent === 0 ? " zero" : "";
    return `
      <article class="h-row">
        <header>
          <span>${item.label}</span>
          <span>${peopleText(item.count)}</span>
        </header>
        <div class="h-track">
          <div class="h-fill${zeroClass}" style="--width: ${width}%; animation-delay: ${index * 80}ms"><strong>${item.percent}%</strong><span>${peopleText(item.count)}</span></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMissionMetrics(hostId, data) {
  const host = document.getElementById(hostId);
  host.innerHTML = data.map((item, index) => `
    <article class="radial-card ${item.className}" style="--value: ${item.value}; animation-delay: ${index * 80}ms">
      <div class="radial-ring">
        <strong>${item.value}%</strong>
      </div>
      <span>${item.label}</span>
      <small>${item.detail}</small>
    </article>
  `).join("");
}

function renderWordBars() {
  const host = document.getElementById("wordBars");
  host.innerHTML = wordData.map((item, index) => `
    <article class="word-bar">
      <span>${item.label}</span>
      <div class="mini-track">
        <div class="mini-fill" style="--width: ${item.percent}%; animation-delay: ${index * 45}ms"></div>
      </div>
      <strong>${item.percent}%</strong>
      <small>${wordMentionText(item.count)}</small>
    </article>
  `).join("");
}

function drawDonut() {
  const canvas = document.getElementById("mapTrustDonut");
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const center = width / 2;
  const radius = 132;
  const lineWidth = 48;
  const yesValue = 0.9;
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * yesValue;

  context.clearRect(0, 0, width, width);

  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.strokeStyle = "rgba(24, 33, 47, 0.12)";
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "#f97316";
  context.beginPath();
  context.arc(center, center, radius, start, end);
  context.stroke();

  context.strokeStyle = "#111111";
  context.beginPath();
  context.arc(center, center, radius, end + 0.08, start + Math.PI * 2 - 0.08);
  context.stroke();

  context.fillStyle = "#111111";
  context.font = "900 72px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("90%", center, center - 10);

  context.fillStyle = "#667085";
  context.font = "800 20px Inter, system-ui, sans-serif";
  context.fillText("dijo sí", center, center + 48);
}

function boot() {
  totalSlides.textContent = pad(slides.length);
  renderDots();
  renderMissionMetrics("searchMissionChart", searchMissionData);
  renderMissionMetrics("orderMissionChart", orderMissionData);
  renderScaleChart("navigationChart", navigationData);
  renderDataBarChart("frictionChart", frictionData);
  renderScaleChart("trustChart", trustData);
  renderScaleChart("satisfactionChart", satisfactionData);
  renderHorizontalChart();
  renderWordBars();
  drawDonut();
  const requestedSlide = Number.parseInt(location.hash.replace("#slide-", ""), 10);
  goToSlide(Number.isFinite(requestedSlide) ? requestedSlide - 1 : 0);
}

prevBtn.addEventListener("click", () => goToSlide(activeIndex - 1));
nextBtn.addEventListener("click", () => goToSlide(activeIndex + 1));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    goToSlide(activeIndex + 1);
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    goToSlide(activeIndex - 1);
  }

  if (event.key === "Home") {
    goToSlide(0);
  }

  if (event.key === "End") {
    goToSlide(slides.length - 1);
  }
});

boot();
