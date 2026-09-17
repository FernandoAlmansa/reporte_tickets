/* Panel de tickets cerrados — corre dentro de Redmine, usa tu sesión.
   El contenido vive en un Shadow DOM, así el CSS de Redmine no lo toca.
   Volver a hacer clic en el bookmarklet lo cierra. */
(async function () {
  const ID = "rmdash";
  const CLAVE = "rmdash:filtros";
  const previo = document.getElementById(ID);
  if (previo) { previo.remove(); document.body.style.overflow = ""; return; }

  const hoy = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  /* La fuente va en el <head> del documento: las @font-face declaradas dentro
     de un shadow root no se registran, así que desde acá sí aplican adentro. */
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
    .hoja{max-width:1080px;margin:0 auto;padding:34px 24px 70px}
    .n{font-family:"IBM Plex Mono",Consolas,monospace;font-variant-numeric:tabular-nums}
    header{border-top:3px solid #1C2621;padding-top:14px;display:flex;
      justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
    h1{font-size:19px;font-weight:600;letter-spacing:-.01em}
    .meta{font-size:13px;color:#6C776F}
    .cerrar{position:fixed;top:14px;right:18px;border:1px solid #CBD5C7;background:#fff;
      border-radius:2px;font:inherit;font-size:13px;padding:6px 12px;cursor:pointer;color:#1C2621}
    .cifra{display:flex;align-items:flex-end;gap:18px;margin:26px 0 6px}
    .cifra b{font-family:"IBM Plex Mono",Consolas,monospace;font-size:76px;font-weight:500;
      line-height:.85;letter-spacing:-.04em}
    .cifra span{color:#6C776F;font-size:15px;padding-bottom:6px;max-width:38ch}
    .sparks{display:flex;align-items:flex-end;gap:5px;height:86px;
      border-bottom:1px solid #CBD5C7;margin:26px 0 6px}
    .spark{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;
      gap:4px;cursor:pointer;background:none;border:0;padding:0;font:inherit;color:inherit;height:100%}
    .spark i{display:block;width:100%;background:#E4EDE3;border:1px solid #2F6B4F;
      border-bottom:0;font-style:normal;flex:none}
    .spark.on i{background:#2F6B4F}
    .spark u{text-decoration:none;font-size:11px;color:#6C776F;flex:none;
      font-family:"IBM Plex Mono",Consolas,monospace}
    .sparklabels{display:flex;gap:5px;margin-bottom:24px}
    .sparklabels span{flex:1;text-align:center;font-size:11px;color:#6C776F;
      font-family:"IBM Plex Mono",Consolas,monospace}
    .barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 18px}
    .barra > label{font-size:13px;color:#6C776F}
    .ctl{font:inherit;font-size:14px;line-height:20px;height:34px;padding:6px 10px;
      border:1px solid #CBD5C7;background:#fff;border-radius:2px;color:#1C2621;cursor:pointer}
    select.ctl{-webkit-appearance:none;appearance:none;padding-right:26px;min-width:178px;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='7'><path d='M0 0h10L5 7z' fill='%236C776F'/></svg>");
      background-repeat:no-repeat;background-position:right 9px center}
    .drop{position:relative}
    .drop > button{min-width:196px;display:flex;align-items:center;justify-content:space-between;
      gap:10px;text-align:left}
    .drop > button::after{content:"▾";color:#6C776F}
    .drop > button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .panel{position:absolute;z-index:5;top:calc(100% + 4px);left:0;min-width:270px;max-height:330px;
      overflow:auto;background:#fff;border:1px solid #1C2621;border-radius:2px;padding:6px;
      box-shadow:0 6px 18px rgba(28,38,33,.16)}
    .panel[hidden]{display:none}
    .todos{display:flex;gap:8px;padding:2px 6px 8px;border-bottom:1px solid #CBD5C7;margin-bottom:6px}
    .todos button{font:inherit;font-size:12.5px;padding:2px 8px;border:1px solid #CBD5C7;
      background:#FBFAF5;border-radius:2px;cursor:pointer;color:#2F6B4F}
    .op{display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;font-size:14px}
    .op:hover{background:#E4EDE3}
    .op input{accent-color:#2F6B4F;width:14px;height:14px}
    .op em{margin-left:auto;font-style:normal;color:#6C776F;font-size:12.5px;
      font-family:"IBM Plex Mono",Consolas,monospace}
    .sello{margin-left:auto;font-size:12.5px;color:#6C776F}
    table{width:100%;border-collapse:collapse;font-size:14px}
    thead th{text-align:left;font-weight:600;font-size:12.5px;color:#6C776F;padding:8px 10px;
      border-bottom:1.5px solid #1C2621;cursor:pointer;white-space:nowrap}
    tbody tr:nth-child(odd){background:#E4EDE3}
    td{padding:7px 10px;vertical-align:top}
    td.n{font-family:"IBM Plex Mono",Consolas,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
    td a{color:#2F6B4F;text-decoration:none;border-bottom:1px solid currentColor}
    .lento{color:#9A6A1E}
    .asunto{max-width:52ch}
    .aviso{padding:40px 10px;color:#6C776F}
    footer{margin-top:34px;padding-top:12px;border-top:1px solid #CBD5C7;color:#6C776F;
      font-size:12.5px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
    @media(max-width:640px){.cifra b{font-size:54px}.asunto,.col-tipo{display:none}}
  </style>
  <div class="raiz">
    <button class="cerrar">Cerrar (Esc)</button>
    <div class="hoja">
      <header><h1>Tickets cerrados</h1><div class="meta n"></div></header>
      <div class="cifra"><b class="total">—</b><span class="ley">Consultando Redmine…</span></div>
      <div class="sparks"></div><div class="sparklabels"></div>
      <div class="barra">
        <label>Período</label>
        <select class="ctl per">
          <option value="ytd">Este año</option>
          <option value="12m">Últimos 12 meses</option>
          <option value="mes">Este mes</option>
          <option value="prev">Año pasado</option>
        </select>
        <label>Clientes</label>
        <div class="drop" data-campo="proyecto">
          <button type="button" class="ctl"><span>Todos</span></button><div class="panel" hidden></div>
        </div>
        <label>Tipo</label>
        <div class="drop" data-campo="tipo">
          <button type="button" class="ctl"><span>Todos</span></button><div class="panel" hidden></div>
        </div>
        <button class="ctl" data-accion="limpiar">Limpiar filtros</button>
        <button class="ctl" data-accion="csv">Bajar CSV</button>
        <span class="sello"></span>
      </div>
      <table><thead><tr>
        <th data-k="id">Ticket</th><th data-k="proyecto">Cliente</th>
        <th data-k="tipo" class="col-tipo">Tipo</th><th data-k="asunto" class="asunto">Asunto</th>
        <th data-k="cerrado">Cerrado</th><th data-k="dias">Días</th>
      </tr></thead><tbody></tbody></table>
      <div class="aviso" hidden></div>
      <footer><span class="pieCuenta"></span><span class="pieHoras"></span></footer>
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

  /* ---------- estado persistido ---------- */
  const leerGuardado = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "null") || {}; } catch (e) { return {}; } };
  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        periodo: $(".per").value, proyecto: [...sel.proyecto], tipo: [...sel.tipo],
        mes: mesSel, orden
      }));
    } catch (e) {}
  };
  const olvidar = () => { try { localStorage.removeItem(CLAVE); } catch (e) {} };

  const g0 = leerGuardado();
  let sel = { proyecto: new Set(), tipo: new Set() };
  let mesSel = g0.mes || "";
  let orden = g0.orden || { k: "cerrado", asc: false };
  let pendiente = { proyecto: g0.proyecto || [], tipo: g0.tipo || [] };
  if (g0.periodo) $(".per").value = g0.periodo;

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

  let T = [], horas = {}, yo = null, visibles = [];

  async function cargar(cual) {
    const [desde, hasta] = rango(cual);
    $(".meta").textContent = `${desde} a ${hasta}`;
    $(".ley").textContent = "Consultando Redmine…";
    $(".total").textContent = "—";

    yo = yo || (await api("/users/current.json")).user;

    const issues = await paginar("/issues.json", "issues", {
      status_id: "closed", assigned_to_id: yo.id,
      closed_on: `><${desde}|${hasta}`, sort: "closed_on:desc"
    });
    T = issues.map(i => ({
      id: i.id, proyecto: i.project.name, tipo: i.tracker.name, asunto: i.subject,
      creado: i.created_on.slice(0, 10), cerrado: i.closed_on.slice(0, 10),
      dias: Math.round((new Date(i.closed_on) - new Date(i.created_on)) / 864e5 * 10) / 10,
      url: `${location.origin}/issues/${i.id}`
    }));

    horas = {};
    try {
      (await paginar("/time_entries.json", "time_entries", { user_id: yo.id, from: desde, to: hasta }))
        .filter(t => t.spent_on >= desde && t.spent_on <= hasta)
        .forEach(t => {
          const m = t.spent_on.slice(0, 7);
          horas[m] = Math.round(((horas[m] || 0) + t.hours) * 100) / 100;
        });
    } catch (e) { /* sin permiso sobre horas: seguimos sin ese dato */ }

    $("h1").textContent = `Tickets cerrados — ${yo.firstname} ${yo.lastname}`;

    /* Se conserva lo guardado que siga existiendo en este período. */
    sel.proyecto = new Set(pendiente.proyecto.filter(v => T.some(t => t.proyecto === v)));
    sel.tipo = new Set(pendiente.tipo.filter(v => T.some(t => t.tipo === v)));
    if (mesSel && !T.some(t => t.cerrado.slice(0, 7) === mesSel)) mesSel = "";

    montar("proyecto", "clientes"); montar("tipo", "tipos");
    render();
  }

  /* ---------- filtros ---------- */
  function montar(campo, etiqueta) {
    const drop = $(`.drop[data-campo="${campo}"]`);
    const panel = drop.querySelector(".panel"), boton = drop.querySelector("button");
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
      $$(".panel").forEach(p => p.hidden = true);
      panel.hidden = abierto;
    };
    panel.onclick = e => e.stopPropagation();
    drop.sinc = () => {
      const s = sel[campo];
      panel.querySelectorAll("input").forEach(cb => cb.checked = s.has(cb.value));
      boton.querySelector("span").textContent = (!s.size || s.size === vals.length) ? "Todos"
        : s.size === 1 ? [...s][0] : `${s.size} ${etiqueta}`;
    };
  }
  R.addEventListener("click", () => $$(".panel").forEach(p => p.hidden = true));

  const pasa = (t, c) => !sel[c].size || sel[c].has(t[c]);
  const base = () => T.filter(t => pasa(t, "proyecto") && pasa(t, "tipo"));
  const filtrados = () => base().filter(t => !mesSel || t.cerrado.slice(0, 7) === mesSel);
  const nombreMes = m => ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+m.slice(5, 7) - 1] + " " + m.slice(2, 4);

  function render() {
    $$(".drop").forEach(d => d.sinc && d.sinc());

    const b = base();
    const meses = [...new Set(T.map(t => t.cerrado.slice(0, 7)))].sort();
    const cuenta = meses.map(m => b.filter(t => t.cerrado.slice(0, 7) === m).length);
    const max = Math.max(1, ...cuenta);
    const cs = $(".sparks"), cl = $(".sparklabels");
    cs.innerHTML = ""; cl.innerHTML = "";
    meses.forEach((m, i) => {
      const btn = document.createElement("button");
      btn.className = "spark" + (mesSel === m ? " on" : "");
      btn.title = `${cuenta[i]} tickets en ${nombreMes(m)}`;
      btn.innerHTML = `<u>${cuenta[i]}</u><i style="height:${Math.round(cuenta[i] / max * 56) + 2}px"></i>`;
      btn.onclick = () => { mesSel = mesSel === m ? "" : m; render(); };
      cs.append(btn);
      const s = document.createElement("span"); s.textContent = nombreMes(m); cl.append(s);
    });

    const f = filtrados();
    $(".total").textContent = f.length;
    const ds = f.map(t => t.dias).sort((x, y) => x - y);
    const med = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
    const periodo = mesSel ? nombreMes(mesSel) : "el período";
    $(".ley").textContent = f.length
      ? `cerrados en ${periodo}. Mediana de resolución: ${med} días.`
      : `cerrados en ${periodo}.`;
    $(".pieCuenta").textContent = `${f.length} de ${T.length} tickets del período`;
    const hs = mesSel ? (horas[mesSel] || 0) : Object.values(horas).reduce((a, c) => a + c, 0);
    $(".pieHoras").textContent = hs ? `${hs.toFixed(2)} horas imputadas en ${periodo}` : "";
    $(".sello").textContent = "Consultado " +
      new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    f.sort((x, y) => {
      const a = x[orden.k], c = y[orden.k];
      const r = typeof a === "number" ? a - c : String(a).localeCompare(String(c), "es");
      return orden.asc ? r : -r;
    });
    $("tbody").innerHTML = f.map(t => `<tr>
      <td class="n"><a href="${t.url}" target="_blank" rel="noopener">#${t.id}</a></td>
      <td>${esc(t.proyecto)}</td><td class="col-tipo">${esc(t.tipo)}</td>
      <td class="asunto">${esc(t.asunto)}</td><td class="n">${t.cerrado}</td>
      <td class="n ${t.dias > 30 ? "lento" : ""}">${t.dias}</td></tr>`).join("");
    const av = $(".aviso");
    av.hidden = f.length > 0;
    av.textContent = "Ningún ticket cerrado con estos filtros.";

    visibles = f;
    pendiente = { proyecto: [...sel.proyecto], tipo: [...sel.tipo] };
    guardar();
  }

  $$("thead th").forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    orden = { k, asc: orden.k === k ? !orden.asc : true }; render();
  });
  $('[data-accion="limpiar"]').onclick = () => {
    sel = { proyecto: new Set(), tipo: new Set() }; mesSel = "";
    orden = { k: "cerrado", asc: false }; olvidar(); render();
  };
  $('[data-accion="csv"]').onclick = () => {
    const filas = [["id", "cliente", "tipo", "asunto", "creado", "cerrado", "dias", "url"]]
      .concat(visibles.map(t => [t.id, t.proyecto, t.tipo, t.asunto, t.creado, t.cerrado, t.dias, t.url]));
    const csv = "\uFEFF" + filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `tickets_cerrados_${iso(hoy)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $(".per").onchange = e => { mesSel = ""; guardar(); cargar(e.target.value).catch(fallo); };

  function fallo(err) {
    $(".total").textContent = "!";
    $(".ley").textContent = /401|403/.test(String(err))
      ? "Redmine no reconoce la sesión. Iniciá sesión y volvé a abrirlo."
      : "No se pudo consultar Redmine. Abrilo desde una página de Redmine. (" + err.message + ")";
  }

  cargar($(".per").value).catch(fallo);
})();
