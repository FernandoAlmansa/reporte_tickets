/* Excel de tickets asignados — corre dentro de Redmine, usa tu sesión.
   Abre un cuadro chico, dejás elegir clientes y baja el .xlsx. */
(async function () {
  const ID = "rmxls";
  const CLAVE = "rmxls:clientes";
  const previo = document.getElementById(ID);
  if (previo) { previo.remove(); return; }

  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const hoy = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const dias = txt => Math.floor((hoy - new Date(txt)) / 864e5);

  /* El número de caso de ADP vive dentro del asunto. */
  const RX_ADP = /\b1-\d{6,}\b/;
  const numeroAdp = s => (String(s || "").match(RX_ADP) || [""])[0];

  /* Estados que no van al Excel (id 7 = "Pendiente KU" en rdm.hmconsulting). */
  const EXCLUIR_ID = new Set([7]);
  const EXCLUIR_NOMBRE = /^pendiente\s*ku$/i;
  const excluido = i => EXCLUIR_ID.has(i.status.id) || EXCLUIR_NOMBRE.test(i.status.name || "");

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483000";
  const R = host.attachShadow({ mode: "open" });
  document.body.append(host);

  R.innerHTML = `<style>
    *{box-sizing:border-box;margin:0;padding:0}
    .fondo{position:absolute;inset:0;background:rgba(28,38,33,.42);
      display:flex;align-items:center;justify-content:center;padding:20px}
    .caja{width:430px;max-width:100%;max-height:86vh;overflow:auto;background:#FBFAF5;color:#1C2621;
      border:1px solid #1C2621;border-radius:3px;padding:22px 24px 20px;
      font:400 15px/1.5 "IBM Plex Sans",Segoe UI,system-ui,sans-serif;
      box-shadow:0 14px 40px rgba(28,38,33,.3)}
    h2{font-size:17px;font-weight:600;margin-bottom:4px}
    .est{color:#6C776F;font-size:13.5px;margin-bottom:16px}
    .lista{border:1px solid #CBD5C7;border-radius:2px;background:#fff;
      max-height:240px;overflow:auto;padding:5px;margin-bottom:8px}
    .op{display:flex;align-items:center;gap:8px;padding:5px 7px;cursor:pointer;font-size:14px}
    .op:hover{background:#E4EDE3}
    .op input{accent-color:#2F6B4F;width:14px;height:14px}
    .op em{margin-left:auto;font-style:normal;color:#6C776F;font-size:12.5px;
      font-family:"IBM Plex Mono",Consolas,monospace}
    .mini{display:flex;gap:8px;margin-bottom:16px}
    .mini button{font:inherit;font-size:12.5px;padding:3px 9px;border:1px solid #CBD5C7;
      background:#fff;border-radius:2px;cursor:pointer;color:#2F6B4F}
    .pie{display:flex;gap:10px;justify-content:flex-end;align-items:center}
    button.b{font:inherit;font-size:14px;padding:8px 16px;border-radius:2px;cursor:pointer;
      border:1px solid #CBD5C7;background:#fff;color:#1C2621}
    button.b.prim{background:#2F6B4F;border-color:#2F6B4F;color:#fff;font-weight:500}
    button.b[disabled]{opacity:.5;cursor:default}
    .nota{color:#6C776F;font-size:12.5px;margin-top:12px}
  </style>
  <div class="fondo">
    <div class="caja">
      <h2>Excel de tickets asignados</h2>
      <div class="est">Consultando Redmine…</div>
      <div class="lista" hidden></div>
      <div class="mini" hidden>
        <button type="button" data-todo="1">Todos</button>
        <button type="button" data-todo="0">Ninguno</button>
      </div>
      <div class="pie">
        <button class="b" data-a="cerrar">Cancelar</button>
        <button class="b prim" data-a="bajar" disabled>Bajar Excel</button>
      </div>
      <div class="nota"></div>
    </div>
  </div>`;

  const $ = s => R.querySelector(s);
  const cerrar = () => { host.remove(); document.removeEventListener("keydown", atajo, true); };
  const atajo = e => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
  document.addEventListener("keydown", atajo, true);
  $('[data-a="cerrar"]').onclick = cerrar;
  $(".fondo").onclick = e => { if (e.target === $(".fondo")) cerrar(); };

  /* ---------- carga de SheetJS ---------- */
  const cargarXLSX = () => new Promise((ok, mal) => {
    if (window.XLSX) return ok(window.XLSX);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => ok(window.XLSX);
    s.onerror = () => mal(new Error("no se pudo cargar la librería de Excel"));
    document.head.append(s);
  });

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

  let T = [], yo = null, sel = new Set(), omitidos = 0;

  try {
    yo = (await api("/users/current.json")).user;
    const issues = await paginar("/issues.json", "issues", {
      assigned_to_id: yo.id, status_id: "open", sort: "project,created_on:asc"
    });
    const validos = issues.filter(i => !excluido(i));
    omitidos = issues.length - validos.length;
    T = validos.map(i => ({
      id: i.id, adp: numeroAdp(i.subject), proyecto: i.project.name,
      tipo: i.tracker.name, estado: i.status.name, prioridad: i.priority.name,
      asunto: i.subject, autor: (i.author || {}).name || "",
      creado: i.created_on.slice(0, 10), vence: i.due_date || "",
      actualizado: i.updated_on.slice(0, 10),
      abierto: dias(i.created_on), quieto: dias(i.updated_on),
      avance: (i.done_ratio || 0) / 100, horas: i.spent_hours || 0,
      url: `${location.origin}/issues/${i.id}`
    }));
  } catch (e) {
    $(".est").textContent = /401|403/.test(String(e))
      ? "Redmine no reconoce la sesión. Iniciá sesión y volvé a intentar."
      : "No se pudo consultar Redmine. Abrilo desde una página de Redmine.";
    return;
  }

  if (!T.length) {
    $(".est").textContent = omitidos
      ? `No hay tickets para exportar (${omitidos} en Pendiente KU, omitidos).`
      : "No tenés tickets abiertos asignados.";
    return;
  }

  const clientes = [...new Set(T.map(t => t.proyecto))].sort((a, b) => a.localeCompare(b, "es"));
  let guardado = [];
  try { guardado = JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) {}
  sel = new Set(guardado.filter(c => clientes.includes(c)));

  const lista = $(".lista");
  lista.innerHTML = clientes.map(c => `<label class="op">
    <input type="checkbox" value="${esc(c)}"><span>${esc(c)}</span>
    <em>${T.filter(t => t.proyecto === c).length}</em></label>`).join("");
  lista.hidden = false;
  $(".mini").hidden = false;

  const elegidos = () => sel.size ? T.filter(t => sel.has(t.proyecto)) : T;
  function sincronizar() {
    lista.querySelectorAll("input").forEach(cb => cb.checked = sel.has(cb.value));
    const n = elegidos().length;
    $(".est").innerHTML = `<b>${n}</b> ticket${n === 1 ? "" : "s"} abiertos` +
      (sel.size ? ` en ${sel.size} cliente${sel.size === 1 ? "" : "s"}` : " en todos los clientes") +
      ` · ${elegidos().filter(t => t.adp).length} con N° de ADP` +
      (omitidos ? ` · ${omitidos} en Pendiente KU omitido${omitidos === 1 ? "" : "s"}` : "");
    $('[data-a="bajar"]').disabled = !n;
    try { localStorage.setItem(CLAVE, JSON.stringify([...sel])); } catch (e) {}
  }
  lista.querySelectorAll("input").forEach(cb => cb.onchange = () => {
    cb.checked ? sel.add(cb.value) : sel.delete(cb.value); sincronizar();
  });
  R.querySelectorAll("[data-todo]").forEach(b => b.onclick = () => {
    sel = b.dataset.todo === "1" ? new Set(clientes) : new Set(); sincronizar();
  });
  sincronizar();

  /* ---------- armado del Excel ---------- */
  $('[data-a="bajar"]').onclick = async () => {
    const boton = $('[data-a="bajar"]');
    boton.disabled = true; boton.textContent = "Armando…";
    try {
      const XLSX = await cargarXLSX();
      const filas = elegidos();

      const cab = ["Ticket", "N° ADP", "Cliente", "Tipo", "Estado", "Prioridad", "Asunto",
                   "Autor", "Creado", "Vence", "Últ. act.", "Días abierto", "Sin mover",
                   "Avance", "Hs imputadas"];
      const datos = filas.map(t => [t.id, t.adp, t.proyecto, t.tipo, t.estado, t.prioridad,
                                    t.asunto, t.autor, t.creado, t.vence, t.actualizado,
                                    t.abierto, t.quieto, t.avance, t.horas]);
      const ws = XLSX.utils.aoa_to_sheet([cab, ...datos]);

      filas.forEach((t, n) => {
        const f = n + 2;
        const cel = XLSX.utils.encode_cell({ r: f - 1, c: 0 });
        if (ws[cel]) ws[cel].l = { Target: t.url, Tooltip: "Abrir en Redmine" };
        const adp = ws[XLSX.utils.encode_cell({ r: f - 1, c: 1 })];
        if (adp) { adp.t = "s"; adp.z = "@"; }          // texto, para copiar y pegar tal cual
        const av = ws[XLSX.utils.encode_cell({ r: f - 1, c: 13 })];
        if (av) av.z = "0%";
        const hs = ws[XLSX.utils.encode_cell({ r: f - 1, c: 14 })];
        if (hs) hs.z = "0.00";
      });

      ws["!cols"] = [10, 16, 24, 16, 12, 12, 62, 22, 12, 12, 12, 13, 12, 10, 13]
        .map(w => ({ wch: w }));
      ws["!autofilter"] = { ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 }, e: { r: filas.length, c: cab.length - 1 } }) };
      ws["!freeze"] = "A2";

      /* Hoja de resumen, con fórmulas sobre la primera. */
      const porCliente = clientes.filter(c => filas.some(t => t.proyecto === c));
      const estados = [...new Set(filas.map(t => t.estado))].sort((a, b) => a.localeCompare(b, "es"));
      const ult = filas.length + 1;
      const res = [["Resumen", "", "", ""],
                   [`Generado el ${hoy.toLocaleDateString("es-AR")} desde ${location.host}`, "", "", ""],
                   ["", "", "", ""],
                   ["Por cliente", "Tickets", "Por estado", "Tickets"]];
      const largo = Math.max(porCliente.length, estados.length);
      for (let k = 0; k < largo; k++) {
        res.push([porCliente[k] || "", "", estados[k] || "", ""]);
      }
      res.push(["Total", "", "Total", ""]);
      res.push(["", "", "", ""]);
      res.push(["Días abierto — promedio", ""]);
      res.push(["Días abierto — el más viejo", ""]);
      res.push(["Sin mover hace 30 días o más", ""]);
      res.push(["Con N° de caso ADP", ""]);
      const rs = XLSX.utils.aoa_to_sheet(res);

      const F = (celda, f) => { rs[celda] = { t: "n", f }; };
      for (let k = 0; k < largo; k++) {
        const f = 5 + k;
        if (porCliente[k]) F(`B${f}`, `COUNTIF(Tickets!$C$2:$C$${ult},A${f})`);
        if (estados[k]) F(`D${f}`, `COUNTIF(Tickets!$E$2:$E$${ult},C${f})`);
      }
      const ft = 5 + largo;
      F(`B${ft}`, `SUM(B5:B${ft - 1})`);
      F(`D${ft}`, `SUM(D5:D${ft - 1})`);
      F(`B${ft + 2}`, `IFERROR(ROUND(AVERAGE(Tickets!$L$2:$L$${ult}),1),0)`);
      F(`B${ft + 3}`, `IFERROR(MAX(Tickets!$L$2:$L$${ult}),0)`);
      F(`B${ft + 4}`, `COUNTIF(Tickets!$M$2:$M$${ult},">=30")`);
      F(`B${ft + 5}`, `COUNTIF(Tickets!$B$2:$B$${ult},"?*")`);
      rs["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 22 }, { wch: 12 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.utils.book_append_sheet(wb, rs, "Resumen");
      XLSX.writeFile(wb, `tickets_asignados_${iso(hoy)}.xlsx`);

      $(".nota").textContent = `Listo: ${filas.length} tickets.`;
      boton.textContent = "Bajar Excel"; boton.disabled = false;
    } catch (e) {
      $(".nota").textContent = "No se pudo armar el Excel: " + e.message;
      boton.textContent = "Bajar Excel"; boton.disabled = false;
    }
  };
})();
