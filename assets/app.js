let DATA = null;
let VIEW = "projects";

const el = (id) => document.getElementById(id);
const qEl = el("q");
const yearEl = el("year");
const table = el("table");
const thead = table.querySelector("thead");
const tbody = table.querySelector("tbody");

function norm(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function joinInvest(investigators) {
  if (!Array.isArray(investigators)) return "";
  return investigators.join("; ");
}

function getYear(item) {
  const y = item?.year;
  return Number.isFinite(Number(y)) ? String(Number(y)) : "";
}

function setMeta() {
  if (!DATA) return;
  const v = DATA.version ?? "";
  const dt = DATA.fecha_publicacion ? new Date(DATA.fecha_publicacion) : null;
  const stamp = dt ? dt.toLocaleString() : "";
  el("meta").textContent = `v${v} · ${stamp}`;
}

function fillYearFilter() {
  const all = [...(DATA.projects || []), ...(DATA.articles || []), ...(DATA.manuals || [])];
  const years = Array.from(new Set(all.map(getYear).filter(Boolean))).sort((a, b) => Number(b) - Number(a));

  yearEl.innerHTML = `<option value="">Todos</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function getRows() {
  const rows = DATA?.[VIEW] || [];
  const q = norm(qEl.value);
  const y = yearEl.value;

  return rows.filter(item => {
    if (y && getYear(item) !== y) return false;

    if (!q) return true;

    const hay = [
      item.id,
      item.title,
      item.status,
      item.area,
      item.dicith,
      item.link,
      item.pdf,
      item.summary,
      getYear(item),
      joinInvest(item.investigators)
    ].map(norm).join(" | ");

    return hay.includes(q);
  });
}

function setStatus(text) {
  el("status").textContent = text || "";
}

function setCount(n, total) {
  el("count").textContent = `${n} de ${total} registros`;
}

function render() {
  if (!DATA) return;

  const rows = getRows();
  const total = (DATA[VIEW] || []).length;

  setCount(rows.length, total);

  if (VIEW === "projects") renderProjects(rows);
  if (VIEW === "articles") renderArticles(rows);
  if (VIEW === "manuals") renderManuals(rows);
}

function renderProjects(rows) {
  thead.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Título</th>
      <th>Investigadores</th>
      <th>Año</th>
      <th>Estado</th>
      <th>Área</th>
      <th>DICIHT</th>
      <th>CIA</th>
    </tr>
  `;

  tbody.innerHTML = rows.map(p => `
    <tr>
      <td class="mono">${escapeHtml(p.id)}</td>
      <td>${escapeHtml(p.title)}</td>
      <td>${escapeHtml(joinInvest(p.investigators))}</td>
      <td>${escapeHtml(getYear(p))}</td>
      <td><span class="badge badge-soft">${escapeHtml(p.status || "")}</span></td>
      <td>${escapeHtml(p.area || "")}</td>
      <td class="mono">${escapeHtml(p.dicith || "")}</td>
      <td>${p.isCIA ? "Sí" : "No"}</td>
    </tr>
  `).join("");
}

function renderArticles(rows) {
  thead.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Título</th>
      <th>Investigadores</th>
      <th>Año</th>
      <th>Estado</th>
      <th>DICIHT</th>
      <th>Enlace</th>
    </tr>
  `;

  tbody.innerHTML = rows.map(a => `
    <tr>
      <td class="mono">${escapeHtml(a.id)}</td>
      <td>${escapeHtml(a.title)}</td>
      <td>${escapeHtml(joinInvest(a.investigators))}</td>
      <td>${escapeHtml(getYear(a))}</td>
      <td><span class="badge badge-soft">${escapeHtml(a.status || "")}</span></td>
      <td class="mono">${escapeHtml(a.dicith || "")}</td>
      <td>${renderLink(a.link)}</td>
    </tr>
  `).join("");
}

function renderManuals(rows) {
  thead.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Título</th>
      <th>Año</th>
      <th>Resumen</th>
      <th>PDF</th>
    </tr>
  `;

  tbody.innerHTML = rows.map(m => `
    <tr>
      <td class="mono">${escapeHtml(m.id || "")}</td>
      <td>${escapeHtml(m.title)}</td>
      <td>${escapeHtml(getYear(m))}</td>
      <td>${escapeHtml(m.summary || "")}</td>
      <td>${renderPdf(m.pdf)}</td>
    </tr>
  `).join("");
}

function renderLink(url) {
  const u = String(url || "").trim();
  if (!u) return `<span class="text-muted">—</span>`;
  const safe = escapeAttr(u);
  return `<a href="${safe}" target="_blank" rel="noopener">Abrir</a>`;
}

function renderPdf(path) {
  const p = String(path || "").trim();
  if (!p) return `<span class="text-muted">—</span>`;
  // Si lo publicas en GitHub Pages, el PDF debe existir en el repo con la misma ruta.
  const safe = escapeAttr(p);
  return `<a href="${safe}" target="_blank" rel="noopener">Ver PDF</a>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  // Mínimo para atributos href
  return escapeHtml(s).replaceAll(" ", "%20");
}

async function load() {
  setStatus("Cargando datos...");
  const res = await fetch("data/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar data/data.json");
  DATA = await res.json();

  setMeta();
  fillYearFilter();
  setStatus("");
  render();
}

function bind() {
  // Tabs
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      VIEW = btn.dataset.view;
      render();
    });
  });

  // Filters
  qEl.addEventListener("input", render);
  yearEl.addEventListener("change", render);

  el("clear").addEventListener("click", () => {
    qEl.value = "";
    yearEl.value = "";
    render();
  });
}

bind();
load().catch(err => {
  console.error(err);
  setStatus("Error cargando datos. Revisa consola y confirma que existe data/data.json");
});
