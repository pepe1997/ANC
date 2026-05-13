// ===============================
// 📦 INVENTARIO INTELIGENTE PRO
// ===============================

// =====================================
// 🌎 VARIABLES GLOBALES
// =====================================
let modoVistaInventario = "UND";

let inventarioConsolidado = [];

let productosMultiUbicacion = [];


// =====================================
// 🔧 UTILIDADES
// =====================================
function extraerPasillo(ubi){

  let p = String(ubi || "").split("-");

  return p[1]
    ? p[1].padStart(2,"0")
    : "00";
}

function ordenarUbicacion(a,b){

  function parse(u){

    let p = String(u || "").split("-");

    return {

      pasillo: Number(p[1]) || 0,

      bahia: Number(p[2]) || 0,

      nivel: Number(p[3]) || 0,

      col: Number(p[4]) || 0
    };
  }

  let ua = parse(a);

  let ub = parse(b);

  if(ua.pasillo !== ub.pasillo){
    return ua.pasillo - ub.pasillo;
  }

  if(ua.bahia !== ub.bahia){
    return ua.bahia - ub.bahia;
  }

  if(ua.nivel !== ub.nivel){
    return ua.nivel - ub.nivel;
  }

  return ua.col - ub.col;
}


// =====================================
// 🧠 CONSOLIDAR INVENTARIO
// =====================================
function consolidarInventario(){

  let mapa = {};

  dataInventario.forEach(r => {

    let ubicacion =
      String(r["UBICACION"] || "").trim();

    if(!ubicacion) return;

    let codigo =
      String(r["PRODUCTO"] || "").trim();

    let descripcion =
      String(r["DESCRIPCION"] || "").trim();

    let key =
      `${codigo}___${ubicacion}`;

    let unact =
      Number(r["UNACT"] || 0);

    let uniAsig =
      Number(r["UNI_ASIG"] || 0);

    let uniMax =
      Number(r["UNI_MAX"] || 0);

    let uniMin =
      Number(r["UNI_MIN"] || 0);

    let uxb =
      Number(r["UXB"] || 1);

    if(!mapa[key]){

      mapa[key] = {

        codigo,

        descripcion,

        ubicacion,

        uxb,

        uniMax,

        uniMin,

        unact:0,

        uniAsig:0,

        detalle:[]
      };
    }

    mapa[key].unact += unact;

    mapa[key].uniAsig += uniAsig;

    mapa[key].detalle.push({

      codigo,

      descripcion,

      fecha:
        r["FECHA_EXP"] ||
        r["FECHA"] ||
        "",

      unact,

      ubicacion
    });
  });

  inventarioConsolidado =
    Object.values(mapa);

  // =====================================
  // 📦 DISPONIBLES
  // =====================================
  inventarioConsolidado.forEach(r => {

    r.dispActualUnd =
      Math.max(
        0,
        r.uniMax - r.unact
      );

    r.dispFuturoUnd =
      Math.max(
        0,
        r.uniMax - (
          r.unact - r.uniAsig
        )
      );

    r.dispActualBul =
      Number(
        (r.dispActualUnd / r.uxb)
        .toFixed(2)
      );

    r.dispFuturoBul =
      Number(
        (r.dispFuturoUnd / r.uxb)
        .toFixed(2)
      );

    r.unactBul =
      Number(
        (r.unact / r.uxb)
        .toFixed(2)
      );

    r.uniAsigBul =
      Number(
        (r.uniAsig / r.uxb)
        .toFixed(2)
      );

    // =====================================
    // 🚨 ALERTAS
    // =====================================
    if(r.dispActualUnd <= 0){

      r.alerta = "🔴 SATURADO";

      r.color = "#fee2e2";

    } else if(r.uniAsig > 0){

      r.alerta =
        `🟡 LIBERA ${r.uniAsig}`;

      r.color = "#fef9c3";

    } else if(r.unact === 0){

      r.alerta = "⚪ VACÍO";

      r.color = "#f3f4f6";

    } else {

      r.alerta = "🟢 DISPONIBLE";

      r.color = "#dcfce7";
    }

  });

  inventarioConsolidado.sort((a,b)=>
    ordenarUbicacion(
      a.ubicacion,
      b.ubicacion
    )
  );

  construirMultiUbicacion();
}


// =====================================
// 📦 MULTIUBICACION
// =====================================
function construirMultiUbicacion(){

  let mapa = {};

  inventarioConsolidado.forEach(r => {

    if(!mapa[r.codigo]){

      mapa[r.codigo] = {

        codigo:r.codigo,

        descripcion:r.descripcion,

        ubicaciones:new Set(),

        totalUnidades:0
      };
    }

    mapa[r.codigo]
      .ubicaciones
      .add(r.ubicacion);

    mapa[r.codigo]
      .totalUnidades += r.unact;
  });

  productosMultiUbicacion =
    Object.values(mapa)
    .map(r => {

      let cantidad =
        r.ubicaciones.size;

      return {

        codigo:r.codigo,

        descripcion:r.descripcion,

        cantUbicaciones:cantidad,

        ubicaciones:
          Array.from(r.ubicaciones),

        totalUnidades:r.totalUnidades,

        alerta:
          cantidad >= 5
          ? "🔴 CRÍTICO"
          : cantidad >= 3
          ? "🟡 DISPERSO"
          : "🟢 NORMAL"
      };
    })
    .filter(r => r.cantUbicaciones > 1);
}


// =====================================
// 📦 ABRIR INVENTARIO
// =====================================
function abrirInventario(){

  if(
    !Array.isArray(dataInventario) ||
    dataInventario.length === 0
  ){

    document.getElementById("modulo")
      .innerHTML =
      "⏳ Cargando inventario...";

    setTimeout(abrirInventario,500);

    return;
  }

  consolidarInventario();

  document.getElementById("modulo")
    .innerHTML = `

    <div class="panel">

      <h2>
        📦 Inventario
      </h2>

      <div class="botones">

        <button onclick="verInventarioGeneral()">
          📋 General
        </button>

        <button onclick="verPasillos()">
          🚶 Pasillos
        </button>

        <button onclick="verMultiUbicacion()">
          📦 Multiubicación
        </button>

      </div>

      <div id="vistaInventario"></div>

    </div>
  `;

  verInventarioGeneral();
}


// =====================================
// 📋 GENERAL
// =====================================
function verInventarioGeneral(){

  document.getElementById("vistaInventario")
    .innerHTML = `

    <div class="botones">

      <input
        id="buscaCodigoInv"
        placeholder="Código"
        onkeyup="filtrarInventarioPro()"
      >

      <input
        id="buscaDescInv"
        placeholder="Descripción"
        onkeyup="filtrarInventarioPro()"
      >

      <button onclick="setFiltro('todos')">
        Todo
      </button>

      <button onclick="setFiltro('sin')">
        🔴 Saturado
      </button>

      <button onclick="setFiltro('libera')">
        🟡 Libera
      </button>

      <button onclick="cambiarModo('UND')">
        UND
      </button>

      <button onclick="cambiarModo('BUL')">
        BUL
      </button>

    </div>

    <div id="kpisInventario"></div>

    <div id="tablaInventario"></div>

    <div id="modalDetalle"></div>
  `;

  window.filtroInventario = "todos";

  renderKpisInventario();

  filtrarInventarioPro();
}


// =====================================
// 🔘 CAMBIAR MODO
// =====================================
function cambiarModo(modo){

  modoVistaInventario = modo;

  filtrarInventarioPro();
}


// =====================================
// 🔍 FILTROS
// =====================================
function setFiltro(tipo){

  window.filtroInventario = tipo;

  filtrarInventarioPro();
}

function filtrarInventarioPro(){

  let codigo =
    document.getElementById("buscaCodigoInv")
    .value
    .toLowerCase();

  let desc =
    document.getElementById("buscaDescInv")
    .value
    .toLowerCase();

  let data =
    inventarioConsolidado.filter(r => {

      let pasaFiltro =
        window.filtroInventario === "todos" ||

        (
          window.filtroInventario === "sin" &&
          r.dispActualUnd <= 0
        ) ||

        (
          window.filtroInventario === "libera" &&
          r.uniAsig > 0
        );

      return (
        r.codigo.toLowerCase().includes(codigo) &&
        r.descripcion.toLowerCase().includes(desc) &&
        pasaFiltro
      );
    });

  renderTabla(data);
}


// =====================================
// 📊 KPIs
// =====================================
function renderKpisInventario(){

  let total =
    inventarioConsolidado.length;

  let disponibles =
    inventarioConsolidado
    .filter(r => r.dispActualUnd > 0)
    .length;

  let saturados =
    inventarioConsolidado
    .filter(r => r.dispActualUnd <= 0)
    .length;

  let libera =
    inventarioConsolidado
    .filter(r => r.uniAsig > 0)
    .length;

  let vacios =
    inventarioConsolidado
    .filter(r => r.unact === 0)
    .length;

  let futura =
    inventarioConsolidado
    .reduce((s,r)=>
      s + r.uniAsig,0
    );

  document.getElementById("kpisInventario")
    .innerHTML = `

    <div style="
      display:flex;
      gap:15px;
      flex-wrap:wrap;
      margin-bottom:15px;
    ">

      <div class="kpi-card">
        📦 TOTAL
        <h2>${total}</h2>
      </div>

      <div class="kpi-card">
        🟢 DISPONIBLES
        <h2>${disponibles}</h2>
      </div>

      <div class="kpi-card">
        🔴 SATURADAS
        <h2>${saturados}</h2>
      </div>

      <div class="kpi-card">
        🟡 LIBERA
        <h2>${libera}</h2>
      </div>

      <div class="kpi-card">
        ⚪ VACÍAS
        <h2>${vacios}</h2>
      </div>

      <div class="kpi-card">
        📈 FUTURO
        <h2>${futura}</h2>
      </div>

    </div>
  `;
}


// =====================================
// 🧱 TABLA PRINCIPAL
// =====================================
function renderTabla(data){

  let html = `

    <div style="
      max-height:70vh;
      overflow:auto;
      border:1px solid #ddd;
      border-radius:10px;
    ">

    <table style="
      border-collapse:collapse;
      width:100%;
    ">

      <tr style="
        position:sticky;
        top:0;
        background:white;
        z-index:100;
      ">

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>UBICACION</th>

        <th>UXB</th>

        <th>
          ${
            modoVistaInventario==="UND"
            ? "UND ACT"
            : "BUL ACT"
          }
        </th>

        <th>
          ${
            modoVistaInventario==="UND"
            ? "UND ASIG"
            : "BUL ASIG"
          }
        </th>

        <th>
          ${
            modoVistaInventario==="UND"
            ? "DISP ACT"
            : "DISP ACT BUL"
          }
        </th>

        <th>
          ${
            modoVistaInventario==="UND"
            ? "DISP FUT"
            : "DISP FUT BUL"
          }
        </th>

        <th>ALERTA</th>

        <th>DETALLE</th>

      </tr>
  `;

  data.forEach(r => {

    html += `

      <tr style="background:${r.color}">

        <td>${r.codigo}</td>

        <td>${r.descripcion}</td>

        <td>${r.ubicacion}</td>

        <td>${r.uxb}</td>

        <td>
          ${
            modoVistaInventario==="UND"
            ? r.unact
            : r.unactBul
          }
        </td>

        <td>
          ${
            modoVistaInventario==="UND"
            ? r.uniAsig
            : r.uniAsigBul
          }
        </td>

        <td>
          ${
            modoVistaInventario==="UND"
            ? r.dispActualUnd
            : r.dispActualBul
          }
        </td>

        <td>
          ${
            modoVistaInventario==="UND"
            ? r.dispFuturoUnd
            : r.dispFuturoBul
          }
        </td>

        <td>
          <b>${r.alerta}</b>
        </td>

        <td>

          <button
            onclick="verDetalle('${r.codigo}','${r.ubicacion}')"
          >
            👁
          </button>

        </td>

      </tr>
    `;
  });

  html += `
    </table>
    </div>
  `;

  document.getElementById("tablaInventario")
    .innerHTML = html;
}


// =====================================
// 👁 MODAL DETALLE
// =====================================
function verDetalle(codigo,ubicacion){

  let filas =
    dataInventario.filter(r => {

      return (
        String(r["PRODUCTO"] || "").trim()
        === codigo &&

        String(r["UBICACION"] || "").trim()
        === ubicacion
      );
    });

  let html = `

    <div style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.4);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:9999;
    ">

      <div style="
        background:white;
        width:80%;
        max-height:80vh;
        overflow:auto;
        border-radius:12px;
        padding:20px;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:15px;
        ">

          <h3>
            👁 DETALLE UBICACION
          </h3>

          <button onclick="cerrarModal()">
            ❌
          </button>

        </div>

        <table>

          <tr>

            <th>CODIGO</th>

            <th>DESCRIPCION</th>

            <th>FECHA EXP</th>

            <th>UNIDADES</th>

            <th>UBICACION</th>

          </tr>
  `;

  filas.forEach(r => {

    html += `

      <tr>

        <td>${r["PRODUCTO"]}</td>

        <td>${r["DESCRIPCION"]}</td>

        <td>
          ${
            r["FECHA_EXP"] ||
            r["FECHA"] ||
            "-"
          }
        </td>

        <td>${r["UNACT"]}</td>

        <td>${r["UBICACION"]}</td>

      </tr>
    `;
  });

  html += `
        </table>

      </div>

    </div>
  `;

  document.getElementById("modalDetalle")
    .innerHTML = html;
}

function cerrarModal(){

  document.getElementById("modalDetalle")
    .innerHTML = "";
}


// =====================================
// 🚶 PASILLOS
// =====================================
function verPasillos(){

  let mass =
    inventarioConsolidado.filter(r =>
      String(r.ubicacion || "")
      .startsWith("Mass-")
    );

  let mapa = {};

  mass.forEach(r => {

    let p =
      extraerPasillo(r.ubicacion);

    if(!mapa[p]) mapa[p] = [];

    mapa[p].push(r);
  });

  let html = "";

  Object.keys(mapa)
    .sort()
    .forEach(p => {

      let data =
        mapa[p].sort((a,b)=>
          ordenarUbicacion(
            a.ubicacion,
            b.ubicacion
          )
        );

      let sin =
        data.filter(r =>
          r.dispActualUnd <= 0
        ).length;

      let bajo =
        data.filter(r =>
          r.dispActualUnd > 0 &&
          r.dispActualUnd <= 3
        ).length;

      html += `

        <div style="margin-bottom:25px;">

          <h3>
            🚶 PASILLO ${p}
          </h3>

          <div style="margin-bottom:8px;">

            🔴 ${sin}

            &nbsp;

            🟡 ${bajo}

            &nbsp;

            📦 ${data.length}

          </div>

          ${crearTablaPasillo(data)}

        </div>
      `;
    });

  document.getElementById("vistaInventario")
    .innerHTML = html;
}


// =====================================
// 🧱 TABLA PASILLOS
// =====================================
function crearTablaPasillo(data){

  let html = `

    <div style="
      max-height:70vh;
      overflow:auto;
      border:1px solid #ddd;
      border-radius:10px;
    ">

    <table style="
      border-collapse:collapse;
      width:100%;
    ">

      <tr style="
        position:sticky;
        top:0;
        background:white;
        z-index:100;
      ">

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>UBICACION</th>

        <th>DISP</th>

      </tr>
  `;

  data.forEach(r => {

    html += `

      <tr style="background:${r.color}">

        <td>${r.codigo}</td>

        <td>${r.descripcion}</td>

        <td>${r.ubicacion}</td>

        <td>
          ${
            modoVistaInventario==="UND"
            ? r.dispActualUnd
            : r.dispActualBul
          }
        </td>

      </tr>
    `;
  });

  html += `
    </table>
    </div>
  `;

  return html;
}


// =====================================
// 📦 MULTIUBICACION
// =====================================
function verMultiUbicacion(){

  let html = `

    <div class="botones">

      <button onclick="exportarMultiExcel()">
        📥 Exportar Excel
      </button>

    </div>

    <div style="
      max-height:70vh;
      overflow:auto;
      border:1px solid #ddd;
      border-radius:10px;
    ">

    <table style="
      border-collapse:collapse;
      width:100%;
    ">

      <tr style="
        position:sticky;
        top:0;
        background:white;
        z-index:100;
      ">

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>CANT UBICACIONES</th>

        <th>UBICACIONES</th>

        <th>TOTAL UND</th>

        <th>ALERTA</th>

      </tr>
  `;

  productosMultiUbicacion.forEach(r => {

    html += `

      <tr>

        <td>${r.codigo}</td>

        <td>${r.descripcion}</td>

        <td>${r.cantUbicaciones}</td>

        <td>
          ${r.ubicaciones.join(" / ")}
        </td>

        <td>${r.totalUnidades}</td>

        <td>${r.alerta}</td>

      </tr>
    `;
  });

  html += `
    </table>
    </div>
  `;

  document.getElementById("vistaInventario")
    .innerHTML = html;
}


// =====================================
// 📥 EXPORTAR EXCEL
// =====================================
function exportarMultiExcel(){

  if(productosMultiUbicacion.length === 0){

    alert("No hay datos para exportar");

    return;
  }

  let html = `
    <table border="1">

      <tr>

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>UBICACION</th>

        <th>UNIDADES</th>

      </tr>
  `;

  productosMultiUbicacion.forEach(r => {

    r.ubicaciones.forEach(ubi => {

      let fila =
        inventarioConsolidado.find(x =>

          x.codigo === r.codigo &&

          x.ubicacion === ubi
        );

      if(!fila) return;

      html += `

        <tr>

          <td style="mso-number-format:'\\@';">
            ${r.codigo}
          </td>

          <td>
            ${r.descripcion}
          </td>

          <td>
            ${ubi}
          </td>

          <td>
            ${fila.unact}
          </td>

        </tr>
      `;
    });
  });

  html += "</table>";

  let blob = new Blob(

    [html],

    {
      type:"application/vnd.ms-excel"
    }
  );

  let a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "multiubicacion.xls";

  a.click();
}