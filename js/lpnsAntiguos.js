// ===============================
// ⏳ LPNs ANTIGUOS (VERSIÓN PRO FINAL)
// ===============================

// ===============================
// 🌎 GLOBAL
// ===============================
let modoLpns = "UND";

// ===============================
// 💾 ESTADOS GUARDADOS
// ===============================
let estadosLpns = JSON.parse(
  localStorage.getItem("estadosLpns") || "{}"
);

// ===============================
// 💾 GUARDAR ESTADO
// ===============================
function guardarEstadoLpn(lpn,estado){

  estadosLpns[lpn] = estado;

  localStorage.setItem(
    "estadosLpns",
    JSON.stringify(estadosLpns)
  );

  filtrarLpnsAntiguos();
}

// ===============================
// 🔄 REINICIAR ESTADOS
// ===============================
function reiniciarEstadosLpns(){

  if(!confirm("¿Reiniciar todos los estados?")) return;

  estadosLpns = {};

  localStorage.removeItem("estadosLpns");

  filtrarLpnsAntiguos();
}

// ===============================
// 🔘 CAMBIAR MODO
// ===============================
function cambiarModoLpns(modo){

  modoLpns = modo;

  filtrarLpnsAntiguos();
}

// ===============================
function abrirLpnsAntiguos(){

  if(dataLPN.length === 0 || dataInventario.length === 0){

    document.getElementById("modulo").innerHTML =
      "⏳ Cargando datos...";

    setTimeout(abrirLpnsAntiguos,500);

    return;
  }

  document.getElementById("modulo").innerHTML = `

    <div class="panel">

      <h2>⏳ LPNs Antiguos</h2>

      <div class="botones">

        <input
          id="fLpn"
          placeholder="Buscar LPN"
          onkeyup="filtrarLpnsAntiguos()"
        >

        <input
          id="fCod"
          placeholder="Código"
          onkeyup="filtrarLpnsAntiguos()"
        >

        <input
          id="fDesc"
          placeholder="Descripción"
          onkeyup="filtrarLpnsAntiguos()"
        >

        <input
          id="fDias"
          type="number"
          value="0"
          onchange="filtrarLpnsAntiguos()"
        >

        <button onclick="setDias(3)">≥3</button>

        <button onclick="setDias(5)">≥5</button>

        <button onclick="setDias(7)">≥7</button>

        <button onclick="setDias(10)">≥10</button>

        <button onclick="cambiarModoLpns('UND')">
          UND
        </button>

        <button onclick="cambiarModoLpns('BUL')">
          BUL
        </button>

        <button onclick="reiniciarEstadosLpns()">
          🔄 Reiniciar Estados
        </button>

      </div>

      <div id="kpiLpns"></div>

      <div id="tablaAntiguos"></div>

    </div>
  `;

  construirMapaInventario();

  filtrarLpnsAntiguos();
}

// ===============================
// 🔥 MAPA INVENTARIO
// ===============================
let mapaInventario = {};

function construirMapaInventario(){

  mapaInventario = {};

  dataInventario.forEach(i => {

    let cod =
      String(i["PRODUCTO"] || "").trim();

    if(!mapaInventario[cod]){

      mapaInventario[cod] = [];
    }

    mapaInventario[cod].push(i);
  });
}

// ===============================
function setDias(n){

  document.getElementById("fDias").value = n;

  filtrarLpnsAntiguos();
}

// ===============================
// 🔥 FILTRAR
// ===============================
function filtrarLpnsAntiguos(){

  let flpn =
    document.getElementById("fLpn")
    .value
    .toLowerCase();

  let fcod =
    document.getElementById("fCod")
    .value
    .toLowerCase();

  let fdesc =
    document.getElementById("fDesc")
    .value
    .toLowerCase();

  let fdias =
    Number(
      document.getElementById("fDias")
      .value || 0
    );

  let base = dataLPN.filter(x => {

    let estado =
      String(x["ESTADO"] || "").trim();

    let ubi =
      String(x["UBICACION"] || "").trim();

    let validoEstado =
      estado === "Ubicado" ||
      estado === "Recibido";

    let validoUbi =
      ubi === "" ||
      ubi.startsWith("DROP-BUFR");

    if(!validoEstado || !validoUbi){
      return false;
    }

    let antig =
      Number(x["ANTIGUEDAD"] || 0);

    let lpn =
      String(x["LPN"] || "")
      .toLowerCase();

    let cod =
      String(x["CODIGO"] || "")
      .toLowerCase();

    let des =
      String(x["DESCRIPCION"] || "")
      .toLowerCase();

    return (

      antig >= fdias &&

      lpn.includes(flpn) &&

      cod.includes(fcod) &&

      des.includes(fdesc)
    );
  });

  // ==================================
  // 🔥 MÁS ANTIGUOS PRIMERO
  // ==================================
  base.sort((a,b)=>

    Number(b["ANTIGUEDAD"] || 0) -

    Number(a["ANTIGUEDAD"] || 0)
  );

  let paletero = [];

  let buffer = [];

  // ==================================
  // 📊 KPIs
  // ==================================
  let pendientes = 0;

  let revisando = 0;

  let hechos = 0;

  // ==================================
  // 🔥 RECORRER
  // ==================================
  base.forEach(r => {

    let codigo =
      String(r["CODIGO"] || "").trim();

    let activos =
      mapaInventario[codigo] || [];

    let ubicacionesSet =
      new Set();

    let disponibleUnd = 0;

    let disponibleBul = 0;

    // ==================================
    // 🔥 CONSOLIDAR UBICACIONES
    // ==================================
    let mapaUbis = {};

    activos.forEach(x => {

      let ubi =
        String(x["UBICACION"] || "")
        .trim();

      if(!ubi) return;

      ubicacionesSet.add(ubi);

      let unact =
        Number(x["UNACT"] || 0);

      let uniMax =
        Number(x["UNI_MAX"] || 0);

      let uxb =
        Number(x["UXB"] || 1);

      if(!mapaUbis[ubi]){

        mapaUbis[ubi] = {

          unact:0,

          uniMax,

          uxb
        };
      }

      mapaUbis[ubi].unact += unact;
    });

    // ==================================
    // 🔥 DISPONIBLE REAL
    // ==================================
    Object.values(mapaUbis)
    .forEach(u => {

      let dispUnd =
        Math.max(
          0,
          u.uniMax - u.unact
        );

      let dispBul =
        Number(
          (dispUnd / u.uxb)
          .toFixed(2)
        );

      disponibleUnd += dispUnd;

      disponibleBul += dispBul;
    });

    let ubicacionActiva =
      Array.from(ubicacionesSet)
      .sort(ordenarUbicacion)
      .join(" / ");

    if(!ubicacionActiva){

      ubicacionActiva =
        "SIN UBICACION ACTIVA";
    }

    // ==================================
    // 🟢 ESTADO
    // ==================================
    let estadoLpn =
      estadosLpns[r["LPN"]] ||
      "PENDIENTE";

    // ==================================
    // 📊 CONTADORES KPI
    // ==================================
    if(estadoLpn === "PENDIENTE"){
      pendientes++;
    }

    if(estadoLpn === "REVISANDO"){
      revisando++;
    }

    if(estadoLpn === "HECHO"){
      hechos++;
    }

    let fila = {

      fecha:
        r["FECHA"],

      antiguedad:
        Number(r["ANTIGUEDAD"] || 0),

      lpn:
        r["LPN"],

      codigo,

      desc:
        r["DESCRIPCION"],

      bultos:
        r["BULTOS"],

      ubicacion:
        r["UBICACION"] || "PALETERO",

      ubicacionActiva,

      disponibleUnd,

      disponibleBul,

      estadoLpn
    };

    if(r["UBICACION"] === ""){

      paletero.push(fila);

    } else {

      buffer.push(fila);
    }

  });

  // ==================================
  // 📈 AVANCE
  // ==================================
  let avance =
    base.length > 0

    ? (
      (hechos/base.length)*100
    ).toFixed(1)

    : 0;

  // ==================================
  // 📊 KPI
  // ==================================
  document.getElementById("kpiLpns")
    .innerHTML = `

    <div style="
      display:flex;
      gap:15px;
      flex-wrap:wrap;
      margin-bottom:15px;
    ">

      <div class="kpi-card">
        📊 TOTAL
        <h2>${base.length}</h2>
      </div>

      <div class="kpi-card">
        🔴 PALETERO
        <h2>${paletero.length}</h2>
      </div>

      <div class="kpi-card">
        🟡 BUFFER
        <h2>${buffer.length}</h2>
      </div>

      <div class="kpi-card">
        ⚪ PENDIENTE
        <h2>${pendientes}</h2>
      </div>

      <div class="kpi-card">
        🟡 REVISANDO
        <h2>${revisando}</h2>
      </div>

      <div class="kpi-card">
        🟢 HECHO
        <h2>${hechos}</h2>
      </div>

      <div class="kpi-card">
        📈 AVANCE
        <h2>${avance}%</h2>
      </div>

    </div>
  `;

  // ==================================
  // 🧾 TABLAS
  // ==================================
  let html = `

    <h3>
      🔴 PALETERO (CRÍTICO)
    </h3>

    ${crearTablaAntiguos(paletero)}

    <h3 style="margin-top:25px;">
      🟡 BUFFER
    </h3>

    ${crearTablaAntiguos(buffer)}
  `;

  document.getElementById("tablaAntiguos")
    .innerHTML = html;
}

// ===============================
// 🧾 TABLA
// ===============================
function crearTablaAntiguos(data){

  if(data.length === 0){

    return "<p>Sin registros</p>";
  }

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

        <th>ESTADO</th>

        <th>FECHA</th>

        <th>ANTIGÜEDAD</th>

        <th>LPN</th>

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>BULTOS</th>

        <th>UBICACION</th>

        <th>UBICACION ACTIVA</th>

        <th>
          ${
            modoLpns === "UND"
            ? "DISP UND"
            : "DISP BUL"
          }
        </th>

      </tr>
  `;

  data.forEach(r => {

    // ==================================
    // 🎨 COLOR
    // ==================================
    let color = "";

    if(r.estadoLpn === "HECHO"){

      color = "#d1fae5";

    } else if(
      r.estadoLpn === "REVISANDO"
    ){

      color = "#fef3c7";

    } else {

      color =

        r.antiguedad > 15
        ? "#fee2e2"

        : r.antiguedad >= 10
        ? "#fde68a"

        : r.antiguedad >= 7
        ? "#fef9c3"

        : "#dcfce7";
    }

    html += `

      <tr style="background:${color}">

        <td>

          <select
            onchange="
              guardarEstadoLpn(
                '${r.lpn}',
                this.value
              )
            "
            style="
              padding:4px;
              border-radius:6px;
              font-weight:bold;
            "
          >

            <option
              value="PENDIENTE"
              ${
                r.estadoLpn==="PENDIENTE"
                ? "selected"
                : ""
              }
            >
              🔴 Pendiente
            </option>

            <option
              value="REVISANDO"
              ${
                r.estadoLpn==="REVISANDO"
                ? "selected"
                : ""
              }
            >
              🟡 Revisando
            </option>

            <option
              value="HECHO"
              ${
                r.estadoLpn==="HECHO"
                ? "selected"
                : ""
              }
            >
              🟢 Hecho
            </option>

          </select>

        </td>

        <td>${r.fecha}</td>

        <td>
          <b>${r.antiguedad}</b>
        </td>

        <td>${r.lpn}</td>

        <td>${r.codigo}</td>

        <td>${r.desc}</td>

        <td>${r.bultos}</td>

        <td>${r.ubicacion}</td>

        <td>${r.ubicacionActiva}</td>

        <td>

          <b>

            ${
              modoLpns === "UND"

              ? r.disponibleUnd

              : r.disponibleBul
            }

          </b>

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