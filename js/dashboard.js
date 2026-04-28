let fechaSeleccionada = null;
let vistaDashboard = "asignacion";

// =============================
// ABRIR DASHBOARD
// =============================
function abrirDashboard(){

  if(dataPedido.length === 0){
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirDashboard,1000);
    return;
  }

  if(vistaDashboard === "asignacion") renderAsignacion();
  if(vistaDashboard === "control") renderControl();
  if(vistaDashboard === "ubicaciones") renderUbicaciones();
}

// =============================
// MENU SUPERIOR
// =============================
function menuDashboard(){
  return `
    <div class="botones" style="margin-bottom:15px;">
      <button class="btn-export" onclick="vistaDashboard='asignacion';abrirDashboard()">📈 Asignación</button>
      <button class="btn-export" onclick="vistaDashboard='control';abrirDashboard()">📍 Control</button>
      <button class="btn-export" onclick="vistaDashboard='ubicaciones';abrirDashboard()">🧭 Ubicaciones</button>
      <button class="btn-export" onclick="descargarImagen()">🖼 Imagen</button>
    </div>
  `;
}

// =============================
// TAB 1 ASIGNACION
// =============================
function renderAsignacion(){

  let resumen = agruparDashboard();

  let datosMostrar = fechaSeleccionada
    ? resumen.filter(x => x.fecha === fechaSeleccionada)
    : resumen;

  let total = {
    pedido:0, asignado:0, empacado:0, enviado:0, noasig:0
  };

  datosMostrar.forEach(r=>{
    total.pedido += r.pedido;
    total.asignado += r.asignado;
    total.empacado += r.empacado;
    total.enviado += r.enviado;
    total.noasig += r.noasig;
  });

  let pAsig = total.noasig === 0 ? 100 : porcentaje(total.asignado,total.pedido);
  let pEmp  = porcentaje(total.empacado,total.pedido);
  let pEnv  = porcentaje(total.enviado,total.pedido);

  let donut = `conic-gradient(
    #22c55e 0% ${pAsig}%,
    #ef4444 ${pAsig}% 100%
  )`;

  let html = `
    <div class="panel">
      <h2>📈 Dashboard Pedidos</h2>
      ${menuDashboard()}

      <div class="kpi-grid">

        <div class="kpi-card">
          <div class="kpi-title">📦 Solicitado</div>
          <div class="kpi-value">${formato(total.pedido)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">🟢 Asignado</div>
          <div class="kpi-value">${pAsig}%</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">📦 Empacado</div>
          <div class="kpi-value">${pEmp}%</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">🚚 Enviado</div>
          <div class="kpi-value">${pEnv}%</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">🔴 No Asignado</div>
          <div class="kpi-value">${formato(total.noasig)}</div>
        </div>

      </div>

      <div class="dashboard-grid">

        <div>
          <button class="btn-export" onclick="fechaSeleccionada=null;abrirDashboard()">🔄 Ver Todo</button>

          <table>
            <tr>
              <th>Fecha</th>
              <th>Solicitado</th>
              <th>Asignado</th>
              <th>Empacado</th>
              <th>Enviado</th>
            </tr>
  `;

  resumen.forEach(r=>{

    let fondo = r.fecha === fechaSeleccionada ? "#bbf7d0" : "";

    html += `
      <tr style="cursor:pointer;background:${fondo}"
          onclick="seleccionarFecha('${r.fecha}')">
        <td>${r.fecha}</td>
        <td>${formato(r.pedido)}</td>
        <td>${formato(r.asignado)}</td>
        <td>${formato(r.empacado)}</td>
        <td>${formato(r.enviado)}</td>
      </tr>
    `;
  });

  html += `
          </table>
        </div>

        <div class="center">
          <h3>🎯 Asignación</h3>
          <div class="donut" style="background:${donut};"></div>
          <p>${pAsig}% asignado</p>
        </div>

      </div>
    </div>
  `;

  document.getElementById("modulo").innerHTML = html;
}

// =============================
// TAB 2 PUNTOS DE CONTROL
// =============================
function renderControl(){

  let hoy = new Date();

  let data = dataLPN.filter(x => {

    let estado = String(x["ESTADO"] || "").trim();
    let ubi = String(x["UBICACION"] || "").trim();

    return (
      (estado === "Ubicado" || estado === "Recibido") &&
      (ubi === "" || ubi.startsWith("DROP-BUFR-"))
    );
  });

  let zonas = {
    PALETERO: [],
    BUFFER: []
  };

  data.forEach(x => {

    let ubi = String(x["UBICACION"] || "").trim();
    let dias = calcularDias(x["FECHA"], hoy);

    if(ubi === "") zonas.PALETERO.push(dias);
    else zonas.BUFFER.push(dias);
  });

  let pal = zonas.PALETERO.length;
  let buf = zonas.BUFFER.length;
  let total = pal + buf;

  let pPal = porcentaje(pal,total);
  let pBuf = porcentaje(buf,total);

  let pie = `
    conic-gradient(
      #22c55e 0% ${pPal}%,
      #f59e0b ${pPal}% 100%
    )
  `;

  let html = `
    <div class="panel">
      <h2>📍 Puntos de Control</h2>
      ${menuDashboard()}

      <div class="dashboard-grid">

        <div>
          <table>
            <tr>
              <th>ZONA</th>
              <th>0</th>
              <th>1</th>
              <th>2-3</th>
              <th>4-6</th>
              <th>+7</th>
              <th>TOTAL</th>
            </tr>
  `;

  Object.keys(zonas).forEach(z => {

    let arr = zonas[z];

    let d0 = arr.filter(x => x===0).length;
    let d1 = arr.filter(x => x===1).length;
    let d23 = arr.filter(x => x>=2 && x<=3).length;
    let d46 = arr.filter(x => x>=4 && x<=6).length;
    let d7 = arr.filter(x => x>=7).length;

    html += `
      <tr>
        <td>${z}</td>
        <td>${d0}</td>
        <td>${d1}</td>
        <td>${d23}</td>
        <td>${d46}</td>
        <td style="color:red;font-weight:bold;">${d7}</td>
        <td>${arr.length}</td>
      </tr>
    `;
  });

  html += `
          </table>
        </div>

        <div class="center">
          <h3>🥧 Distribución</h3>
          <div class="donut" style="background:${pie};"></div>
          <p>🟢 ${pPal}% Paletero</p>
          <p>🟠 ${pBuf}% Buffer</p>
        </div>

      </div>
    </div>
  `;

  document.getElementById("modulo").innerHTML = html;
}

// =============================
// TAB 3 UBICACIONES
// =============================
function renderUbicaciones(){

  let codigos = [...new Set(
    dataLPN.map(x => String(x["CODIGO"] || "").trim()).filter(x=>x!=="")
  )];

  let conUbi = 0;
  let sinUbi = 0;

  codigos.forEach(cod => {

    let existe = dataInventario.some(i =>
      String(i["PRODUCTO"] || "").trim() === cod
    );

    if(existe) conUbi++;
    else sinUbi++;
  });

  let total = conUbi + sinUbi;

  let pCon = porcentaje(conUbi,total);
  let pSin = porcentaje(sinUbi,total);

  let pie = `
    conic-gradient(
      #22c55e 0% ${pCon}%,
      #ef4444 ${pCon}% 100%
    )
  `;

  let html = `
    <div class="panel">
      <h2>🧭 Ubicaciones</h2>
      ${menuDashboard()}

      <div class="dashboard-grid">

        <div>
          <table>
            <tr>
              <th>TIPO</th>
              <th>CANTIDAD</th>
              <th>%</th>
            </tr>
            <tr>
              <td>Con Ubicación</td>
              <td>${conUbi}</td>
              <td>${pCon}%</td>
            </tr>
            <tr>
              <td>Sin Ubicación</td>
              <td>${sinUbi}</td>
              <td>${pSin}%</td>
            </tr>
          </table>

          <br>

          <button class="btn-export" onclick="exportarSinUbicacion()">
            ⬇ Exportar Sin Ubicación
          </button>
        </div>

        <div class="center">
          <h3>🥧 Cobertura</h3>
          <div class="donut" style="background:${pie};"></div>
          <p>🟢 ${pCon}% Con ubicación</p>
          <p>🔴 ${pSin}% Sin ubicación</p>
        </div>

      </div>
    </div>
  `;

  document.getElementById("modulo").innerHTML = html;
}
// =============================
// EXPORTAR SIN UBICACION
// =============================
function exportarSinUbicacion(){

  let codigos = window.sinUbicacionExport || [];

  let html = `
    <table border="1">
      <tr>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
      </tr>
  `;

  codigos.forEach(cod => {

    let fila = dataLPN.find(x =>
      String(x["CODIGO"] || "").trim() === cod
    );

    let desc = fila ? fila["DESCRIPCION"] : "";

    html += `
      <tr>
        <td>${cod}</td>
        <td>${desc}</td>
      </tr>
    `;
  });

  html += "</table>";

  let blob = new Blob([html], {
    type:"application/vnd.ms-excel"
  });

  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sin_ubicacion.xls";
  a.click();
}

// =============================
// FUNCIONES BASE
// =============================
function seleccionarFecha(fecha){
  fechaSeleccionada = fecha;
  abrirDashboard();
}

function agruparDashboard(){

  let mapa = {};

  dataPedido.forEach(p => {

    let fecha = String(p["FECHA_ORDEN"] || "").trim();
    if(fecha === "") fecha = "(en blanco)";

    if(!mapa[fecha]){
      mapa[fecha] = {
        fecha,pedido:0,asignado:0,empacado:0,enviado:0,noasig:0
      };
    }

    mapa[fecha].pedido += numero(p["BULTOS_REAL"]);
    mapa[fecha].asignado += numero(p["BULTOS_ASIGNADOS"]);
    mapa[fecha].empacado += numero(p["BULTOS_EMPACADOS"]);
    mapa[fecha].enviado += numero(p["BULTOS_ENVIADOS"]);
    mapa[fecha].noasig += numero(p["BULTOS_NO_ASIGNADO"]);
  });

  return Object.values(mapa);
}

function numero(v){
  let n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function porcentaje(a,b){
  if(b===0) return 0;
  return Math.round((a/b)*100);
}

function formato(n){
  return Number(n).toLocaleString("es-PE",{
    minimumFractionDigits:1,
    maximumFractionDigits:1
  });
}

function calcularDias(fechaTexto,hoy){

  let p = String(fechaTexto).split("/");
  if(p.length !== 3) return 0;

  let fecha = new Date(p[2], p[1]-1, p[0]);
  let diff = hoy - fecha;

  return Math.floor(diff / (1000*60*60*24));
}

function descargarImagen(){
  html2canvas(document.getElementById("modulo")).then(canvas => {
    let a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "dashboard.png";
    a.click();
  });
}