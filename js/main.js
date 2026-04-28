const user = localStorage.getItem("usuario");

if (!user) {
  window.location.href = "index.html";
}

document.getElementById("user").innerText = user;

function logout() {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
}
function actualizacionTotal(){

  if(!confirm("¿Actualizar sistema completo?")) return;

  // borrar avances
  localStorage.clear();

  // recargar página
  location.reload();
}
function esQuiebre(codigo){

  if(typeof dataQuiebre === "undefined") return false;

  return dataQuiebre.some(x =>
    String(x["CODIGO"] || "").trim() === String(codigo).trim()
  );
}


cargarDatos();