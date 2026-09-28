/* Matriz de cerrados por mes y por persona — corre dentro de Redmine, usa tu sesión.
   Volver a hacer clic en el bookmarklet lo cierra. */
(async function () {
  const ID = "rmeq";
  const CLAVE = "rmeq:config";
  const previo = document.getElementById(ID);
  if (previo) { previo.remove(); document.body.style.overflow = ""; return; }

  /* Clientes de ADP, por identificador de proyecto. Editá esta lista si cambia la cartera. */
  const ADP = ["amex", "bunge", "cargill", "corteva", "dow", "faurecia", "general-motors",
               "global-business-travel", "halliburton", "ibm", "john-deere", "jhonson-jhonson",
               "j-p-morgan", "kyndryl", "national-oliwell-varco", "weatherford", "alight-interno"];
  /* Equipo de ADP, por id de usuario de Redmine. */
  const EQUIPO = [36, 17, 70, 80, 56, 26];

  const hoy = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const nombreMes = m => MES[+m.slice(5, 7) - 1] + " " + m.slice(2, 4);

  if (!document.getElementById("rmdash-fuente")) {
    const l = document.createElement("link");
    l.id = "rmdash-fuente"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
    document.head.append(l);
  }

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483000";
  const R = host.attachShadow({ mode: "open" });
  document.body.append(host);
  document.body.style.overflow = "hidden";

  R.innerHTML = `<style>
    *{box-sizing:border-box;margin:0;padding:0}
    .raiz{position:absolute;inset:0;overflow:auto;background:#FBFAF5;color:#1C2621;
      font:400 15px/1.55 "IBM Plex Sans",Segoe UI,system-ui,sans-serif;
      -webkit-font-smoothing:antialiased;text-align:left}
    .hoja{max-width:1000px;margin:0 auto;padding:34px 24px 70px}
    header{border-top:3px solid #1C2621;padding-top:14px;display:flex;
      justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
    h1{font-size:19px;font-weight:600;letter-spacing:-.01em}
    .meta{font-size:13px;color:#6C776F;font-family:"IBM Plex Mono",Consolas,monospace}
    .cerrar{position:fixed;top:14px;right:18px;border:1px solid #CBD5C7;background:#fff;
      border-radius:2px;font:inherit;font-size:13px;padding:6px 12px;cursor:pointer;color:#1C2621}
    .barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:22px 0 18px}
    .barra > label{font-size:13px;color:#6C776F}
    .ctl{font:inherit;font-size:14px;line-height:20px;height:34px;padding:6px 10px;
      border:1px solid #CBD5C7;background:#fff;border-radius:2px;color:#1C2621;cursor:pointer}
    select.ctl{-webkit-appearance:none;appearance:none;padding-right:26px;min-width:178px;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='7'><path d='M0 0h10L5 7z' fill='%236C776F'/></svg>");
      background-repeat:no-repeat;background-position:right 9px center}
    .drop{position:relative}
    .drop > button{min-width:200px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .drop > button::after{content:"▾";color:#6C776F}
    .panel{position:absolute;z-index:5;top:calc(100% + 4px);left:0;min-width:280px;max-height:340px;
      overflow:auto;background:#fff;border:1px solid #1C2621;border-radius:2px;padding:6px;
      box-shadow:0 6px 18px rgba(28,38,33,.16)}
    .panel[hidden]{display:none}
    .todos{display:flex;gap:8px;padding:2px 6px 8px;border-bottom:1px solid #CBD5C7;margin-bottom:6px}
    .todos button{font:inherit;font-size:12.5px;padding:2px 8px;border:1px solid #CBD5C7;
      background:#FBFAF5;border-radius:2px;cursor:pointer;color:#2F6B4F}
    .op{display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;font-size:14px}
    .op:hover{background:#E4EDE3}
    .op input{accent-color:#2F6B4F;width:14px;height:14px}
    .sello{margin-left:auto;font-size:12.5px;color:#6C776F}
    table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
    th,td{padding:7px 9px;text-align:right;white-space:nowrap}
    th:first-child,td:first-child{text-align:left}
    thead th{font-weight:600;font-size:12.5px;color:#6C776F;border-bottom:1.5px solid #1C2621}
    tbody tr:nth-child(odd){background:#E4EDE3}
    td.n{font-family:"IBM Plex Mono",Consolas,monospace;font-variant-numeric:tabular-nums}
    td.tot{font-weight:600}
    td.cero{color:#B6BFB8}
    tfoot td{border-top:1.5px solid #1C2621;font-weight:600;
      font-family:"IBM Plex Mono",Consolas,monospace}
    tfoot td:first-child{font-family:inherit}
    .yo{font-weight:600}
    .aviso{margin-top:20px;border-left:3px solid #9A6A1E;padding:4px 0 4px 14px;
      color:#6C776F;font-size:13.5px}
    .cargando{padding:40px 4px;color:#6C776F}
  </style>
  <div class="raiz">
    <button class="cerrar">Cerrar (Esc)</button>
    <div class="hoja">
      <header><h1>Cerrados por mes y por persona</h1><div class="meta"></div></header>
      <div class="barra">
        <label>Período</label>
        <select class="ctl per">
          <option value="ytd">Este año</option>
          <option value="12m">Últimos 12 meses</option>
          <option value="prev">Año pasado</option>
        </select>
        <label>Clientes</label>
        <select class="ctl cli">
          <option value="adp">Solo clientes ADP</option>
          <option value="todos">Todos los proyectos</option>
        </select>
        <label>Personas</label>
        <div class="drop">
          <button type="button" class="ctl"><span>—</span></button><div class="panel" hidden></div>
        </div>
        <span class="sello"></span>
      </div>
      <div class="cargando">Consultando Redmine…</div>
      <div class="tabla"></div>
      <div class="aviso" hidden></div>
    </div>
  </div>`;

  const $ = s => R.querySelector(s);
  const $$ = s => [...R.querySelectorAll(s)];
  const cerrar = () => {
    host.remove(); document.body.style.overflow = "";
    document.removeEventListener("keydown", atajo, true);
  };
  const atajo = e => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
  $(".cerrar").onclick = cerrar;
  document.addEventListener("keydown", atajo, true);

  /* ---------- API ---------- */
  const pedir = async (ruta, params) => {
    const u = new URL(ruta, location.origin);
    for (const [k, v] of params) u.searchParams.append(k, v);
    const r = await fetch(u, { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
    return r.json();
  };
  const paginarPares = async (ruta, clave, pares) => {
    let off = 0, out = [];
    for (;;) {
      const d = await pedir(ruta, [...pares, ["offset", off], ["limit", 100]]);
      out = out.concat(d[clave] || []);
      off += 100;
      if (off >= (d.total_count || 0) || !d[clave] || !d[clave].length) return out;
    }
  };

  /* project_id=a,b,c devuelve 404: para varios proyectos va v[project_id][] repetido. */
  function filtroCerrados(desde, hasta, proyectos, uid) {
    const campos = ["status_id", "closed_on", "assigned_to_id"];
    const p = [["set_filter", 1], ["op[status_id]", "c"],
               ["op[closed_on]", "><"], ["v[closed_on][]", desde], ["v[closed_on][]", hasta],
               ["op[assigned_to_id]", "="], ["v[assigned_to_id][]", uid]];
    if (proyectos && proyectos.length) {
      campos.push("project_id");
      p.push(["op[project_id]", "="]);
      proyectos.forEach(i => p.push(["v[project_id][]", i]));
    }
    campos.forEach(c => p.push(["f[]", c]));
    return p;
  }

  function rango(cual) {
    const y = hoy.getFullYear();
    if (cual === "prev") return [`${y - 1}-01-01`, `${y - 1}-12-31`];
    if (cual === "12m") {
      const d = new Date(hoy); d.setFullYear(y - 1);
      return [iso(d), iso(hoy)];
    }
    return [`${y}-01-01`, iso(hoy)];
  }

  /* ---------- estado ---------- */
  let cfg = { per: "ytd", cli: "adp", personas: null };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
  $(".per").value = cfg.per; $(".cli").value = cfg.cli;
  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        per: $(".per").value, cli: $(".cli").value, personas: [...sel]
      }));
    } catch (e) {}
  };

  let proyectosADP = [], gente = new Map(), sel = new Set(), yo = null;

  try {
    yo = (await pedir("/users/current.json", [])).user;
    const proys = await paginarPares("/projects.json", "projects", []);
    proyectosADP = proys.filter(p => ADP.includes(p.identifier)).map(p => p.id);

    /* /users.json pide admin; las membresías no y alcanzan para id y nombre. */
    const lotes = await Promise.all(
      proyectosADP.map(id => paginarPares(`/projects/${id}/memberships.json`, "memberships", [])
        .catch(() => [])));
    lotes.flat().forEach(m => { if (m.user) gente.set(m.user.id, m.user.name); });
    gente.set(yo.id, `${yo.firstname} ${yo.lastname}`);
  } catch (e) {
    $(".cargando").textContent = /401|403/.test(String(e))
      ? "Redmine no reconoce la sesión. Iniciá sesión y volvé a abrirlo."
      : "No se pudo consultar Redmine. Abrilo desde una página de Redmine.";
    return;
  }

  const porDefecto = [...EQUIPO, yo.id].filter(i => gente.has(i));
  sel = new Set((cfg.personas && cfg.personas.length
    ? cfg.personas.filter(i => gente.has(i)) : porDefecto));
  if (!sel.size) sel = new Set(porDefecto);

  /* ---------- selector de personas ---------- */
  const drop = $(".drop"), panel = $(".panel"), botonP = drop.querySelector("button");
  const ordenados = [...gente.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  panel.innerHTML = `<div class="todos">
      <button type="button" data-g="equipo">Equipo ADP</button>
      <button type="button" data-g="0">Ninguno</button></div>` +
    ordenados.map(([i, n]) => `<label class="op">
      <input type="checkbox" value="${i}"><span>${esc(n)}</span></label>`).join("");
  panel.querySelectorAll("input").forEach(cb => cb.onchange = () => {
    cb.checked ? sel.add(+cb.value) : sel.delete(+cb.value);
    sincronizar(); cargar();
  });
  panel.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
    sel = b.dataset.g === "equipo" ? new Set(porDefecto) : new Set();
    sincronizar(); cargar();
  });
  botonP.onclick = e => { e.stopPropagation(); panel.hidden = !panel.hidden; };
  panel.onclick = e => e.stopPropagation();
  R.addEventListener("click", () => { panel.hidden = true; });

  function sincronizar() {
    panel.querySelectorAll("input").forEach(cb => cb.checked = sel.has(+cb.value));
    botonP.querySelector("span").textContent = sel.size
      ? `${sel.size} persona${sel.size === 1 ? "" : "s"}` : "Ninguna";
    guardar();
  }

  /* ---------- carga y tabla ---------- */
  async function cargar() {
    const [desde, hasta] = rango($(".per").value);
    const proyectos = $(".cli").value === "adp" ? proyectosADP : null;
    $(".meta").textContent = `${desde} a ${hasta}`;
    $(".tabla").innerHTML = ""; $(".aviso").hidden = true;
    if (!sel.size) { $(".cargando").textContent = "Elegí al menos una persona."; return; }
    $(".cargando").hidden = false;
    $(".cargando").textContent = "Consultando Redmine…";

    let filas;
    try {
      filas = await Promise.all([...sel].map(async uid => {
        const iss = await paginarPares("/issues.json", "issues",
          filtroCerrados(desde, hasta, proyectos, uid));
        const c = {};
        iss.forEach(i => { const m = i.closed_on.slice(0, 7); c[m] = (c[m] || 0) + 1; });
        /* Un día con muchos cierres suele ser una limpieza en masa, no trabajo del mes. */
        const dias = {};
        iss.forEach(i => { const d = i.closed_on.slice(0, 10); dias[d] = (dias[d] || 0) + 1; });
        const pico = Object.entries(dias).sort((a, b) => b[1] - a[1])[0];
        return { uid, nombre: gente.get(uid) || `usuario ${uid}`, c, total: iss.length, pico };
      }));
    } catch (e) {
      $(".cargando").textContent = "No se pudo consultar: " + e.message;
      return;
    }

    $(".cargando").hidden = true;
    const meses = [...new Set(filas.flatMap(f => Object.keys(f.c)))].sort();
    if (!meses.length) { $(".tabla").innerHTML = "<p>Sin tickets cerrados en el período.</p>"; return; }

    filas.sort((a, b) => b.total - a.total);
    const tot = {};
    filas.forEach(f => meses.forEach(m => tot[m] = (tot[m] || 0) + (f.c[m] || 0)));

    $(".tabla").innerHTML = `<table>
      <thead><tr><th>Persona</th>${meses.map(m => `<th>${nombreMes(m)}</th>`).join("")}
        <th>Total</th></tr></thead>
      <tbody>${filas.map(f => `<tr>
        <td class="${f.uid === yo.id ? "yo" : ""}">${esc(f.nombre)}</td>
        ${meses.map(m => `<td class="n ${f.c[m] ? "" : "cero"}">${f.c[m] || 0}</td>`).join("")}
        <td class="n tot">${f.total}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Total</td>${meses.map(m => `<td>${tot[m] || 0}</td>`).join("")}
        <td>${filas.reduce((a, f) => a + f.total, 0)}</td></tr></tfoot></table>`;

    const masivos = filas.filter(f => f.pico && f.pico[1] >= 15);
    if (masivos.length) {
      $(".aviso").hidden = false;
      $(".aviso").textContent = "Ojo con los cierres en masa: " +
        masivos.map(f => `${f.nombre} cerró ${f.pico[1]} tickets el ${f.pico[0]}`).join("; ") +
        ". Son limpiezas de tickets viejos, no trabajo de ese mes.";
    }
    $(".sello").textContent = "Consultado " +
      new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }

  $(".per").onchange = () => { guardar(); cargar(); };
  $(".cli").onchange = () => { guardar(); cargar(); };

  sincronizar();
  cargar();
})();
