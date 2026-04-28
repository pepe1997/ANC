// Usuarios
const usuarios = [
  { user: "admin", pass: "1234" },
  { user: "operador", pass: "1234" }
];

function login() {
  const u = document.getElementById("usuario").value;
  const p = document.getElementById("password").value;

  const valido = usuarios.find(x => x.user === u && x.pass === p);

  if (valido) {
    localStorage.setItem("usuario", u);
    window.location.href = "main.html";
  } else {
    document.getElementById("error").innerText = "Usuario o contraseña incorrecta";
  }
}