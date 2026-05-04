// ===============================
// ⏳ LPNs ANTIGUOS (VERSIÓN PRO FINAL)
// ===============================

function abrirLpnsAntiguos(){

  if(dataLPN.length === 0 || dataInventario.length === 0){
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirLpnsAntiguos,500);
    return;
  }

  document.getElementById("modulo").innerHTML = `
    <div class="panel">

      <h2>⏳ LPNs Antiguos</h2>

      <div class="botones">
        <input id="fLpn" placeholder="Buscar LPN" onkeyup="filtrarLpnsAntiguos()">
        <input id="fCod" placeholder="Código" onkeyup="filtrarLpnsAntiguos()">
        <input id="fDesc" placeholder="Descripción" onkeyup="filtrarLpnsAntiguos()">

        <input id="fDias" type="number" value="7"
          onchange="filtrarLpnsAntiguos()">

        <button onclick="setDias(3)">≥3</button>
        <button onclick="setDias(5)">≥5</button>
        <button onclick="setDias(7)">≥7</button>
        <button onclick="setDias(10)">≥10</button>
      </div>

      <div id="kpiLpns"></div>
      <div id="tablaAntiguos"></div>

    </div>
  `;

  construirMapaInventario(); // 🔥 optimización

  filtrarLpnsAntiguos();
}

// ===============================
// 🔥 MAPA INVENTARIO (RENDIMIENTO)
// ===============================
let mapaInventario = {};

function construirMapaInventario(){

  mapaInventario = {};

  dataInventario.forEach(i=>{
    let cod = String(i["PRODUCTO"] || "").trim();

    if(!mapaInventario[cod]) mapaInventario[cod] = [];

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

  let flpn  = document.getElementById("fLpn").value.toLowerCase();
  let fcod  = document.getElementById("fCod").value.toLowerCase();
  let fdesc = document.getElementById("fDesc").value.toLowerCase();
  let fdias = Number(document.getElementById("fDias").value || 0);

  let base = dataLPN.filter(x => {

    let estado = String(x["ESTADO"] || "").trim();
    let ubi    = String(x["UBICACION"] || "").trim();

    let validoEstado =
      estado === "Ubicado" ||
      estado === "Recibido";

    // 🔥 SOLO PALETERO + BUFFER
    let validoUbi =
      ubi === "" ||
      ubi.startsWith("DROP-BUFR");

    if(!validoEstado || !validoUbi) return false;

    let antig = Number(x["ANTIGUEDAD"] || 0);

    let lpn = String(x["LPN"] || "").toLowerCase();
    let cod = String(x["CODIGO"] || "").toLowerCase();
    let des = String(x["DESCRIPCION"] || "").toLowerCase();

    return (
      antig >= fdias && // 🔥 CORREGIDO
      lpn.includes(flpn) &&
      cod.includes(fcod) &&
      des.includes(fdesc)
    );
  });

  // 🔥 ORDEN: MÁS ANTIGUOS PRIMERO
  base.sort((a,b)=>
    Number(b["ANTIGUEDAD"]||0) - Number(a["ANTIGUEDAD"]||0)
  );

  let paletero = [];
  let buffer = [];

  base.forEach(r => {

    let codigo = String(r["CODIGO"] || "").trim();
    let activos = mapaInventario[codigo] || [];

    let ubicacionActiva = "SIN UBICACION ACTIVA";
    let disponible = 0;

    if(activos.length > 0){

      ubicacionActiva = activos.map(x => x["UBICACION"]).join(" / ");

      disponible = activos.reduce((s,x)=>
        s + Number(x["DISPONIBLE-BULTOS"] || 0),0
      );
    }

    let fila = {
      fecha: r["FECHA"],
      antiguedad: Number(r["ANTIGUEDAD"] || 0),
      lpn: r["LPN"],
      codigo,
      desc: r["DESCRIPCION"],
      bultos: r["BULTOS"],
      ubicacion: r["UBICACION"] || "PALETERO",
      ubicacionActiva,
      disponible
    };

    if(r["UBICACION"] === ""){
      paletero.push(fila);
    } else {
      buffer.push(fila);
    }

  });

  // ===============================
  // 📊 KPI
  // ===============================
  document.getElementById("kpiLpns").innerHTML = `
    <div style="margin-bottom:15px;">
      📊 Total: ${base.length} &nbsp;
      🔴 Paletero: ${paletero.length} &nbsp;
      🟡 Buffer: ${buffer.length}
    </div>
  `;

  // ===============================
  // 🧾 TABLAS
  // ===============================
  let html = `
    <h3>🔴 PALETERO (CRÍTICO)</h3>
    ${crearTablaAntiguos(paletero)}

    <h3 style="margin-top:25px;">🟡 BUFFER</h3>
    ${crearTablaAntiguos(buffer)}
  `;

  document.getElementById("tablaAntiguos").innerHTML = html;
}

// ===============================
// 🧾 TABLA
// ===============================
function crearTablaAntiguos(data){

  if(data.length === 0){
    return "<p>Sin registros</p>";
  }

  let html = `
    <table>
      <tr>
        <th>FECHA</th>
        <th>ANTIGÜEDAD</th>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS</th>
        <th>UBICACION</th>
        <th>UBICACION ACTIVA</th>
        <th>DISPONIBLE</th>
      </tr>
  `;

  data.forEach(r => {

    let color =
      r.antiguedad > 15 ? "#fee2e2" :
      r.antiguedad >= 10 ? "#fde68a" :
      r.antiguedad >= 7 ? "#fef9c3" :
      "#dcfce7";

    html += `
      <tr style="background:${color}">
        <td>${r.fecha}</td>
        <td><b>${r.antiguedad}</b></td>
        <td>${r.lpn}</td>
        <td>${r.codigo}</td>
        <td>${r.desc}</td>
        <td>${r.bultos}</td>
        <td>${r.ubicacion}</td>
        <td>${r.ubicacionActiva}</td>
        <td>${r.disponible}</td>
      </tr>
    `;
  });

  html += "</table>";

  return html;
}