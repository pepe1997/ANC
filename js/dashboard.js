let fechaSeleccionada = null;
let vistaDashboard = "asignacion";

function generarResumenGlobal(){

  if(!Array.isArray(dataPedido) || dataPedido.length === 0){
    return [];
  }

  const porFecha = {};

  dataPedido.forEach(row => {

    const fecha = String(row["FECHA_ORDEN"] || "").trim();
    if(!fecha) return;

    if(!porFecha[fecha]){
      porFecha[fecha] = {
        fecha: fecha,
        solicitado: 0,
        asignable:0,
        asignado: 0,
        noasig: 0,
        empacado: 0,
        enviado: 0
      };
    }

    const solicitado = numeroReal(row["BULTOS_REAL"]);
    const asignable = numeroReal(row["BULTOS_PEDIDO"]);
    const asignado   = numeroReal(row["BULTOS_ASIGNADOS"]);
    const empacado = numeroReal(row["BULTOS_EMPACADOS"]);
    const noasig     = numeroReal(row["BULTOS_NO_ASIGNADO"]);


    porFecha[fecha].solicitado += solicitado;
    porFecha[fecha].asignable += asignable;
    porFecha[fecha].asignado   += asignado;
    porFecha[fecha].noasig     += noasig;

    // 🔥 CALCULADOS (igual que tu dashboard)
    porFecha[fecha].empacado += empacado;
    porFecha[fecha].enviado  += numeroReal(row["BULTOS_ENVIADOS"] || 0);

  });

  let resumen = Object.values(porFecha);

  resumen.sort((a,b)=>{
    const pa = String(a.fecha).split("/").reverse().join("-");
    const pb = String(b.fecha).split("/").reverse().join("-");
    return new Date(pa) - new Date(pb);
  });

  return resumen;
}

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
      <button class="btn-export" onclick="reiniciarFiltro()">🔄 Reiniciar</button>
    </div>
  `;
}

// =============================
// KPI NO ASIGNADO (NUEVO)
// =============================
function calcularDistribucionNoAsignado(){

  let total = 0;
  let reserva = 0;
  let otras = 0;
  let sinStock = 0;

  dataPedido.forEach(p => {

    let cod = String(p["PRODUCTO"] || "").trim();
    let req = numeroReal(p["BULTOS_NO_ASIGNADO"] || 0);

    if(req <= 0) return;

    total += req;

    let lpns = dataLPN.filter(l =>
      String(l["CODIGO"] || "").trim() === cod
    );

    let utiles = lpns.filter(l => {

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

    let reservaOk = utiles.some(l =>
      String(l["UBICACION"] || "").startsWith("Mass-")
    );

    let otrasOk = utiles.some(l => {
      let u = String(l["UBICACION"] || "").trim();
      return (
        u.startsWith("DROP-BUFR") ||
        u.startsWith("RAMPA") ||
        u.startsWith("DROP-STOCK") ||
        u === ""
      );
    });

    if(utiles.length === 0){
      sinStock += req;
    }
    else if(reservaOk){
      reserva += req;
    }
    else{
      otras += req;
    }

  });

  return {
  total: numeroReal(total),
  reserva: numeroReal(reserva),
  otras: numeroReal(otras),
  sinStock: numeroReal(sinStock)};
}

// =============================
// TAB 1 ASIGNACION
// =============================
function renderAsignacion(){

  procesarDatos();
  let sinStockData = calcularSinStockData();
  let resumen = agruparDashboard();
  let totalGlobal = {pedido:0, asignable:0, asignado:0, empacado:0, enviado:0, noasig:0};

  resumen.forEach(r=>{
    totalGlobal.pedido += r.pedido;
    totalGlobal.asignable += r.asignable;
    totalGlobal.asignado += r.asignado;
    totalGlobal.empacado += r.empacado;
    totalGlobal.enviado += r.enviado;
    totalGlobal.noasig += r.noasig;
  });

  let resumenFiltrado = resumen;
  if(fechaSeleccionada){
    let f = resumen.find(r => r.fecha === fechaSeleccionada);
    if(f) resumenFiltrado = [f];
  }
  let total = {pedido:0, asignable:0, asignado:0, empacado:0, enviado:0, noasig:0};

    resumenFiltrado.forEach(r=>{
      total.pedido += r.pedido;
      total.asignable +=r.asignable;
      total.asignado += r.asignado;
      total.empacado += r.empacado;
      total.enviado += r.enviado;
      total.noasig += r.noasig;
    });

  let pAsig = porcentaje(total.asignado,total.asignable);
  let pEmp  = porcentaje(total.empacado,total.asignado);
  let pEnv  = porcentaje(total.enviado,total.empacado);

  let dist = calcularDistribucionNoAsignado();

    let reserva = dist.reserva;
    let otras = dist.otras;
    let sinStock = dist.sinStock;

  // =============================
  // HTML
  // =============================
  let html = `
  <div class="panel">

    <h2>📈 Dashboard</h2>
    ${menuDashboard()}

    <!-- KPIs -->
    <div class="kpi-big-grid">
      <div class="kpi-big"><span>📦 SOLICITADO</span><h1>${formatoDecimal(total.pedido)}</h1></div>
      <div class="kpi-big"><span>📦 ASIGNABLE</span><h1>${formatoDecimal(total.asignable)}</h1></div>
      <div class="kpi-big"><span>🟢 ASIGNADO</span><h1>${formatoDecimal(total.asignado)}</h1></div>
      <div class="kpi-big"><span>📦 EMPACADO</span><h1>${pEmp}%</h1></div>
      <div class="kpi-big"><span>🚚 ENVIADO</span><h1>${pEnv}%</h1></div>
      <div class="kpi-big"><span>🔴 NO ASIGNADO</span><h1>${formatoDecimal(total.noasig)}</h1></div>
    </div>

    <!-- TABLA + TENDENCIA + DONUT -->
    <div class="dashboard-grid">

      <!-- TABLA -->
      <div>
        <table>
          <tr>
              <th>Fecha</th>
              <th>Solicitado</th>
              <th>Asignable</th>
              <th>Asignado</th>
              <th>Empacado</th>
              <th>Enviado</th>
          </tr>
          ${resumen.map(r=>`
            <tr onclick="seleccionarFecha('${r.fecha}')" 
              style="cursor:pointer; ${fechaSeleccionada===r.fecha ? 'background:#dbeafe;' : ''}">
              <td>${r.fecha}</td>
              <td>${formato(r.pedido)}</td>
              <td>${formato(r.asignable)}</td>
              <td>${formato(r.asignado)}</td>
              <td>${formato(r.empacado)}</td>
              <td>${formato(r.enviado)}</td>
            </tr>
          `).join("")}
        </table>
      </div>

      <!-- TENDENCIA -->
      <div class="grafico-box">
        <canvas id="graficoTendencia"></canvas>
      </div>

      <!-- DONUT -->
      <div class="grafico-box">
        <canvas id="graficoAsignacion"></canvas>
      </div>

    </div>

    <!-- DISTRIBUCIÓN -->
    <h3 style="margin-top:25px;">📦 Distribución No Asignado</h3>

    <div class="distribucion-grid">

      <table class="tabla-mini">
        <tr><th>TIPO</th><th>BULTOS</th></tr>
        <tr><td>🟢 Reserva</td><td>${formato(reserva)}</td></tr>
        <tr><td>🟡 Otras</td><td>${formato(otras)}</td></tr>
        <tr><td>🔴 Sin Stock</td><td>${formato(sinStock)}</td></tr>
      </table>

      <div class="kpi-lateral">
        <div class="kpi-side green">
          <span>Reserva</span>
          <h2>${porcentaje(reserva, totalGlobal.noasig)}%</h2>
        </div>

        <div class="kpi-side yellow">
          <span>Ubicación en Piso</span>
          <h2>${porcentaje(otras, totalGlobal.noasig)}%</h2>
        </div>

        <div class="kpi-side ${sinStock > 0 ? 'red' : 'green'}">
          <span>Sin Stock</span>
          <h2>${porcentaje(sinStock, totalGlobal.noasig)}%</h2>
        </div>
      </div>

      <div class="grafico-box">
        <canvas id="graficoDistribucion"></canvas>
      </div>

    </div>

  </div>
  `;

  document.getElementById("modulo").innerHTML = html;

  // =============================
  // GRÁFICOS
  // =============================
  setTimeout(()=>{

    // DONUT
    new Chart(document.getElementById("graficoAsignacion"), {
      type: 'doughnut',
      data: {
        labels: ["Asignado","No Asignado"],
        datasets: [{
          data: [total.asignable, total.noasig],
          backgroundColor:["#22c55e","#ef4444"]
        }]
      },
      options:{
        plugins:{
          legend:{position:"bottom"},
          datalabels:{
            formatter:(v,ctx)=>{
              let data = ctx.chart.data.datasets[0].data;
              let total = data.reduce((a,b)=>a+b,0);
              let p = total ? ((v/total)*100) : 0;
              return p < 0.01 && p > 0 ? "0.01%" : p.toFixed(2) + "%";
            },
            color:"#000",
            backgroundColor:"#fff",
            borderRadius:6,
            padding:6,
            font:{weight:'bold',size:11},
            anchor:'center',
            align:'center'
          }
        },
        maintainAspectRatio:false
      },
      plugins:[ChartDataLabels]
    });

    // BARRAS
    new Chart(document.getElementById("graficoDistribucion"), {
      type: 'bar',
      data: {
        labels: ["Reserva","Otras","Sin Stock"],
        datasets: [{
          data: [reserva, otras, sinStock],
          backgroundColor:["#22c55e","#f59e0b","#ef4444"]
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,

        layout:{
          padding:{
            top:50
          }
        },

        plugins:{
          legend:{display:false},
          datalabels:{
            anchor:'end',
            align:'top',
            offset:8,

            formatter:(v,ctx)=>{
              let data = ctx.chart.data.datasets[0].data;
              let total = data.reduce((a,b)=>a+b,0);
              let p = total ? ((v/total)*100).toFixed(2) : 0;
              return p + "%";
            }
          }
        },

        scales:{
          y:{
            beginAtZero:true,
            suggestedMax: Math.max(reserva, otras, sinStock) * 1.25
          }
        }
      },
      plugins:[ChartDataLabels]
    });

    // TENDENCIA
    // 🔥 tamaños dinámicos según selección
    let puntosSize = resumen.map(r => 
      r.fecha === fechaSeleccionada ? 6 : 2
    );

    new Chart(document.getElementById("graficoTendencia"), {
      type: 'line',
      data: {
        labels: resumen.map(r=>{
          let p = r.fecha.split("/");
          let d = p[0];
          let m = p[1];

          const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

          return d + " " + meses[parseInt(m)-1];
        }),
        datasets: [
          {
            label: 'Asignado',
            data: resumen.map(r => r.asignado),
            borderColor: '#22c55e',
            tension: 0.4,

            // 🔥 RESALTADO
            pointRadius: puntosSize,
            pointBackgroundColor: puntosSize.map(s => s === 6 ? '#22c55e' : '#fff'),
            pointBorderWidth: puntosSize.map(s => s === 6 ? 3 : 1),
            pointHoverRadius: 8
          },
          {
            label: 'No Asignado',
            data: resumen.map(r => r.noasig),
            borderColor: '#ef4444',
            tension: 0.4,

            // 🔥 RESALTADO TAMBIÉN
            pointRadius: puntosSize,
            pointBackgroundColor: puntosSize.map(s => s === 6 ? '#ef4444' : '#fff'),
            pointBorderWidth: puntosSize.map(s => s === 6 ? 3 : 1),
            pointHoverRadius: 8
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom'} },
        scales:{ 
          y:{beginAtZero:true} 
        }
      }
    });

  },200);
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

  // =============================
  // HTML
  // =============================
  let html = `
    <div class="panel">
      <h2>📍 Puntos de Control</h2>
      ${menuDashboard()}

      <!-- 🔥 KPI RESUMEN -->
      <div class="kpi-big-grid">
        <div class="kpi-big">
          <span>Paletero</span>
          <h1>${Number(pPal).toFixed(2)}%</h1>
        </div>
        <div class="kpi-big">
          <span>Buffer</span>
          <h1 style="color:#f59e0b;">${Number(pBuf).toFixed(2)}%</h1>
        </div>
      </div>

      <div class="dashboard-grid">

        <!-- TABLA -->
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
        <td><b>${z}</b></td>
        <td>${d0}</td>
        <td>${d1}</td>
        <td>${d23}</td>
        <td>${d46}</td>
        <td style="color:#ef4444;font-weight:bold;">${d7}</td>
        <td><b>${arr.length}</b></td>
      </tr>
    `;
  });

  html += `
          </table>
        </div>

        <!-- GRAFICO -->
        <div class="grafico-box">
          <canvas id="graficoControl"></canvas>
        </div>

      </div>
    </div>
  `;

  // =============================
  // RENDER HTML
  // =============================
  document.getElementById("modulo").innerHTML = html;

  // =============================
  // GRAFICO DONUT
  // =============================
  requestAnimationFrame(()=>{

    let canvas = document.getElementById("graficoControl");
    if(!canvas) return;

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ["Paletero","Buffer"],
        datasets: [{
          data: [pal, buf],
          backgroundColor:["#22c55e","#f59e0b"]
        }]
      },
      options:{
        cutout:'65%', // 🔥 más moderno
        plugins:{
          legend:{position:"bottom"},
          tooltip:{
            callbacks:{
              label:(ctx)=>{
                let v = ctx.raw;
                let total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                let p = ((v/total)*100).toFixed(2);
                return `${v} (${p}%)`;
              }
            }
          },
          datalabels:{
            anchor:'center',
            align:'center',
            backgroundColor:'#000',
            borderRadius:6,
            padding:6,
            formatter:(v,ctx)=>{
              let data = ctx.chart.data.datasets[0].data;
              let total = data.reduce((a,b)=>a+b,0);
              let p = total ? ((v/total)*100).toFixed(2) : 0;
              return p + "%";
            },
            color:'#fff',
            font:{weight:'bold',size:11}
          }
        },
        maintainAspectRatio:false
      },
      plugins:[ChartDataLabels]
    });

  });

}

function renderUbicaciones(){

  let codigos = [...new Set(
    dataLPN.map(x =>
      limpiarCodigo(x["CODIGO"])
    ).filter(x => x !== "")
  )];

  let conUbi = [];
  let sinUbi = [];

  codigos.forEach(cod => {

    let existe = dataInventario.some(i =>
      limpiarCodigo(i["PRODUCTO"]) === cod
    );

    if(existe) conUbi.push(cod);
    else sinUbi.push(cod);

  });

  let total = conUbi.length + sinUbi.length;

  let pCon = porcentaje(conUbi.length,total);
  let pSin = porcentaje(sinUbi.length,total);

  let colorSin = pSin > 10 ? "#ef4444" : "#22c55e";

  // =============================
  // 🔥 DETALLE AGRUPADO PRO MAX
  // =============================
  let agrupado = {};

  dataLPN.forEach(x => {

    let cod = limpiarCodigo(x["CODIGO"]);
    if(!sinUbi.includes(cod)) return;

    if(!agrupado[cod]){
      agrupado[cod] = {
        codigo: x["CODIGO"],
        descripcion: x["DESCRIPCION"] || "",
        ubicaciones: [],
        bultos: 0
      };
    }

    agrupado[cod].bultos += Number(x["BULTOS"] || 0);

    agrupado[cod].ubicaciones.push({
      lpn: x["LPN"] || "",
      ubicacion: x["UBICACION"] || "-",
      bultos: x["BULTOS"] || 0
    });

  });

  let lista = Object.values(agrupado).sort((a,b)=> b.bultos - a.bultos);

  let filasDetalle = lista.map(x => `
    <tr onclick="verDetalleLPN('${x.codigo}')" style="cursor:pointer;">
      <td>${x.codigo}</td>
      <td>${x.descripcion}</td>
      <td>${x.ubicaciones.length}</td>
      <td style="color:${x.bultos > 50 ? '#ef4444' : '#111'}; font-weight:bold;">
        ${formatoDecimal(x.bultos)}
      </td>
    </tr>
  `).join("");

  // =============================
  // HTML
  // =============================
  let html = `
    <div class="panel">
      <h2>🧭 Ubicaciones</h2>
      ${menuDashboard()}

      <!-- KPI -->
      <div class="kpi-big-grid">
        <div class="kpi-big">
          <span>Con Ubicación</span>
          <h1>${Number(pCon).toFixed(2)}%</h1>
        </div>
        <div class="kpi-big">
          <span>Sin Ubicación</span>
          <h1 style="color:${colorSin};">${Number(pSin).toFixed(2)}%</h1>
        </div>
      </div>

      <div class="dashboard-grid">

        <!-- RESUMEN -->
        <div>
          <table>
            <tr>
              <th>TIPO</th>
              <th>CANTIDAD</th>
              <th>%</th>
            </tr>

            <tr>
              <td>🟢 Con Ubicación</td>
              <td>${conUbi.length}</td>
              <td><b>${Number(pCon).toFixed(2)}%</b></td>
            </tr>

            <tr>
              <td>🔴 Sin Ubicación</td>
              <td style="color:#ef4444;font-weight:bold;">
                ${sinUbi.length}
              </td>
              <td style="color:${colorSin};font-weight:bold;">
                ${Number(pSin).toFixed(2)}%
              </td>
            </tr>
          </table>

          <br>

          <button class="btn-export"
            onclick="exportarSinUbicacion()">
            ⬇ Exportar Sin Ubicación
          </button>

          <p style="margin-top:10px;font-size:13px;color:#64748b;">
            Total productos: <b>${total}</b>
          </p>
        </div>

        <!-- GRAFICO -->
        <div class="grafico-box">
          <canvas id="graficoUbicacion"></canvas>
        </div>

      </div>

      <!-- 🔥 DETALLE PRO -->
      <div style="margin-top:25px;">
        <h3>📋 Detalle sin ubicación (${sinUbi.length})</h3>

        <input 
          type="text" 
          id="buscadorDetalle"
          placeholder="Buscar producto..."
          style="width:100%;padding:8px;margin-bottom:10px;border-radius:8px;border:1px solid #ccc;"
          onkeyup="filtrarDetalle()"
        >

        <div style="max-height:300px; overflow-y:auto;">
          <table id="tablaDetalle">
            <tr>
              <th>PRODUCTO</th>
              <th>DESCRIPCIÓN</th>
              <th>LPNs</th>
              <th>BULTOS</th>
            </tr>

            ${filasDetalle || `
              <tr>
                <td colspan="4" style="text-align:center;color:#64748b;">
                  Sin registros
                </td>
              </tr>
            `}
          </table>
        </div>
      </div>

    </div>
  `;

  document.getElementById("modulo").innerHTML = html;

  window.sinUbicacionExport = [...sinUbi];

  // =============================
  // GRAFICO
  // =============================
  requestAnimationFrame(()=>{

    let canvas = document.getElementById("graficoUbicacion");
    if(!canvas) return;

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ["Con ubicación","Sin ubicación"],
        datasets: [{
          data: [conUbi.length, sinUbi.length],
          backgroundColor:["#22c55e","#ef4444"]
        }]
      },
      options:{
        cutout:'65%',
        plugins:{
          legend:{position:"bottom"},
          tooltip:{
            callbacks:{
              label:(ctx)=>{
                let v = ctx.raw;
                let total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                let p = ((v/total)*100).toFixed(2);
                return `${v} (${p}%)`;
              }
            }
          },
          datalabels:{
            anchor:'center',
            align:'center',
            backgroundColor:'#000',
            borderRadius:6,
            padding:6,
            formatter:(v,ctx)=>{
              let data = ctx.chart.data.datasets[0].data;
              let total = data.reduce((a,b)=>a+b,0);
              let p = total ? ((v/total)*100).toFixed(2) : 0;
              return p + "%";
            },
            color:'#fff',
            font:{weight:'bold',size:11}
          }
        },
        maintainAspectRatio:false
      },
      plugins:[ChartDataLabels]
    });

  });

}
// =============================
// EXPORTAR SIN UBICACION
// =============================
function exportarSinUbicacion(){

  let codigos = window.sinUbicacionExport || [];

  if(codigos.length === 0){
    alert("No hay datos para exportar");
    return;
  }

  let html = `
    <table border="1">
      <tr>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
      </tr>
  `;

  codigos.forEach(cod => {

    let fila = dataLPN.find(x =>
      limpiarCodigo(x["CODIGO"]) === limpiarCodigo(cod)
    );

    let desc = fila ? (fila["DESCRIPCION"] || "") : "";

    html += `
      <tr>
        <td style="mso-number-format:'\\@';">${cod}</td>
        <td>${desc}</td>
      </tr>
    `;
  });

  html += "</table>";

  let blob = new Blob(
    [html],
    { type:"application/vnd.ms-excel" }
  );

  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sin_ubicacion.xls";
  a.click();
}
function filtrarDetalle(){

  let input = document.getElementById("buscadorDetalle").value.toLowerCase();
  let filas = document.querySelectorAll("#tablaDetalle tr");

  filas.forEach((fila,i)=>{
    if(i === 0) return;
    let texto = fila.innerText.toLowerCase();
    fila.style.display = texto.includes(input) ? "" : "none";
  });
}

function verDetalleLPN(codigo){

  let detalle = dataLPN.filter(x =>
    limpiarCodigo(x["CODIGO"]) === codigo
  );

  let html = `
    <div class="panel">
      <h2>📦 Detalle LPN - ${codigo}</h2>

      <table>
        <tr>
          <th>LPN</th>
          <th>UBICACIÓN</th>
          <th>BULTOS</th>
        </tr>

        ${detalle.map(x => `
          <tr>
            <td>${x["LPN"]}</td>
            <td>${x["UBICACION"] || "-"}</td>
            <td>${formatoDecimal(x["BULTOS"])}</td>
          </tr>
        `).join("")}
      </table>

      <br>
      <button onclick="renderUbicaciones()">⬅ Volver</button>
    </div>
  `;

  document.getElementById("modulo").innerHTML = html;
}

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
        fecha,pedido:0,asignable:0,asignado:0,empacado:0,enviado:0,noasig:0
      };
    }

    mapa[fecha].pedido += numero(p["BULTOS_REAL"]);
    mapa[fecha].asignable += numero(p["BULTOS_PEDIDO"] || 0);
    mapa[fecha].asignado += numero(p["BULTOS_ASIGNADOS"]);
    mapa[fecha].empacado += numero(p["BULTOS_EMPACADOS"]);
    mapa[fecha].enviado += numero(p["BULTOS_ENVIADOS"]);
    mapa[fecha].noasig += numero(p["BULTOS_NO_ASIGNADO"]);
  });

  return Object.values(mapa);
}

function numero(v){
  let txt = String(v || "").trim();
  if(txt === "") return 0;
  txt = txt.replace(",", ".");
  let n = parseFloat(txt);
  return isNaN(n) ? 0 : n;
}
function formatoDecimal(v){
  return Number(v).toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function porcentaje(a,b){
  if(b===0) return "0.00";
  return ((a/b)*100).toFixed(2);
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

function reiniciarFiltro(){
  fechaSeleccionada = null;
  abrirDashboard();
}
function numeroReal(v){
  if(v === null || v === undefined || v === "") return 0;

  let n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}
