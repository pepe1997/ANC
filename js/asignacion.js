// ===== CONFIG =====
const UBICACIONES_RESERVA = ["Mass-"];
const UBICACIONES_OTRAS = ["DROP-BUFR", "RAMPA", "DROP-STOCK"];
let estadoOperarios = JSON.parse(localStorage.getItem("estadoOperarios") || "{}");

// ===== ABRIR =====
function abrirAsignacion() {

  if (dataPedido.length === 0 || dataLPN.length === 0) {
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirAsignacion, 1000);
    return;
  }

  document.getElementById("modulo").innerHTML = `
    <h2>📊 Asignación Inteligente</h2>

    <div style="margin-bottom:15px;">
      <button class="btn-reserva" onclick="verReserva()">🟢 Reserva</button>
      <button class="btn-otras" onclick="verOtras()">🟡 Otras Ubicaciones</button>
      <button class="btn-stock" onclick="verSinStock()">🔴 Sin Stock</button>
    </div>

    <div id="contenido"></div>
  `;
}

// ===== AGRUPAR PEDIDO =====
function obtenerPedido() {

  let mapa = {};

  dataPedido.forEach(p => {

    let codigo = (p["PRODUCTO"] || "").trim();
    let desc = p["DESCRIPCION"] || "";
    let bultos = Number(p["BULTOS_NO_ASIGNADO"]) || 0;

    if (bultos <= 0) return;

    if (!mapa[codigo]) {
      mapa[codigo] = { codigo, desc, total: 0 };
    }

    mapa[codigo].total += bultos;
  });

  return Object.values(mapa);
}

// ===== ORDENAR PASILLO =====
function ordenarReserva(a, b) {

  function extraer(ubi){

    let p = String(ubi || "").trim().split("-");

    return {
      pasillo: Number(p[1]) || 0,
      bahia:   Number(p[2]) || 0,
      nivel:   Number(p[3]) || 0,
      columna: Number(p[4]) || 0
    };
  }

  let ua = extraer(a.ubicacion);
  let ub = extraer(b.ubicacion);

  if (ua.pasillo !== ub.pasillo)
    return ua.pasillo - ub.pasillo;

  if (ua.bahia !== ub.bahia)
    return ua.bahia - ub.bahia;

  if (ua.nivel !== ub.nivel)
    return ua.nivel - ub.nivel;

  return ua.columna - ub.columna;
}

function verSinStock() {

  let pedido = obtenerPedido();
  let sinStockData = [];

  pedido.forEach(p => {

    let { codigo, desc, total } = p;

    let lpns = dataLPN.filter(l =>
      String(l["CODIGO"] || "").trim() === String(codigo).trim()
    );

    let utiles = lpns.filter(l => {

      let estado = String(l["ESTADO"] || "").trim();
      let ubi = String(l["UBICACION"] || "").trim();

      let estadoValido =
        estado === "Ubicado" ||
        estado === "Recibido";

      let ubicacionValida =
        ubi.startsWith("Mass-") ||
        ubi.startsWith("RAMPA") ||
        ubi.startsWith("DROP-STOCK") ||
        ubi.startsWith("DROP-BUFR") ||
        ubi === "";

      return estadoValido && ubicacionValida;
    });

    if (utiles.length === 0) {

      let prod = dataProductos.find(x =>
        String(x["CODIGO"] || "").trim() === String(codigo).trim()
      );

      let alt = prod ? (prod["CODIGO_ALT"] || "") : "";

      sinStockData.push({
        codigoAlt: alt,
        codigo,
        desc,
        bultos: total,
        estado: "SIN STOCK"
      });
    }

  });

  sinStockData.sort((a,b) => b.bultos - a.bultos);

  window.sinStockData = sinStockData;

  let html = `
    <h3>🔴 SIN STOCK</h3>

    <button class="btn-export" onclick="descargarExcel('sinStock')">⬇ Excel</button>
    <button onclick="descargarImagen()">🖼 Imagen</button>

    <table>
      <tr>
        <th>CODIGO_ALT</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS NO ASIGNADOS</th>
        <th>ESTADO</th>
      </tr>
  `;

  sinStockData.forEach(s => {

    html += `
      <tr>
        <td>${s.codigoAlt}</td>
        <td>${s.codigo}</td>
        <td>${s.desc}</td>
        <td style="text-align:center;">${s.bultos}</td>
        <td style="color:red;font-weight:bold;">${s.estado}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("contenido").innerHTML = html;
}
// ===== PROCESAR =====
function procesarDatos() {

  let pedido = obtenerPedido();

  let lpnValidos = dataLPN.filter(l => {
    let e = (l["ESTADO"] || "").trim();
    return e === "Ubicado" || e === "Recibido";
  });

  let tablaReserva = [];
  let tablaOtras = [];

  pedido.forEach(p => {

    let { codigo, desc, total } = p;

    let lpns = lpnValidos.filter(l => l["CODIGO"] === codigo);

    let reserva = lpns.filter(l =>
      UBICACIONES_RESERVA.some(x => l["UBICACION"].startsWith(x))
    );

    let otras = lpns.filter(l => {

      let ubi = (l["UBICACION"] || "").trim();

      return (
        UBICACIONES_OTRAS.some(x => ubi.startsWith(x)) ||
        ubi === ""   // 🔥 PALLETERO
      );
    });

    let restante = total;
    let usados = [];

    // ===== RESERVA =====

    // 1. mejor ajuste
    let mejor = reserva
      .filter(l => Number(l["BULTOS"]) >= restante)
      .sort((a, b) => a["BULTOS"] - b["BULTOS"])[0];

    if (mejor) {
      usados.push({
        ...mejor,
        tomar: restante
      });
      restante = 0;
    }

    // 2. acumular si no alcanza
    if (restante > 0) {

      let ordenados = [...reserva].sort((a, b) => b["BULTOS"] - a["BULTOS"]);

      for (let r of ordenados) {

        if (restante <= 0) break;

        let tomar = Math.min(restante, Number(r["BULTOS"]));

        usados.push({ ...r, tomar });
        restante -= tomar;
      }
    }

    // guardar reserva
    usados.forEach(u => {
      tablaReserva.push({
        codigo,
        desc,
        lpn: u["LPN"],
        ubicacion: u["UBICACION"],
        requerido: total,
        bultos: u["BULTOS"]
      });
    });

    // ===== OTRAS =====
    if (restante > 0) {

      let sugerido = otras
        .filter(o => Number(o["BULTOS"]) >= restante)
        .sort((a, b) => a["BULTOS"] - b["BULTOS"])[0];

      otras.forEach(o => {
        tablaOtras.push({
          codigo,
          desc,
          lpn: o["LPN"],
          ubicacion: o["UBICACION"],
          requerido: restante,
          bultos: o["BULTOS"],
          highlight: sugerido && o["LPN"] === sugerido["LPN"]
        });
      });
    }

  });

  window.reservaData = tablaReserva.sort(ordenarReserva);
  window.otrasData = tablaOtras;
}

// ===== MOSTRAR RESERVA =====
function verReserva() {

  procesarDatos();

  let completos = window.reservaData.filter(r => r.requerido >= 30);
  let parciales = window.reservaData.filter(r => r.requerido < 30);

  let html = `
    <h3>🟢 OPERARIOS</h3>

    <button class="btn-export" onclick="descargarExcel('reserva')">⬇ Excel</button>
  `;

  // ===== MAYORES 30 =====
  html += `
    <div id="bloque-mayores">
      <h4 style="margin-top:20px;">
        📦 MAYORES / IGUALES A 30
        <button onclick="descargarImagenId('bloque-mayores','mayores_30')">🖼</button>
      </h4>

      ${crearTablaReserva(completos)}
    </div>
  `;

  // ===== PASILLOS =====
  for(let i = 1; i <= 12; i++){

    let nro = String(i).padStart(2,"0");

    let datosPasillo = parciales.filter(r => {
      let ubi = (r.ubicacion || "").trim();
      return ubi.startsWith("Mass-" + nro);
    });

    if(datosPasillo.length > 0){

      html += `
        <div id="pasillo-${i}" style="margin-top:30px;">

          <h4>
            🚶 PASILLO ${i}
            <button onclick="descargarImagenId('pasillo-${i}','pasillo_${i}')">🖼</button>
          </h4>

          ${crearTablaReserva(datosPasillo)}

        </div>
      `;
    }
  }

  document.getElementById("contenido").innerHTML = html;
}

// ===== MOSTRAR OTRAS =====
function verOtras() {

  procesarDatos();

  let html = `
    <h3>🟡 OTRAS UBICACIONES</h3>

    <button class="btn-export" onclick="descargarExcel('otras')">⬇ Excel</button>
    <button onclick="descargarImagen()">🖼 Imagen</button>

    <table>
      <tr>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>QUIEBRE</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>BULTOS_REQ</th>
        <th>BULTOS_LPN</th>
      </tr>
  `;

  window.otrasData.forEach(o => {

    let quiebre = esQuiebre(o.codigo);

    let style = "";

    if(o.highlight){
      style = "background:yellow;font-weight:bold;";
    }

    if(quiebre){
      style = "background:#fee2e2;font-weight:bold;";
    }

    html += `
      <tr style="${style}">
        <td>${o.lpn}</td>
        <td>${o.codigo}</td>
        <td>${quiebre ? "🔥 SI" : ""}</td>
        <td>${o.desc}</td>
        <td>${o.ubicacion || "PALETERO"}</td>
        <td>${o.requerido}</td>
        <td>${o.bultos}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("contenido").innerHTML = html;
}
function crearTablaReserva(data){

  let html = `
    <table>
      <tr>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>QUIEBRE</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>BULTOS_REQ</th>
        <th>BULTOS_LPN</th>
        <th>ESTADO</th>
        <th>ACCION</th>
      </tr>
  `;

  data.forEach(r => {

    let key = r.lpn + "_" + r.codigo;
    let estado = estadoOperarios[key] || "pendiente";

    let texto = "🔴 Pendiente";
    let color = "";

    if(estado === "proceso"){
      texto = "🟡 En Proceso";
      color = "background:#fef9c3;";
    }

    if(estado === "completo"){
      texto = "🟢 Completado";
      color = "background:#dcfce7;";
    }

    let quiebre = esQuiebre(r.codigo);

    if(quiebre){
      color = "background:#fee2e2;font-weight:bold;";
    }

    html += `
      <tr style="${color}">
        <td>${r.lpn}</td>
        <td>${r.codigo}</td>
        <td>${quiebre ? "🔥 SI" : ""}</td>
        <td>${r.desc}</td>
        <td>${r.ubicacion}</td>
        <td>${r.requerido}</td>
        <td>${r.bultos}</td>
        <td>${texto}</td>
        <td>
          <button onclick="cambiarEstadoOperario('${key}')">
            Cambiar
          </button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  return html;
}
function cambiarEstadoOperario(key){

  let actual = estadoOperarios[key] || "pendiente";

  let nuevo = "pendiente";

  if(actual === "pendiente") nuevo = "proceso";
  else if(actual === "proceso") nuevo = "completo";
  else if(actual === "completo") nuevo = "pendiente";

  estadoOperarios[key] = nuevo;

  localStorage.setItem("estadoOperarios", JSON.stringify(estadoOperarios));

  verReserva();
}

// ===== EXPORTAR =====
function descargarExcel(tipo) {

  let data;

  if (tipo === "reserva") data = window.reservaData;
  else if (tipo === "otras") data = window.otrasData;
  else if (tipo === "sinStock") data = window.sinStockData;

  let html = "<table border='1'>";

  if(tipo === "sinStock"){

    html += `
      <tr>
        <th>CODIGO_ALT</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS</th>
      </tr>
    `;

    data.forEach(d=>{
      html += `
        <tr>
          <td style="mso-number-format:'\@';">${d.codigoAlt}</td>
          <td style="mso-number-format:'\@';">${d.codigo}</td>
          <td>${d.desc}</td>
          <td>${d.bultos}</td>
        </tr>
      `;
    });

  } else {

    html += `
      <tr>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>REQ</th>
        <th>BULTOS</th>
      </tr>
    `;

    data.forEach(d=>{
      html += `
        <tr>
          <td>${d.lpn || ""}</td>
          <td>${d.codigo}</td>
          <td>${d.desc}</td>
          <td>${d.ubicacion || ""}</td>
          <td>${d.requerido || ""}</td>
          <td>${d.bultos}</td>
        </tr>
      `;
    });
  }

  html += "</table>";

  let blob = new Blob([html], { type:"application/vnd.ms-excel" });

  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = tipo + ".xls";
  a.click();
}

// ===== IMAGEN =====
function descargarImagen() {
  html2canvas(document.getElementById("contenido")).then(canvas => {
    let a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = "reporte.png";
    a.click();
  });
}
function descargarImagenId(id, nombre){

  let zona = document.getElementById(id);

  if(!zona) return alert("No se encontró la sección");

  html2canvas(zona).then(canvas => {

    let a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = nombre + ".png";
    a.click();

  });
}