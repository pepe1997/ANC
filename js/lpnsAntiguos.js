// ===== LPNS ANTIGUOS =====

function abrirLpnsAntiguos(){

  if(dataLPN.length === 0 || dataInventario.length === 0){
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirLpnsAntiguos,1000);
    return;
  }

  let html = `
    <div class="panel">

      <h2>⏳ LPNs Antiguos</h2>

      <div class="botones">
        <input id="fLpn" placeholder="Buscar LPN" onkeyup="filtrarLpnsAntiguos()">
        <input id="fCod" placeholder="Buscar Código" onkeyup="filtrarLpnsAntiguos()">
        <input id="fDesc" placeholder="Buscar Descripción" onkeyup="filtrarLpnsAntiguos()">
        <input id="fDias" type="number" placeholder="Días" value="7"
          onkeyup="filtrarLpnsAntiguos()"
          onchange="filtrarLpnsAntiguos()">
      </div>

      <div id="tablaAntiguos"></div>

    </div>
  `;

  document.getElementById("modulo").innerHTML = html;

  filtrarLpnsAntiguos();
}

// ===== FILTRAR =====
function filtrarLpnsAntiguos(){

  let flpn  = document.getElementById("fLpn").value.toLowerCase();
  let fcod  = document.getElementById("fCod").value.toLowerCase();
  let fdesc = document.getElementById("fDesc").value.toLowerCase();
  let fdias = Number(document.getElementById("fDias").value || 0);

  let hoy = new Date();

  let data = dataLPN.filter(x => {

    let estado = String(x["ESTADO"] || "").trim();
    let ubi    = String(x["UBICACION"] || "").trim();

    let validoEstado =
      estado === "Ubicado" ||
      estado === "Recibido";

    let validoUbi =
      ubi === "" ||
      ubi.startsWith("DROP-BUFR-");

    if(!validoEstado || !validoUbi) return false;

    let fechaTxt = String(x["FECHA"] || "").trim();
    let dias = calcularDias(fechaTxt, hoy);

    let lpn = String(x["LPN"] || "").toLowerCase();
    let cod = String(x["CODIGO"] || "").toLowerCase();
    let des = String(x["DESCRIPCION"] || "").toLowerCase();

    return (
      dias === fdias &&
      lpn.includes(flpn) &&
      cod.includes(fcod) &&
      des.includes(fdesc)
    );
  });

  // ordenar por más antiguos primero
  data.sort((a,b)=>{
    return calcularDias(b["FECHA"],hoy) - calcularDias(a["FECHA"],hoy);
  });

  let conUbicacion = [];
  let sinUbicacion = [];

  data.forEach(r => {

    let codigo = String(r["CODIGO"] || "").trim();

    let activos = dataInventario.filter(i =>
      String(i["PRODUCTO"] || "").trim() === codigo
    );

    let fila = {
      fecha: r["FECHA"],
      dias: calcularDias(r["FECHA"], hoy),
      lpn: r["LPN"],
      codigo: codigo,
      desc: r["DESCRIPCION"],
      bultos: r["BULTOS"]
    };

    if(activos.length > 0){

      fila.ubicacion = activos.map(x => x["UBICACION"]).join(" / ");
      fila.disponible = activos.reduce((s,x)=>{
        let v = String(x["DISPONIBLE-BULTOS"] || "0").trim();
        let n = parseFloat(v);
        if(isNaN(n)) n = 0;
        return s + n;
        },0);

      conUbicacion.push(fila);

    } else {

      fila.ubicacion = "SIN UBICACION";
      fila.disponible = 0;

      sinUbicacion.push(fila);
    }

  });

  let html = `
    <h3>🟢 CON UBICACION ACTIVA</h3>
    ${crearTablaAntiguos(conUbicacion)}

    <h3 style="margin-top:30px;">🔴 SIN UBICACION ACTIVA</h3>
    ${crearTablaAntiguos(sinUbicacion)}
  `;

  document.getElementById("tablaAntiguos").innerHTML = html;
}

// ===== TABLA =====
function crearTablaAntiguos(data){

  let html = `
    <table>
      <tr>
        <th>FECHA ANT</th>
        <th>DÍAS</th>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS</th>
        <th>UBICACION ACTIVO</th>
        <th>DISPONIBLE</th>
      </tr>
  `;

  data.forEach(r => {

    html += `
      <tr>
        <td>${r.fecha}</td>
        <td>${r.dias}</td>
        <td>${r.lpn}</td>
        <td>${r.codigo}</td>
        <td>${r.desc}</td>
        <td>${r.bultos}</td>
        <td>${r.ubicacion}</td>
        <td>${r.disponible}</td>
      </tr>
    `;
  });

  html += "</table>";

  return html;
}

// ===== CALCULAR DIAS =====
function calcularDias(fechaTexto,hoy){

  let p = String(fechaTexto).split("/");

  if(p.length !== 3) return 0;

  let fecha = new Date(p[2], p[1]-1, p[0]);

  let diff = hoy - fecha;

  return Math.floor(diff / (1000*60*60*24));
}