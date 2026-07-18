import { createServer } from "http";
import { routes } from "./router";

const servidor = createServer(async (req, res) => {
  // Configurar CORS para permitir peticiones desde el cliente
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Manejar preflight requests (OPTIONS)
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  await routes(req, res);
});

servidor.listen(3000, () => {
  console.log("===========================================");
  console.log("Servidor iniciado");
  console.log("http://localhost:3000");
  console.log("===========================================");
});