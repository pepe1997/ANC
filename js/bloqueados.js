function getBloqueadosState(){
  let listaGuardada = [];

  try {
    listaGuardada = JSON.parse(localStorage.getItem("listaBloqueadosAlt") || "[]");
    if(!Array.isArray(listaGuardada)) listaGuardada = [];
  } catch (error) {
    listaGuardada = [];
    localStorage.removeItem("listaBloqueadosAlt");
  }

  window.bloqueadosState = window.bloqueadosState || {
    listaAlt: listaGuardada,
    resumen: [],
    activo: [],
    reserva: []
  };

  return window.bloqueadosState;
}

getBloqueadosState();

function normalizarBloqueado(valor){
  return String(valor || "")
    .trim()
    .replace(/'/g, "")
    .replace(/\.0$/, "")
    .replace(/\s/g, "")
    .toUpperCase();
}

function claveBloqueado(valor){
  let txt = normalizarBloqueado(valor);
  return txt.replace(/^0+/, "") || "0";
}

function esCodigoCientifico(valor){
  return /e\+/i.test(String(valor || ""));
}

function codigoCompletoBloqueado(valorFila, producto){
  let codigoProducto = normalizarBloqueado(producto ? producto.codigo : "");
  let codigoFila = normalizarBloqueado(valorFila);

  if(codigoProducto) return codigoProducto;
  if(esCodigoCientifico(codigoFila)) return codigoFila;

  return codigoFila;
}

function numeroBloqueado(valor){
  let txt = String(valor || "").trim().replace(",", ".");
  let n = parseFloat(txt);
  return isNaN(n) ? 0 : n;
}

function formatoBloqueado(valor){
  return Number(valor || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function parsearListaBloqueados(texto){
  return [...new Set(
    String(texto || "")
      .split(/[\n,;\t ]+/)
      .map(normalizarBloqueado)
      .filter(x =>
        !["CODIGO", "CODIGO_ALT", "CODIGOALTERNATIVO", "ALTERNATIVO"].includes(x)
      )
      .filter(Boolean)
  )];
}

function obtenerListaBloqueoSheet(){
  if(typeof dataBloqueo === "undefined" || !Array.isArray(dataBloqueo)) return [];

  return [...new Set(
    dataBloqueo
      .map(r => normalizarBloqueado(r["COD_ALT"]))
      .filter(Boolean)
  )];
}

function obtenerDescripcionBloqueoSheet(codigoAlt){
  if(typeof dataBloqueo === "undefined" || !Array.isArray(dataBloqueo)) return "";

  let fila = dataBloqueo.find(r =>
    claveBloqueado(r["COD_ALT"]) === claveBloqueado(codigoAlt)
  );

  return fila ? (fila["DESCRIPCION"] || "") : "";
}

function obtenerUxbBloqueado(producto){
  let uxb = numeroBloqueado(producto ? producto["UXB"] : 0);
  return uxb > 0 ? uxb : 1;
}

function ubicacionReservaOperativa(ubicacion){
  let ubi = String(ubicacion || "").trim().toUpperCase();

  if(ubi === "") return true;
  if(ubi.startsWith("MASS-")) return true;
  if(ubi.startsWith("RAMPA")) return true;
  if(ubi.startsWith("DROP-BUFR")) return true;
  if(ubi.startsWith("BUFFER")) return true;
  if(ubi.startsWith("BUFER")) return true;
  if(ubi.startsWith("VACIA")) return true;
  if(ubi.startsWith("DROP-STOCK")) return true;
  if(ubi.startsWith("DROP-DESBLOQUEO")) return true;
  if(ubi.startsWith("STOCK-DESBLOQUEO")) return true;

  return false;
}

function esDropBloqueo(ubicacion){
  let ubi = String(ubicacion || "")
    .trim()
    .toUpperCase();

  return (
    ubi.startsWith("DROP-BLOQUEO") ||
    ubi.startsWith("DROP-BLOQUEAD")
  );
}

function abrirBloqueados(){
  let listaSheet = obtenerListaBloqueoSheet();
  let state = getBloqueadosState();
  let listaInicial = listaSheet.length > 0 ? listaSheet : state.listaAlt;
  let bloqueoCargado = Array.isArray(dataBloqueo) && dataBloqueo.length > 0;
  let origenLista = listaSheet.length > 0
    ? `Leyendo ${listaSheet.length} codigos desde la hoja BLOQUEO`
    : "No llegaron codigos desde BLOQUEO. Puedes pegar la lista manual y presionar Analizar.";
  let textareaOculto = listaSheet.length > 0 ? "display:none;" : "";
  let contadorManual = listaSheet.length > 0
    ? ""
    : `<div class="bloqueo-manual-count">Lista manual disponible como respaldo</div>`;
  let totalProductos = Array.isArray(window.dataProductos) ? window.dataProductos.length :
    (typeof dataProductos !== "undefined" && Array.isArray(dataProductos) ? dataProductos.length : 0);
  let totalInventario = Array.isArray(window.dataInventario) ? window.dataInventario.length :
    (typeof dataInventario !== "undefined" && Array.isArray(dataInventario) ? dataInventario.length : 0);
  let totalLpn = Array.isArray(window.dataLPN) ? window.dataLPN.length :
    (typeof dataLPN !== "undefined" && Array.isArray(dataLPN) ? dataLPN.length : 0);
  let totalBloqueo = Array.isArray(window.dataBloqueo) ? window.dataBloqueo.length :
    (typeof dataBloqueo !== "undefined" && Array.isArray(dataBloqueo) ? dataBloqueo.length : 0);
  let datosBaseListos = totalInventario > 0 && totalLpn > 0;

  document.getElementById("modulo").innerHTML = `
    <div class="panel bloqueo-panel">
      <div class="bloqueo-head">
        <div>
          <h2>Productos Bloqueados</h2>
          <p>Extraccion operativa de productos bloqueados en activo y reserva.</p>
        </div>

        <div class="bloqueo-actions">
          <button type="button" onclick="analizarBloqueados()">Analizar</button>
          <button type="button" onclick="limpiarBloqueados()">Limpiar</button>
          <button type="button" onclick="exportarBloqueadosExcel()">Excel</button>
        </div>
      </div>

      <div class="bloqueo-status">
        <div>
          <span>Origen de lista</span>
          <strong>${origenLista}</strong>
        </div>
        <div>
          <span>Datos cargados</span>
          <strong>INV ${totalInventario} | LPNS ${totalLpn} | BLOQUEO ${totalBloqueo}</strong>
        </div>
        <div>
          <span>Regla reserva</span>
          <strong>MASS, RAMPA, DROP-BUFR, BUFFER, DROP-DESBLOQUEO y vacias</strong>
        </div>
        <div>
          <span>Exclusion operativa</span>
          <strong>DROP-BLOQUEO se reporta aparte</strong>
        </div>
      </div>

      <div class="bloqueo-input" style="${textareaOculto}">
        <label>Codigos alternativos</label>
        ${contadorManual}
          <textarea
            id="listaBloqueadosInput"
            placeholder="Pega aqui los codigos alternativos"
          >${listaInicial.join("\n")}</textarea>
      </div>

      <textarea id="listaBloqueadosInputHidden" style="display:none;">${listaInicial.join("\n")}</textarea>

      <div id="resultadoBloqueados" style="margin-top:20px;"></div>
    </div>
  `;

  if(!datosBaseListos){
    document.getElementById("resultadoBloqueados").innerHTML = `
      <div class="bloqueo-loading">
        La pantalla ya abrio, pero aun no hay datos de INV_ACTIVO y LPNS cargados.
        Espera unos segundos y presiona Analizar.
      </div>
    `;
    setTimeout(() => {
      let invOk = typeof dataInventario !== "undefined" && Array.isArray(dataInventario) && dataInventario.length > 0;
      let lpnOk = typeof dataLPN !== "undefined" && Array.isArray(dataLPN) && dataLPN.length > 0;
      if(invOk && lpnOk) abrirBloqueados();
    }, 800);
    return;
  }

  if(listaInicial.length > 0){
    setTimeout(analizarBloqueados, 0);
  }
}

function analizarBloqueados(){
  try {
    let resultado = document.getElementById("resultadoBloqueados");
    if(resultado){
      resultado.innerHTML = `
        <div class="bloqueo-loading">
          Analizando productos bloqueados...
        </div>
      `;
    }

    if(
      typeof dataInventario === "undefined" || !Array.isArray(dataInventario) || dataInventario.length === 0 ||
      typeof dataLPN === "undefined" || !Array.isArray(dataLPN) || dataLPN.length === 0
    ){
      if(resultado){
        resultado.innerHTML = `
          <div class="bloqueo-error">
            <b>Todavia no hay datos suficientes para analizar.</b>
            <div>Falta cargar INV_ACTIVO o LPNS. Espera unos segundos y vuelve a presionar Analizar.</div>
          </div>
        `;
      }
      return;
    }

    let listaSheet = obtenerListaBloqueoSheet();
    let inputLista = document.getElementById("listaBloqueadosInput") ||
      document.getElementById("listaBloqueadosInputHidden");

    let state = getBloqueadosState();

    state.listaAlt = listaSheet.length > 0
      ? listaSheet
      : parsearListaBloqueados(inputLista ? inputLista.value : "");

    if(inputLista){
      inputLista.value = state.listaAlt.join("\n");
    }

    localStorage.setItem(
      "listaBloqueadosAlt",
      JSON.stringify(state.listaAlt)
    );

    if(state.listaAlt.length === 0){
      document.getElementById("resultadoBloqueados").innerHTML =
        "<p>Ingresa al menos un codigo alternativo.</p>";
      return;
    }

    let productosPorAlt = {};
    dataProductos.forEach(p => {
      let alt = claveBloqueado(p["CODIGO_ALT"]);
      if(!alt) return;
      productosPorAlt[alt] = p;
    });

    let productosBloqueados = state.listaAlt.map(alt => {
      let producto = productosPorAlt[claveBloqueado(alt)];
      let descripcionBloqueo = obtenerDescripcionBloqueoSheet(alt);
      return {
        codigoAlt: alt,
        codigo: producto ? normalizarBloqueado(producto["CODIGO"]) : "",
        descripcion: producto
          ? (producto["DESCRIPCION"] || descripcionBloqueo)
          : (descripcionBloqueo || "No encontrado en PRODUCTOS"),
        uxb: producto ? obtenerUxbBloqueado(producto) : 1,
        encontrado: Boolean(producto)
      };
    });

    let productosPorAltBloqueado = {};
    productosBloqueados.forEach(p => {
      productosPorAltBloqueado[claveBloqueado(p.codigoAlt)] = p;
    });

    state.activo = consolidarBloqueadosActivo(productosPorAltBloqueado);
    let reservaResultado = consolidarBloqueadosReserva(productosPorAltBloqueado);
    state.reserva = reservaResultado.operativo;

    state.resumen = construirResumenBloqueados(
      productosBloqueados,
      state.activo,
      state.reserva,
      reservaResultado.dropBloqueo
    );

    renderBloqueados();

  } catch (error) {
    console.error("Error analizando bloqueados:", error);
    let resultado = document.getElementById("resultadoBloqueados");
    if(resultado){
      resultado.innerHTML = `
        <div class="bloqueo-error">
          <b>No se pudo analizar la lista.</b>
          <div>${error.message || error}</div>
        </div>
      `;
    }
  }
}

function consolidarBloqueadosActivo(productosPorAltBloqueado){
  let mapa = {};

  dataInventario.forEach(r => {
    let altFila = normalizarBloqueado(r["COD_ALT"]);
    let producto = productosPorAltBloqueado[claveBloqueado(altFila)];
    if(!producto) return;

    let codigo = codigoCompletoBloqueado(r["PRODUCTO"], producto);
    let descripcion = r["DESCRIPCION"] || producto.descripcion;
    let ubicacion = String(r["UBICACION"] || "SIN UBICACION").trim() || "SIN UBICACION";
    let key = `${claveBloqueado(producto.codigoAlt)}___${codigo}___${ubicacion}`;
    let unidades = numeroBloqueado(r["UNACT"]);
    let uxb = numeroBloqueado(r["UXB"]) || producto.uxb || 1;

    if(!mapa[key]){
      mapa[key] = {
        codigoAlt: producto.codigoAlt,
        codigo,
        descripcion,
        ubicacion,
        unidades: 0,
        bultos: 0,
        uxb
      };
    }

    mapa[key].unidades += unidades;
    mapa[key].bultos = mapa[key].unidades / mapa[key].uxb;
  });

  return Object.values(mapa).sort(ordenarDetalleBloqueado);
}

function consolidarBloqueadosReserva(productosPorAltBloqueado){
  let operativo = {};
  let dropBloqueo = {};

  dataLPN.forEach(r => {
    let altFila = normalizarBloqueado(r["COD_ALT"]);
    let producto = productosPorAltBloqueado[claveBloqueado(altFila)];
    if(!producto) return;

    let codigo = codigoCompletoBloqueado(r["CODIGO"], producto);
    let descripcion = r["DESCRIPCION"] || producto.descripcion;
    let estado = String(r["ESTADO"] || "").trim();
    if(estado !== "Ubicado" && estado !== "Recibido") return;

    let ubicacionOriginal = String(r["UBICACION"] || "").trim();
    let ubicacion = ubicacionOriginal || "PALETERO";
    let bultos = numeroBloqueado(r["BULTOS"]);
    let destino = null;

    if(esDropBloqueo(ubicacionOriginal)){
      destino = dropBloqueo;
    } else if(ubicacionReservaOperativa(ubicacionOriginal)){
      destino = operativo;
    } else {
      return;
    }

    let key = `${claveBloqueado(producto.codigoAlt)}___${codigo}___${ubicacion}`;

    if(!destino[key]){
      destino[key] = {
        codigoAlt: producto.codigoAlt,
        codigo,
        descripcion,
        ubicacion,
        unidades: "",
        bultos: 0
      };
    }

    destino[key].bultos += bultos;
  });

  return {
    operativo: Object.values(operativo).sort(ordenarDetalleBloqueado),
    dropBloqueo: Object.values(dropBloqueo).sort(ordenarDetalleBloqueado)
  };
}

function construirResumenBloqueados(productos, activo, reserva, dropBloqueo){
  let mapa = {};

  productos.forEach(p => {
    mapa[p.codigoAlt] = {
      codigoAlt: p.codigoAlt,
      codigo: p.codigo || "-",
      descripcion: p.descripcion,
      activoUnd: 0,
      activoBul: 0,
      reservaBul: 0,
      totalBul: 0,
      dropBloqueoBul: 0,
      estado: p.encontrado ? "OK" : "No encontrado"
    };
  });

  activo.forEach(r => {
    let row = mapa[r.codigoAlt];
    if(!row) return;
    row.activoUnd += r.unidades;
    row.activoBul += r.bultos;
  });

  reserva.forEach(r => {
    let row = mapa[r.codigoAlt];
    if(!row) return;
    row.reservaBul += r.bultos;
  });

  dropBloqueo.forEach(r => {
    let row = mapa[r.codigoAlt];
    if(!row) return;
    row.dropBloqueoBul += r.bultos;
  });

  Object.values(mapa).forEach(r => {
    r.totalBul = r.activoBul + r.reservaBul;
    if(r.estado === "OK" && r.totalBul === 0 && r.dropBloqueoBul > 0){
      r.estado = "Solo DROP-BLOQUEO";
    } else if(r.estado === "OK" && r.totalBul === 0){
      r.estado = "Sin stock operativo";
    }
  });

  return Object.values(mapa).sort((a,b) =>
    b.totalBul - a.totalBul || a.codigoAlt.localeCompare(b.codigoAlt)
  );
}

function ordenarDetalleBloqueado(a,b){
  return (
    String(a.codigo).localeCompare(String(b.codigo)) ||
    String(a.ubicacion).localeCompare(String(b.ubicacion))
  );
}

function renderBloqueados(){
  let state = getBloqueadosState();
  let resumen = state.resumen;
  let activo = state.activo;
  let reserva = state.reserva;
  let totalActivo = resumen.reduce((s,r) => s + r.activoBul, 0);
  let totalReserva = resumen.reduce((s,r) => s + r.reservaBul, 0);
  let totalDrop = resumen.reduce((s,r) => s + r.dropBloqueoBul, 0);
  let encontrados = resumen.filter(r => r.estado !== "No encontrado").length;
  let conStock = resumen.filter(r => r.totalBul > 0).length;

  document.getElementById("resultadoBloqueados").innerHTML = `
    <div class="bloqueo-kpis">
      <div><span>Lista</span><strong>${resumen.length}</strong></div>
      <div><span>Encontrados</span><strong>${encontrados}</strong></div>
      <div><span>Con stock</span><strong>${conStock}</strong></div>
      <div><span>Activo BUL</span><strong>${formatoBloqueado(totalActivo)}</strong></div>
      <div><span>Reserva BUL</span><strong>${formatoBloqueado(totalReserva)}</strong></div>
      <div class="accent"><span>Total operativo</span><strong>${formatoBloqueado(totalActivo + totalReserva)}</strong></div>
      <div><span>DROP-BLOQUEO</span><strong>${formatoBloqueado(totalDrop)}</strong></div>
    </div>

    <h3 class="bloqueo-section-title">Resumen general</h3>
    ${tablaResumenBloqueados()}

    <h3 class="bloqueo-section-title">Inventario activo</h3>
    ${tablaDetalleBloqueados(activo, true)}

    <h3 class="bloqueo-section-title">Reserva operativa</h3>
    ${tablaDetalleBloqueados(reserva, false)}
  `;
}

function tablaResumenBloqueados(){
  let filas = getBloqueadosState().resumen.map(r => `
    <tr>
      <td class="codigo-texto" style="mso-number-format:'\\@';">${r.codigoAlt}</td>
      <td class="codigo-texto" style="mso-number-format:'\\@';">${r.codigo}</td>
      <td>${r.descripcion}</td>
      <td>${formatoBloqueado(r.activoUnd)}</td>
      <td>${formatoBloqueado(r.activoBul)}</td>
      <td>${formatoBloqueado(r.reservaBul)}</td>
      <td><b>${formatoBloqueado(r.totalBul)}</b></td>
      <td>${formatoBloqueado(r.dropBloqueoBul)}</td>
      <td>${r.estado}</td>
    </tr>
  `).join("");

  return `
    <div class="bloqueo-table-wrap">
      <table class="bloqueo-table">
        <tr>
          <th>CODIGO_ALT</th>
          <th>CODIGO</th>
          <th>DESCRIPCION</th>
          <th>UND ACTIVO</th>
          <th>BUL ACTIVO</th>
          <th>BUL RESERVA</th>
          <th>TOTAL BUL</th>
          <th>DROP-BLOQUEO</th>
          <th>ESTADO</th>
        </tr>
        ${filas || "<tr><td colspan='9'>Sin resultados</td></tr>"}
      </table>
    </div>
  `;
}

function tablaDetalleBloqueados(data, mostrarUnidades){
  let filas = data.map(r => `
    <tr>
      <td class="codigo-texto" style="mso-number-format:'\\@';">${r.codigo}</td>
      <td>${r.descripcion}</td>
      <td>${r.ubicacion}</td>
      ${mostrarUnidades ? `<td>${formatoBloqueado(r.unidades)}</td>` : "<td>-</td>"}
      <td>${formatoBloqueado(r.bultos)}</td>
    </tr>
  `).join("");

  return `
    <div class="bloqueo-table-wrap">
      <table class="bloqueo-table">
        <tr>
          <th>CODIGO</th>
          <th>DESCRIPCION</th>
          <th>UBICACION</th>
          <th>UNIDADES ACTIVAS</th>
          <th>BULTOS</th>
        </tr>
        ${filas || "<tr><td colspan='5'>Sin resultados</td></tr>"}
      </table>
    </div>
  `;
}

function limpiarBloqueados(){
  let state = getBloqueadosState();
  state.listaAlt = [];
  state.resumen = [];
  state.activo = [];
  state.reserva = [];
  localStorage.removeItem("listaBloqueadosAlt");
  let inputLista = document.getElementById("listaBloqueadosInput") ||
    document.getElementById("listaBloqueadosInputHidden");
  if(inputLista) inputLista.value = "";
  document.getElementById("resultadoBloqueados").innerHTML = "";
}

function exportarBloqueadosExcel(){
  let state = getBloqueadosState();
  if(state.resumen.length === 0){
    alert("Primero analiza la lista");
    return;
  }

  let html = `
    <h3>Resumen general</h3>
    ${tablaResumenBloqueados()}
    <h3>Inventario activo</h3>
    ${tablaDetalleBloqueados(state.activo, true)}
    <h3>Reserva operativa</h3>
    ${tablaDetalleBloqueados(state.reserva, false)}
  `;

  let blob = new Blob([html], {type:"application/vnd.ms-excel"});
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "productos_bloqueados.xls";
  a.click();
}

window.abrirBloqueados = abrirBloqueados;
window.analizarBloqueados = analizarBloqueados;
window.limpiarBloqueados = limpiarBloqueados;
window.exportarBloqueadosExcel = exportarBloqueadosExcel;

