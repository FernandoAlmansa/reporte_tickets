/* Panel de tickets cerrados — corre dentro de Redmine, usa tu sesión.
   Se invoca desde el bookmarklet. Volver a hacer clic lo cierra. */
(async function () {
  const ID = "rmdash";
  const previo = document.getElementById(ID);
  if (previo) { previo.remove(); document.body.style.overflow = ""; return; }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const hoy = new Date();
  const iso = d => d.toISOString().slice(0, 10);

  /* ---------- shell ---------- */
  const raiz = document.createElement("div");
  raiz.id = ID;
  raiz.innerHTML = `<style>
    #${ID}{position:fixed;inset:0;z-index:2147483000;overflow:auto;
      background:#FBFAF5;color:#1C2621;
      font:400 15px/1.55 "IBM Plex Sans",Segoe UI,system-ui,sans-serif}
    #${ID} *{box-sizing:border-box}
    #${ID} .hoja{max-width:1080px;margin:0 auto;padding:34px 24px 70px}
    #${ID} .n{font-family:"IBM Plex Mono",Consolas,monospace;font-variant-numeric:tabular-nums}
    #${ID} header{border-top:3px solid #1C2621;padding-top:14px;display:flex;
      justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
    #${ID} h1{font-size:19px;font-weight:600;margin:0}
    #${ID} .cerrar{position:fixed;top:14px;right:18px;border:1px solid #CBD5C7;background:#fff;
      border-radius:2px;font:inherit;font-size:13px;padding:6px 12px;cursor:pointer;color:#1C2621}
    #${ID} .cifra{display:flex;align-items:flex-end;gap:18px;margin:26px 0 6px}
    #${ID} .cifra b{font-family:"IBM Plex Mono",Consolas,monospace;font-size:76px;font-weight:500;
      line-height:.85;letter-spacing:-.04em}
    #${ID} .cifra span{color:#6C776F;font-size:15px;padding-bottom:6px;max-width:38ch}
    #${ID} .sparks{display:flex;align-items:flex-end;gap:5px;height:78px;
      border-bottom:1px solid #CBD5C7;margin:26px 0 6px}
    #${ID} .spark{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;
      gap:4px;cursor:pointer;background:none;border:0;padding:0;font:inherit;color:inherit}
    #${ID} .spark i{display:block;width:100%;background:#E4EDE3;border:1px solid #2F6B4F;
      border-bottom:0;font-style:normal}
    #${ID} .spark.on i{background:#2F6B4F}
    #${ID} .spark u{text-decoration:none;font-size:11px;color:#6C776F;
      font-family:"IBM Plex Mono",Consolas,monospace}
    #${ID} .sparklabels{display:flex;gap:5px;margin-bottom:24px}
    #${ID} .sparklabels span{flex:1;text-align:center;font-size:11px;color:#6C776F;
      font-family:"IBM Plex Mono",Consolas,monospace}
    #${ID} .barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 18px}
    #${ID} .barra label{font-size:13px;color:#6C776F}
    #${ID} .drop{position:relative}
    #${ID} .drop>button,#${ID} button.pl{font:inherit;font-size:14px;padding:6px 10px;
      border:1px solid #CBD5C7;background:#fff;border-radius:2px;color:#1C2621;cursor:pointer}
    #${ID} .drop>button{min-width:190px;display:flex;justify-content:space-between;gap:10px;text-align:left}
    #${ID} .drop>button::after{content:"▾";color:#6C776F}
    #${ID} .panel{position:absolute;z-index:5;top:calc(100% + 4px);left:0;min-width:260px;max-height:320px;
      overflow:auto;background:#fff;border:1px solid #1C2621;border-radius:2px;padding:6px;
      box-shadow:0 6px 18px rgba(28,38,33,.16)}
    #${ID} .panel[hidden]{display:none}
    #${ID} .panel .todos{display:flex;gap:8px;padding:2px 6px 8px;border-bottom:1px solid #CBD5C7;margin-bottom:6px}
    #${ID} .panel .todos button{font:inherit;font-size:12.5px;padding:2px 8px;border:1px solid #CBD5C7;
      background:#FBFAF5;border-radius:2px;cursor:pointer;color:#2F6B4F}
    #${ID} .op{display:flex;align-items:center;gap:8px;padding:4px 6px;cursor:pointer;font-size:14px}
    #${ID} .op:hover{background:#E4EDE3}
    #${ID} .op input{accent-color:#2F6B4F;margin:0}
    #${ID} .op em{margin-left:auto;font-style:normal;color:#6C776F;font-size:12.5px;
      font-family:"IBM Plex Mono",Consolas,monospace}
    #${ID} select.per{font:inherit;font-size:14px;padding:6px 28px 6px 10px;min-width:172px;border:1px solid #CBD5C7;
      background:#fff;border-radius:2px;color:#1C2621}
    #${ID} .sello{margin-left:auto;font-size:12.5px;color:#6C776F}
    #${ID} table{width:100%;border-collapse:collapse;font-size:14px}
    #${ID} thead th{text-align:left;font-weight:600;font-size:12.5px;color:#6C776F;padding:8px 10px;
      border-bottom:1.5px solid #1C2621;cursor:pointer;white-space:nowrap}
    #${ID} tbody tr:nth-child(odd){background:#E4EDE3}
    #${ID} td{padding:7px 10px;vertical-align:top}
    #${ID} td.n{font-family:"IBM Plex Mono",Consolas,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
    #${ID} td a{color:#2F6B4F;text-decoration:none;border-bottom:1px solid currentColor}
    #${ID} .lento{color:#9A6A1E}
    #${ID} .asunto{max-width:52ch}
    #${ID} .aviso{padding:40px 10px;color:#6C776F}
    #${ID} footer{margin-top:34px;padding-top:12px;border-top:1px solid #CBD5C7;color:#6C776F;
      font-size:12.5px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
    @media(max-width:640px){#${ID} .cifra b{font-size:54px}#${ID} .asunto,#${ID} .col-tipo{display:none}}
  </style>
  <button class="cerrar">Cerrar (Esc)</button>
  <div class="hoja">
    <header><h1>Tickets cerrados</h1><div class="meta n"></div></header>
    <div class="cifra"><b id="${ID}-total">—</b><span id="${ID}-ley">Consultando Redmine…</span></div>
    <div class="sparks"></div><div class="sparklabels"></div>
    <div class="barra">
      <label>Período</label>
      <select class="per">
        <option value="ytd">Este año</option>
        <option value="12m">Últimos 12 meses</option>
        <option value="mes">Este mes</option>
        <option value="prev">Año pasado</option>
      </select>
      <label>Clientes</label>
      <div class="drop" data-campo="proyecto">
        <button type="button"><span>Todos</span></button><div class="panel" hidden></div>
      </div>
      <label>Tipo</label>
      <div class="drop" data-campo="tipo">
        <button type="button"><span>Todos</span></button><div class="panel" hidden></div>
      </div>
      <button class="pl" data-accion="limpiar">Limpiar filtros</button>
      <button class="pl" data-accion="csv">Bajar CSV</button>
      <span class="sello"></span>
    </div>
    <table><thead><tr>
      <th data-k="id">Ticket</th><th data-k="proyecto">Cliente</th>
      <th data-k="tipo" class="col-tipo">Tipo</th><th data-k="asunto" class="asunto">Asunto</th>
      <th data-k="cerrado">Cerrado</th><th data-k="dias">Días</th>
    </tr></thead><tbody></tbody></table>
    <div class="aviso" hidden></div>
    <footer><span class="pieCuenta"></span><span class="pieHoras"></span></footer>
  </div>`;
  document.body.append(raiz);
  document.body.style.overflow = "hidden";

  const fuente = document.createElement("link");
  fuente.rel = "stylesheet";
  fuente.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
  raiz.prepend(fuente);

  const cerrar = () => { raiz.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", esc9); };
  const esc9 = e => { if (e.key === "Escape") cerrar(); };
  $(".cerrar", raiz).onclick = cerrar;
  document.addEventListener("keydown", esc9);

  /* ---------- datos ---------- */
  const api = async (ruta, params = {}) => {
    const u = new URL(ruta, location.origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
    return r.json();
  };
  const paginar = async (ruta, clave, params) => {
    let off = 0, out = [];
    for (;;) {
      const d = await api(ruta, { ...params, offset: off, limit: 100 });
      out = out.concat(d[clave] || []);
      off += 100;
      if (off >= (d.total_count || 0) || !d[clave] || !d[clave].length) return out;
    }
  };

  function rango(cual) {
    const y = hoy.getFullYear();
    if (cual === "ytd") return [`${y}-01-01`, iso(hoy)];
    if (cual === "prev") return [`${y - 1}-01-01`, `${y - 1}-12-31`];
    if (cual === "mes") return [iso(new Date(y, hoy.getMonth(), 1)), iso(hoy)];
    const d = new Date(hoy); d.setFullYear(y - 1);
    return [iso(d), iso(hoy)];
  }

  let T = [], horas = {}, yo = null;
  let sel = { proyecto: new Set(), tipo: new Set() }, mesSel = "", orden = { k: "cerrado", asc: false };

  async function cargar(cual) {
    const [desde, hasta] = rango(cual);
    $(".meta", raiz).textContent = `${desde} a ${hasta}`;
    $(`#${ID}-ley`, raiz).textContent = "Consultando Redmine…";
    $(`#${ID}-total`, raiz).textContent = "—";

    yo = yo || (await api("/users/current.json")).user;

    const issues = await paginar("/issues.json", "issues", {
      status_id: "closed", assigned_to_id: yo.id,
      closed_on: `><${desde}|${hasta}`, sort: "closed_on:desc"
    });

    T = issues.map(i => {
      const c = new Date(i.created_on), f = new Date(i.closed_on);
      return {
        id: i.id, proyecto: i.project.name, tipo: i.tracker.name,
        asunto: i.subject, cerrado: i.closed_on.slice(0, 10),
        creado: i.created_on.slice(0, 10),
        dias: Math.round((f - c) / 864e5 * 10) / 10,
        url: `${location.origin}/issues/${i.id}`
      };
    });

    horas = {};
    try {
      (await paginar("/time_entries.json", "time_entries", { user_id: yo.id, from: desde, to: hasta }))
        .filter(t => t.spent_on >= desde && t.spent_on <= hasta)
        .forEach(t => {
          const m = t.spent_on.slice(0, 7);
          horas[m] = Math.round(((horas[m] || 0) + t.hours) * 100) / 100;
        });
    } catch (e) { /* sin permiso de horas: seguimos sin ese dato */ }

    $("h1", raiz).textContent = `Tickets cerrados — ${yo.firstname} ${yo.lastname}`;
    sel = { proyecto: new Set(), tipo: new Set() }; mesSel = "";
    montar("proyecto", "clientes"); montar("tipo", "tipos");
    render();
  }

  /* ---------- filtros ---------- */
  function montar(campo, etiqueta) {
    const drop = $(`.drop[data-campo="${campo}"]`, raiz);
    const panel = $(".panel", drop), boton = $("button", drop);
    const vals = [...new Set(T.map(t => t[campo]))].sort((a, b) => a.localeCompare(b, "es"));
    panel.innerHTML = `<div class="todos"><button type="button" data-todo="1">Todos</button>
      <button type="button" data-todo="0">Ninguno</button></div>` +
      vals.map(v => `<label class="op"><input type="checkbox" value="${esc(v)}">
        <span>${esc(v)}</span><em>${T.filter(t => t[campo] === v).length}</em></label>`).join("");
    panel.querySelectorAll("input").forEach(cb => cb.onchange = () => {
      cb.checked ? sel[campo].add(cb.value) : sel[campo].delete(cb.value); render();
    });
    panel.querySelectorAll("[data-todo]").forEach(b => b.onclick = () => {
      sel[campo] = b.dataset.todo === "1" ? new Set(vals) : new Set(); render();
    });
    boton.onclick = e => {
      e.stopPropagation();
      const abierto = !panel.hidden;
      raiz.querySelectorAll(".panel").forEach(p => p.hidden = true);
      panel.hidden = abierto;
    };
    panel.onclick = e => e.stopPropagation();
    drop.sinc = () => {
      const s = sel[campo];
      panel.querySelectorAll("input").forEach(cb => cb.checked = s.has(cb.value));
      $("span", boton).textContent = (!s.size || s.size === vals.length) ? "Todos"
        : s.size === 1 ? [...s][0] : `${s.size} ${etiqueta}`;
    };
    drop.sinc();
  }
  raiz.addEventListener("click", () => raiz.querySelectorAll(".panel").forEach(p => p.hidden = true));

  const pasa = (t, c) => !sel[c].size || sel[c].has(t[c]);
  const base = () => T.filter(t => pasa(t, "proyecto") && pasa(t, "tipo"));
  const filtrados = () => base().filter(t => !mesSel || t.cerrado.slice(0, 7) === mesSel);
  const nombreMes = m => ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+m.slice(5, 7) - 1] + " " + m.slice(2, 4);

  function render() {
    raiz.querySelectorAll(".drop").forEach(d => d.sinc && d.sinc());
    const b = base();
    const meses = [...new Set(T.map(t => t.cerrado.slice(0, 7)))].sort();
    const cuenta = meses.map(m => b.filter(t => t.cerrado.slice(0, 7) === m).length);
    const max = Math.max(1, ...cuenta);
    const cs = $(".sparks", raiz), cl = $(".sparklabels", raiz);
    cs.innerHTML = ""; cl.innerHTML = "";
    meses.forEach((m, i) => {
      const btn = document.createElement("button");
      btn.className = "spark" + (mesSel === m ? " on" : "");
      btn.innerHTML = `<u>${cuenta[i]}</u><i style="height:${Math.round(cuenta[i] / max * 54) + 2}px"></i>`;
      btn.onclick = () => { mesSel = mesSel === m ? "" : m; render(); };
      cs.append(btn);
      const s = document.createElement("span"); s.textContent = nombreMes(m); cl.append(s);
    });

    const f = filtrados();
    $(`#${ID}-total`, raiz).textContent = f.length;
    const ds = f.map(t => t.dias).sort((a, b2) => a - b2);
    const med = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
    const periodo = mesSel ? nombreMes(mesSel) : "el período";
    $(`#${ID}-ley`, raiz).textContent = f.length
      ? `cerrados en ${periodo}. Mediana de resolución: ${med} días.`
      : `cerrados en ${periodo}.`;
    $(".pieCuenta", raiz).textContent = `${f.length} de ${T.length} tickets del período`;
    const hs = mesSel ? (horas[mesSel] || 0) : Object.values(horas).reduce((a, c) => a + c, 0);
    $(".pieHoras", raiz).textContent = hs ? `${hs.toFixed(2)} horas imputadas en ${periodo}` : "";
    $(".sello", raiz).textContent = "Consultado " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    f.sort((x, y) => {
      const a = x[orden.k], c = y[orden.k];
      const r = typeof a === "number" ? a - c : String(a).localeCompare(String(c), "es");
      return orden.asc ? r : -r;
    });
    $("tbody", raiz).innerHTML = f.map(t => `<tr>
      <td class="n"><a href="${t.url}" target="_blank" rel="noopener">#${t.id}</a></td>
      <td>${esc(t.proyecto)}</td><td class="col-tipo">${esc(t.tipo)}</td>
      <td class="asunto">${esc(t.asunto)}</td><td class="n">${t.cerrado}</td>
      <td class="n ${t.dias > 30 ? "lento" : ""}">${t.dias}</td></tr>`).join("");
    const av = $(".aviso", raiz);
    av.hidden = f.length > 0; av.textContent = "Ningún ticket cerrado con estos filtros.";
    raiz.ultimo = f;
  }

  raiz.querySelectorAll("thead th").forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    orden = { k, asc: orden.k === k ? !orden.asc : true }; render();
  });
  $('[data-accion="limpiar"]', raiz).onclick = () => {
    sel = { proyecto: new Set(), tipo: new Set() }; mesSel = "";
    orden = { k: "cerrado", asc: false }; render();
  };
  $('[data-accion="csv"]', raiz).onclick = () => {
    const filas = [["id", "cliente", "tipo", "asunto", "creado", "cerrado", "dias", "url"]]
      .concat((raiz.ultimo || []).map(t => [t.id, t.proyecto, t.tipo, t.asunto, t.creado, t.cerrado, t.dias, t.url]));
    const csv = "\uFEFF" + filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `tickets_cerrados_${iso(hoy)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $(".per", raiz).onchange = e => cargar(e.target.value).catch(fallo);

  function fallo(err) {
    $(`#${ID}-total`, raiz).textContent = "!";
    $(`#${ID}-ley`, raiz).textContent = String(err).includes("401") || String(err).includes("403")
      ? "Redmine no reconoce la sesión. Iniciá sesión y volvé a abrirlo."
      : "No se pudo consultar Redmine. Ejecutalo estando en una página de Redmine. (" + err.message + ")";
  }

  cargar("ytd").catch(fallo);
})();
