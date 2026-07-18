import { IncomingMessage, ServerResponse } from "http";
import { Usuario } from "../models/usuario";
import { UsuarioService } from "../services/usuarioService";

const usuarioService = new UsuarioService();


 // Extrae el ID de la URL para rutas como /usuarios/:id 

function extraerIdDeUrl(url: string): number | null {
  const partes = url.split("/");
  const idStr = partes[partes.length - 1];
  const id = parseInt(idStr, 10);
  return isNaN(id) ? null : id;
}


 // Lee y parsea el body de la request

async function leerBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      // Limitar tamaño del body (seguridad)
      if (body.length > 1e6) { // 1MB máximo
        reject(new Error("Body demasiado grande"));
      }
    });
    
    req.on("end", () => {
      try {
        const datos = body.trim() === "" ? {} : JSON.parse(body);
        resolve(datos);
      } catch (error) {
        reject(new Error("JSON mal formado en el body"));
      }
    });
    
    req.on("error", (error) => {
      reject(error);
    });
  });
}


 // Valida que un usuario tenga los campos requeridos

function validarUsuario(datos: Partial<Usuario>): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  
  if (!datos.nombre || typeof datos.nombre !== "string" || datos.nombre.trim().length === 0) {
    errores.push("El campo 'nombre' es requerido y debe ser un string no vacío");
  }
  
  if (datos.edad === undefined || datos.edad === null) {
    errores.push("El campo 'edad' es requerido");
  } else if (typeof datos.edad !== "number" || datos.edad < 0) {
    errores.push("El campo 'edad' debe ser un número mayor o igual a 0");
  }
  
  if (datos.correo && typeof datos.correo !== "string") {
    errores.push("El campo 'correo' debe ser un string");
  } else if (datos.correo && !datos.correo.includes("@")) {
    errores.push("El campo 'correo' debe tener un formato válido");
  }
  
  // Validar rol si existe
  if (datos.rol && !["ADMIN", "USUARIO"].includes(datos.rol)) {
    errores.push("El campo 'rol' debe ser 'ADMIN' o 'USUARIO'");
  }
  
  // Validar estado si existe
  if (datos.estado && !["ACTIVO", "INACTIVO"].includes(datos.estado)) {
    errores.push("El campo 'estado' debe ser 'ACTIVO' o 'INACTIVO'");
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

 // Envía una respuesta JSON con el código de estado especificado

function enviarRespuesta(
  res: ServerResponse,
  codigo: number,
  datos: unknown
): void {
  res.writeHead(codigo, { "Content-Type": "application/json" });
  res.end(JSON.stringify(datos, null, 2));
}


 // Envía una respuesta de error estandarizada

function enviarError(
  res: ServerResponse,
  codigo: number,
  mensaje: string,
  detalles?: string[]
): void {
  enviarRespuesta(res, codigo, {
    error: true,
    mensaje,
    detalles: detalles || [],
    timestamp: new Date().toISOString(),
  });
}

export async function routes(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? "/";
  const metodo = req.method ?? "GET";
  
  console.log(`[${metodo}] ${url}`);

  try {
    // Ruta: GET /usuarios - Listar todos los usuarios

    if (metodo === "GET" && url === "/usuarios") {
      const usuarios = await usuarioService.obtenerTodosLosUsuarios();
      enviarRespuesta(res, 200, {
        exito: true,
        total: usuarios.length,
        datos: usuarios,
      });
      return;
    }

    // Ruta: GET /usuarios/:id - Obtener usuario por ID

    if (metodo === "GET" && url.startsWith("/usuarios/")) {
      const id = extraerIdDeUrl(url);
      
      if (id === null) {
        enviarError(res, 400, "ID de usuario inválido", ["El ID debe ser un número"]);
        return;
      }
      
      const usuario = await usuarioService.obtenerUsuarioPorId(id);
      
      if (!usuario) {
        enviarError(res, 404, "Usuario no encontrado", [`No existe usuario con ID ${id}`]);
        return;
      }
      
      enviarRespuesta(res, 200, {
        exito: true,
        datos: usuario,
      });
      return;
    }

    // Ruta: POST /usuarios - Crear nuevo usuario

    if (metodo === "POST" && url === "/usuarios") {
      const datos = await leerBody(req);
      
      // Validar que sea un objeto
      if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        enviarError(res, 400, "Datos inválidos", ["El body debe ser un objeto JSON"]);
        return;
      }
      
      // Validar campos del usuario
      const validacion = validarUsuario(datos as Partial<Usuario>);
      if (!validacion.valido) {
        enviarError(res, 400, "Validación fallida", validacion.errores);
        return;
      }
      
      // Crear usuario con valores por defecto
      const nuevoUsuario: Usuario = {
        id: Date.now(), // ID único basado en timestamp
        nombre: (datos as any).nombre.trim(),
        edad: (datos as any).edad,
        correo: (datos as any).correo || "",
        rol: (datos as any).rol || "USUARIO",
        estado: (datos as any).estado || "ACTIVO",
      };
      
      const usuarioCreado = await usuarioService.crearUsuario(nuevoUsuario);
      enviarRespuesta(res, 201, {
        exito: true,
        mensaje: "Usuario creado exitosamente",
        datos: usuarioCreado,
      });
      return;
    }

    // Ruta: PUT /usuarios/:id - Actualizar usuario existente

    if (metodo === "PUT" && url.startsWith("/usuarios/")) {
      const id = extraerIdDeUrl(url);
      
      if (id === null) {
        enviarError(res, 400, "ID de usuario inválido", ["El ID debe ser un número"]);
        return;
      }
      
      const datos = await leerBody(req);
      
      if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        enviarError(res, 400, "Datos inválidos", ["El body debe ser un objeto JSON"]);
        return;
      }
      
      // Validar campos (permitir campos parciales)
      const validacion = validarUsuario(datos as Partial<Usuario>);
      if (!validacion.valido) {
        enviarError(res, 400, "Validación fallida", validacion.errores);
        return;
      }
      
      // Verificar que el usuario existe
      const usuarioExistente = await usuarioService.obtenerUsuarioPorId(id);
      if (!usuarioExistente) {
        enviarError(res, 404, "Usuario no encontrado", [`No existe usuario con ID ${id}`]);
        return;
      }
      
      // Actualizar solo los campos proporcionados
      const usuarioActualizado: Usuario = {
        ...usuarioExistente,
        ...datos,
        id, // Mantener el mismo ID
        nombre: (datos as any).nombre?.trim() || usuarioExistente.nombre,
      };
      
      const actualizado = await usuarioService.actualizarUsuario(usuarioActualizado);
      
      if (!actualizado) {
        enviarError(res, 500, "Error al actualizar usuario", []);
        return;
      }
      
      enviarRespuesta(res, 200, {
        exito: true,
        mensaje: "Usuario actualizado exitosamente",
        datos: usuarioActualizado,
      });
      return;
    }

    // Ruta: DELETE /usuarios/:id - Eliminar usuario

    if (metodo === "DELETE" && url.startsWith("/usuarios/")) {
      const id = extraerIdDeUrl(url);
      
      if (id === null) {
        enviarError(res, 400, "ID de usuario inválido", ["El ID debe ser un número"]);
        return;
      }
      
      // Verificar que el usuario existe
      const usuarioExistente = await usuarioService.obtenerUsuarioPorId(id);
      if (!usuarioExistente) {
        enviarError(res, 404, "Usuario no encontrado", [`No existe usuario con ID ${id}`]);
        return;
      }
      
      const eliminado = await usuarioService.eliminarUsuario(id);
      
      if (!eliminado) {
        enviarError(res, 500, "Error al eliminar usuario", []);
        return;
      }
      
      enviarRespuesta(res, 200, {
        exito: true,
        mensaje: "Usuario eliminado exitosamente",
        datos: { id },
      });
      return;
    }

    // Ruta no encontrada - 404
    enviarError(res, 404, "Ruta no encontrada", [
      `La ruta ${metodo} ${url} no está disponible`,
      "Rutas disponibles: GET/POST /usuarios, GET/PUT/DELETE /usuarios/:id",
    ]);

  } catch (error) {
    console.error("Error en el router:", error);
    
    // Manejo de errores específicos
    if (error instanceof Error) {
      if (error.message === "JSON mal formado en el body") {
        enviarError(res, 400, "JSON mal formado", [
          "El body de la petición no es un JSON válido",
        ]);
        return;
      }
      
      if (error.message === "Body demasiado grande") {
        enviarError(res, 413, "Payload demasiado grande", [
          "El tamaño del body excede el límite permitido (1MB)",
        ]);
        return;
      }
    }
    
    // Error interno del servidor
    enviarError(res, 500, "Error interno del servidor", [
      "Ocurrió un error inesperado al procesar la petición",
    ]);
  }
}