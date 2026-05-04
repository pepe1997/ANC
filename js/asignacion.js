// ===== CONFIG =====
const UBICACIONES_RESERVA = ["Mass-"];
const UBICACIONES_OTRAS = ["DROP-BUFR", "RAMPA", "DROP-STOCK"];

// 🔥 INDICE LPN (RENDIMIENTO)
let mapaLPN = {};

function construirMapaLPN(){

  if(!Array.isArray(dataLPN) || dataLPN.length === 0){
    return false; // 🔥 clave
  }

  mapaLPN = {};

  dataLPN.forEach(l => {
    let cod = limpiarCodigo(l["CODIGO"]);
    if(!mapaLPN[cod]) mapaLPN[cod] = [];
    mapaLPN[cod].push(l);
  });

  return true; // 🔥 confirmación
}

let estadoOperarios =
JSON.parse(localStorage.getItem("estadoOperarios") || "{}");

// ===== UTILIDADES =====
function limpiarCodigo(valor){
  if(valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function numeroReal(valor){
  let txt = String(valor || "").trim();

  if(txt === "") return 0;

  txt = txt.replace(",", ".");

  let n = parseFloat(txt);

  return isNaN(n) ? 0 : n;
}

// ===== ABRIR =====
function abrirAsignacion(){

  // 🔥 CONTROL DE CARGA
  if(
    !Array.isArray(dataPedido) || dataPedido.length === 0 ||
    !Array.isArray(dataLPN)    || dataLPN.length === 0
  ){
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirAsignacion, 500);
    return;
  }

  if(!construirMapaLPN()){
    document.getElementById("modulo").innerHTML = "⏳ Preparando ubicaciones...";
    setTimeout(abrirAsignacion, 300);
    return;
  }
  procesarDatos();

  // =============================
  // 🔥 KPI DESDE FUNCIÓN GLOBAL
  // =============================
  let resumen = generarResumenGlobal();
  let ultima = resumen[resumen.length - 1] || {};
  let ultimaFecha = ultima.fecha || "-";
  let asignable = numeroReal(ultima.asignable);
  let asignado    = numeroReal(ultima.asignado);
  let prog = calcularProgresoReal();
  let progresoGlobal = prog.porcentaje.toFixed(1);
  let noAsignadoGlobal = resumen.reduce((a,b)=>
    a + numeroReal(b.noasig)
  ,0);

  const codigosReserva = new Set();

  (window.reservaData || []).forEach(r=>{
    if(r.codigo) codigosReserva.add(r.codigo);
  });

  const productosReserva = codigosReserva.size;


  // =============================
  // 🔥 QUIEBRES
  // =============================
  const productos = obtenerPedido();
  const quiebres = productos.filter(p => esQuiebre(p.codigo));

  const alerta = quiebres.length > 0
    ? `<div style="color:#ef4444;font-weight:bold;margin-bottom:10px;">
         ⚠️ ${quiebres.length} productos en quiebre
       </div>`
    : "";

  // =============================
  // 🔥 RENDER
  // =============================
  document.getElementById("modulo").innerHTML = `
    <h2>📊 Asignación Inteligente</h2>

    ${alerta}

    <div class="kpi-big-grid">

      <div class="kpi-big">
        <span>Fecha</span>
        <h1>${ultimaFecha}</h1>
      </div>

      <div class="kpi-big">
        <span>Asignable</span>
        <h1>${formatoDecimal(asignable)}</h1>
      </div>

      <div class="kpi-big">
        <span>Asignado</span>
        <h1>${formatoDecimal(asignado)}</h1>
      </div>

      <div class="kpi-big">
        <span>No Asignado (Global)</span>
        <h1 style="color:#ef4444;">
          ${formatoDecimal(noAsignadoGlobal)}
        </h1>
      </div>

      <div class="kpi-big">
        <span>Productos</span>
        <h1>${productosReserva}</h1>
      </div>

      <div class="kpi-big">
      <span>Progreso</span>
      <h1>${progresoGlobal}%</h1>
      <small>${prog.productosCompletados} / ${prog.totalProductos}</small>
    </div>

    </div>

    <div style="margin-bottom:15px;">
      <button class="btn-reserva" onclick="verReserva()">🟢 Reserva</button>
      <button class="btn-otras" onclick="verOtras()">🟡 Otras Ubicaciones</button>
      <button class="btn-stock" onclick="verSinStock()">🔴 Sin Stock</button>
      <button onclick="resetOperarios()">🔄 Reiniciar</button>
    </div>

    <div id="contenido"></div>
  `;
}

// ===== OBTENER PEDIDO =====
function obtenerPedido(){

  let mapa = {};

  dataPedido.forEach(p=>{

    let codigo = limpiarCodigo(p["PRODUCTO"]);
    let desc = p["DESCRIPCION"] || "";
    let bultos = numeroReal(p["BULTOS_NO_ASIGNADO"]);

    if(codigo === "") return;
    if(bultos <= 0) return;

    if(!mapa[codigo]){
      mapa[codigo] = {
        codigo,
        desc,
        total:0
      };
    }

    mapa[codigo].total += bultos;

  });

  return Object.values(mapa);
}

// ===== ORDEN RESERVA =====
function ordenarReserva(a,b){

  function extraer(ubi){

    let p = String(ubi || "").trim().split("-");

    return {
      pasillo: Number(p[1]) || 0,
      bahia: Number(p[2]) || 0,
      nivel: Number(p[3]) || 0,
      columna: Number(p[4]) || 0
    };
  }

  let ua = extraer(a.ubicacion);
  let ub = extraer(b.ubicacion);

  if(ua.pasillo !== ub.pasillo)
    return ua.pasillo - ub.pasillo;

  if(ua.bahia !== ub.bahia)
    return ua.bahia - ub.bahia;

  if(ua.nivel !== ub.nivel)
    return ua.nivel - ub.nivel;

  return ua.columna - ub.columna;
}

// ===== SIN STOCK =====
function verSinStock(){

  let pedido = obtenerPedido();
  let sinStockData = [];

  pedido.forEach(p=>{

    let {codigo,desc,total} = p;

    let lpns = mapaLPN[codigo] || [];

    let utiles = lpns.filter(l=>{

      let estado = String(l["ESTADO"] || "").trim();
      let ubi = String(l["UBICACION"] || "").trim();

      let estadoOk =
        estado === "Ubicado" ||
        estado === "Recibido";

      let ubiOk =
        ubi.startsWith("Mass-") ||
        ubi.startsWith("RAMPA") ||
        ubi.startsWith("DROP-STOCK") ||
        ubi.startsWith("DROP-BUFR") ||
        ubi === "";

      return estadoOk && ubiOk;
    });

    if(utiles.length === 0){

      let prod = dataProductos.find(x =>
        limpiarCodigo(x["CODIGO"]) === codigo
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

  sinStockData.sort((a,b)=> b.bultos - a.bultos);

  window.sinStockData = sinStockData;

  let html = `
    <h3>🔴 SIN STOCK</h3>

    <button class="btn-export"
      onclick="descargarExcel('sinStock')">⬇ Excel</button>

    <button onclick="descargarImagen()">🖼 Imagen</button>

    <table>
      <tr>
        <th>CODIGO_ALT</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS</th>
        <th>ESTADO</th>
      </tr>
  `;

  sinStockData.forEach(s=>{

    html += `
      <tr>
        <td>${s.codigoAlt}</td>
        <td>${s.codigo}</td>
        <td>${s.desc}</td>
        <td>${s.bultos}</td>
        <td style="color:red;font-weight:bold;">
          ${s.estado}
        </td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("contenido").innerHTML = html;
}
function calcularSinStockData(){

  let pedido = obtenerPedido();
  let resultado = [];

  pedido.forEach(p=>{

    let {codigo,desc,total} = p;

    let lpns = mapaLPN[codigo] || [];

    let utiles = lpns.filter(l=>{

      let estado = String(l["ESTADO"] || "").trim();
      let ubi = String(l["UBICACION"] || "").trim();

      let estadoOk =
        estado === "Ubicado" ||
        estado === "Recibido";

      let ubiOk =
        ubi.startsWith("Mass-") ||
        ubi.startsWith("RAMPA") ||
        ubi.startsWith("DROP-STOCK") ||
        ubi.startsWith("DROP-BUFR") ||
        ubi === "";

      return estadoOk && ubiOk;
    });

    if(utiles.length === 0){
      resultado.push({
        codigo,
        desc,
        bultos: total
      });
    }

  });

  return resultado;
}

// ===== PROCESAR =====
function procesarDatos(){

  let pedido = obtenerPedido();

  let lpnValidos = dataLPN.filter(l=>{
    let e = String(l["ESTADO"] || "").trim();
    return e === "Ubicado" || e === "Recibido";
  });

  let tablaReserva = [];
  let tablaOtras = [];

  pedido.forEach(p=>{

    let {codigo,desc,total} = p;

    let lpns = (mapaLPN[codigo] || []).filter(l => {
      let e = String(l["ESTADO"] || "").trim();
      return e === "Ubicado" || e === "Recibido";
    });

    let reserva = lpns.filter(l =>
      UBICACIONES_RESERVA.some(x =>
        String(l["UBICACION"] || "").startsWith(x)
      )
    );

    let otras = lpns.filter(l=>{

      let ubi = String(l["UBICACION"] || "").trim();

      return (
        UBICACIONES_OTRAS.some(x => ubi.startsWith(x)) ||
        ubi === ""
      );
    });

    let restante = total;
    let usados = [];

    // mejor ajuste
    let mejor = reserva
      .filter(l => numeroReal(l["BULTOS"]) >= restante)
      .sort((a,b)=>
        numeroReal(a["BULTOS"]) - numeroReal(b["BULTOS"])
      )[0];

    if(mejor){
      usados.push({...mejor,tomar:restante,highlight:true});
      restante = 0;
    }

    // acumular
    if(restante > 0){

      let ordenados = [...reserva].sort((a,b)=>
        numeroReal(b["BULTOS"]) - numeroReal(a["BULTOS"])
      );

      for(let r of ordenados){

        if(restante <= 0) break;

        let tomar = Math.min(
          restante,
          numeroReal(r["BULTOS"])
        );

        usados.push({...r,tomar});
        restante -= tomar;
      }
    }

    usados.forEach(u=>{
      tablaReserva.push({
        codigo,
        desc,
        lpn: u["LPN"],
        ubicacion: u["UBICACION"],
        requerido: total,
        bultos: u["BULTOS"]
      });
    });

    if(restante > 0){

      let sugerido = otras
        .filter(o => numeroReal(o["BULTOS"]) >= restante)
        .sort((a,b)=>
          numeroReal(a["BULTOS"]) - numeroReal(b["BULTOS"])
        )[0];

      otras.forEach(o=>{
        tablaOtras.push({
          codigo,
          desc,
          lpn: o["LPN"],
          ubicacion: o["UBICACION"],
          requerido: restante,
          bultos: o["BULTOS"],
          highlight:
            sugerido &&
            o["LPN"] === sugerido["LPN"]
        });
      });
    }

  });

  window.reservaData = tablaReserva.sort(ordenarReserva);
  window.otrasData = tablaOtras;
}
// ===== VER RESERVA =====
function verReserva(){

  procesarDatos();

  let completos =
    window.reservaData.filter(r => r.requerido >= 30);

  let parciales =
    window.reservaData.filter(r => r.requerido < 30);

  let html = `
    <h3>🟢 OPERARIOS</h3>

    <button class="btn-export"
      onclick="descargarExcel('reserva')">⬇ Excel</button>
  `;

  html += `
    <div id="bloque-mayores">
      <h4>
        📦 MAYORES / IGUALES A 30
        <button onclick="descargarImagenId(
          'bloque-mayores',
          'mayores_30'
        )">🖼</button>
      </h4>

      ${crearTablaReserva(completos)}
    </div>
  `;

  for(let i=1;i<=12;i++){

    let nro = String(i).padStart(2,"0");

    let datosPasillo = parciales.filter(r =>
      String(r.ubicacion || "")
      .startsWith("Mass-" + nro)
    );

    if(datosPasillo.length > 0){

      html += `
        <div id="pasillo-${i}" style="margin-top:30px;">

          <h4>
            🚶 PASILLO ${i}

            <button onclick="descargarImagenId(
              'pasillo-${i}',
              'pasillo_${i}'
            )">🖼</button>
          </h4>

          ${crearTablaReserva(datosPasillo)}

        </div>
      `;
    }
  }

  document.getElementById("contenido").innerHTML = html;
}

// ===== VER OTRAS =====
function verOtras(){

  procesarDatos();

  let html = `
    <h3>🟡 OTRAS UBICACIONES</h3>

    <button class="btn-export"
      onclick="descargarExcel('otras')">⬇ Excel</button>

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

  window.otrasData.forEach(o=>{

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

// ===== TABLA RESERVA =====
function crearTablaReserva(data){
  let progreso = calcularProgreso();
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
        <th>%</th>
        <th>ACCION</th>
      </tr>
  `;

  data.forEach(r=>{

    let key = r.lpn + "_" + r.codigo;
    let estado = estadoOperarios[key] || "pendiente";

    let texto = "🔴 Pendiente";
    let color = "";

    let p = progreso[r.codigo] || {};
    let porcentaje = (p.porcentaje || 0).toFixed(0);

    if(r.highlight){
      color = "background:#fef9c3;font-weight:bold;";
    }

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
        <td><b>${formatoDecimal(r.requerido)}</b></td>
        <td>${formatoDecimal(r.bultos)}</td>
        <td>${texto}</td>
        <td>${porcentaje}%</td>
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

// ===== CAMBIAR ESTADO =====
function cambiarEstadoOperario(key){

  let actual =
    estadoOperarios[key] || "pendiente";

  let nuevo = "pendiente";

  if(actual === "pendiente")
    nuevo = "proceso";
  else if(actual === "proceso")
    nuevo = "completo";
  else
    nuevo = "pendiente";

  estadoOperarios[key] = nuevo;

  localStorage.setItem(
    "estadoOperarios",
    JSON.stringify(estadoOperarios)
  );

  verReserva();
  actualizarProgresoUI(); // 🔥 NUEVO
}

// ===== EXPORTAR =====
function descargarExcel(tipo){

  let data = [];

  if(tipo === "reserva")
    data = window.reservaData || [];

  if(tipo === "otras")
    data = window.otrasData || [];

  if(tipo === "sinStock")
    data = window.sinStockData || [];

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
          <td style="mso-number-format:'\\@';">
            ${d.codigoAlt}
          </td>

          <td style="mso-number-format:'\\@';">
            ${d.codigo}
          </td>

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
          <td style="mso-number-format:'\\@';">
            ${d.lpn || ""}
          </td>

          <td style="mso-number-format:'\\@';">
            ${d.codigo}
          </td>

          <td>${d.desc}</td>
          <td>${d.ubicacion || ""}</td>
          <td>${d.requerido || ""}</td>
          <td>${d.bultos}</td>
        </tr>
      `;
    });
  }

  html += "</table>";

  let blob = new Blob(
    [html],
    {type:"application/vnd.ms-excel"}
  );

  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = tipo + ".xls";
  a.click();
}

// ===== IMAGEN =====
function descargarImagen(){

  html2canvas(
    document.getElementById("contenido")
  ).then(canvas=>{

    let a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = "reporte.png";
    a.click();

  });
}

function descargarImagenId(id,nombre){

  let zona = document.getElementById(id);

  if(!zona){
    alert("No se encontró la sección");
    return;
  }

  html2canvas(zona).then(canvas=>{

    let a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = nombre + ".png";
    a.click();

  });
}
function resetOperarios(){

  if(!confirm("¿Reiniciar progreso?")) return;

  localStorage.removeItem("estadoOperarios");
  estadoOperarios = {};

  // 🔥 Fuerza recalculo limpio
  procesarDatos();

  let prog = calcularProgresoReal();
  console.log("Progreso después de reset:", prog);

  // 🔥 Render completo (esto actualiza KPI a 0)
  abrirAsignacion();
}

function calcularProgreso(){

  let progresoPorProducto = {};

  (window.reservaData || []).forEach(r=>{

    let key = r.lpn + "_" + r.codigo;
    let estado = estadoOperarios[key] || "pendiente";

    if(!progresoPorProducto[r.codigo]){
      progresoPorProducto[r.codigo] = {
        requerido: r.requerido,
        completado: 0
      };
    }

    if(estado === "completo"){
      progresoPorProducto[r.codigo].completado += numeroReal(r.bultos);
    }

  });

  // calcular %
  Object.values(progresoPorProducto).forEach(p=>{
    p.porcentaje = p.requerido > 0
      ? (p.completado / p.requerido) * 100
      : 0;

    if(p.porcentaje > 100) p.porcentaje = 100;
  });

  return progresoPorProducto;
}

function calcularProgresoGlobal(){

  let data = calcularProgreso();

  let totalReq = 0;
  let totalComp = 0;

  Object.values(data).forEach(p=>{
    totalReq += p.requerido;
    totalComp += p.completado;
  });

  let porcentaje = totalReq > 0
    ? (totalComp / totalReq) * 100
    : 0;

  return porcentaje;
}
function calcularProgresoReal(){

  let productos = {};

  (window.reservaData || []).forEach(r => {

    let key = r.lpn + "_" + r.codigo;
    let estado = estadoOperarios[key] || "pendiente";

    if(!productos[r.codigo]){
      productos[r.codigo] = {
        total: 0,
        completos: 0
      };
    }

    productos[r.codigo].total++;

    if(estado === "completo"){
      productos[r.codigo].completos++;
    }

  });

  let totalProductos = 0;
  let productosCompletados = 0;

  Object.values(productos).forEach(p => {

    totalProductos++;

    // 🔥 SOLO cuenta como completo si TODOS sus LPN están completos
    if(p.completos === p.total){
      productosCompletados++;
    }

  });

  let porcentaje = totalProductos > 0
    ? (productosCompletados / totalProductos) * 100
    : 0;

  return {
    porcentaje,
    totalProductos,
    productosCompletados
  };
}
function cambiarEstadoOperario(key){

  let actual = estadoOperarios[key] || "pendiente";
  let nuevo = "pendiente";

  if(actual === "pendiente")
    nuevo = "proceso";
  else if(actual === "proceso")
    nuevo = "completo";
  else
    nuevo = "pendiente";

  estadoOperarios[key] = nuevo;

  localStorage.setItem(
    "estadoOperarios",
    JSON.stringify(estadoOperarios)
  );

  // 🔥 SOLUCIÓN
  abrirAsignacion(); // recalcula KPIs
  verReserva();      // vuelve a mostrar tabla
}