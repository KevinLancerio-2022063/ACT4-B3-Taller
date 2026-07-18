import { Usuario } from "../models/usuario";
import { UsuarioRepository } from "../data/usuarioRepository";

const API_URL = "http://localhost:3000/usuarios";
const TIMEOUT_MS = 5000; // 5 segundos para simular/controlar tiempo de espera
const ARCHIVO_SALIDA = "./src/data/usuarios_sincronizados.json";

interface RegistroError {
  tipo: string;
  mensaje: string;
  detalle?: unknown;
  timestamp: string;
}

function registrarError(tipo: string, mensaje: string, detalle?: unknown): void {
  const error: RegistroError = {
    tipo,
    mensaje,
    detalle,
    timestamp: new Date().toISOString(),
  };
  console.error(`[ERROR] ${tipo}: ${mensaje}`);
  if (detalle) {
    console.error("↳ Detalle:", detalle);
  }
}

export async function sincronizarUsuariosDesdeAPI(): Promise<void> {
  console.log("[INICIO] Iniciando proceso de sincronización de usuarios...\n");
  
  const tiempoInicioTotal = performance.now();
  let tiempoFinFetch = 0;
  let tiempoFinProcesamiento = 0;

  try {
    // 1. Configuración de Timeout (AbortController)
    const controlador = new AbortController();
    const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    console.log(`[${(performance.now() - tiempoInicioTotal).toFixed(2)} ms] Realizando petición a: ${API_URL}`);
    
    // 2. Llamada a la API con Fetch API de Node 18+
    const respuesta = await fetch(API_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controlador.signal,
    });

    clearTimeout(idTimeout);
    tiempoFinFetch = performance.now();
    console.log(`[${(tiempoFinFetch - tiempoInicioTotal).toFixed(2)} ms] Respuesta recibida. Código de estado: ${respuesta.status}`);

    // 3. Validación de código de estado HTTP
    if (!respuesta.ok) {
      throw new Error(`Respuesta HTTP no exitosa. Código: ${respuesta.status} - ${respuesta.statusText}`);
    }

    // 4. Validación de tipo de contenido
    const contentType = respuesta.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("La respuesta no es un JSON válido. Content-Type: " + contentType);
    }

    // 5. Procesamiento y validación de datos (Malformed data check)
    let datosCrudos: unknown;
    try {
      datosCrudos = await respuesta.json();
    } catch (parseError) {
      throw new Error("Error al parsear la respuesta JSON. Datos mal formados.");
    }

    if (!Array.isArray(datosCrudos)) {
      throw new Error("La estructura de datos no es un arreglo (Array) como se esperaba.");
    }

    // 6. Extracción y mapeo de únicamente la información de interés
    const usuariosValidados: Usuario[] = datosCrudos.map((item: any, index: number) => {
      if (!item || typeof item.id !== "number" || typeof item.nombre !== "string") {
        registrarError("DATOS_INVALIDOS", `Registro en índice ${index} no cumple con la estructura mínima`, item);
        return null; // Filtraremos los null después
      }

      return {
        id: item.id,
        nombre: item.nombre,
        edad: typeof item.edad === "number" ? item.edad : 0,
        correo: typeof item.correo === "string" ? item.correo : "sin-correo@ejemplo.com",
        rol: item.rol || "USUARIO",
        estado: item.estado || "INACTIVO",
      } as Usuario;
    }).filter((u): u is Usuario => u !== null);

    tiempoFinProcesamiento = performance.now();
    console.log(`🔧 [${(tiempoFinProcesamiento - tiempoInicioTotal).toFixed(2)} ms] Datos procesados y validados. Total válidos: ${usuariosValidados.length}`);

    // 7. Diseño de estructura de salida clara y organizada (con metadatos)
    const payloadSalida = {
      metadata: {
        fechaSincronizacion: new Date().toISOString(),
        origen: API_URL,
        totalRegistros: usuariosValidados.length,
        tiempoProcesamientoMs: Number((tiempoFinProcesamiento - tiempoInicioTotal).toFixed(2)),
      },
      datos: usuariosValidados,
    };

    // 8. Guardado en archivo JSON
    const repo = new UsuarioRepository();
    // Nota: Adaptamos el repo para que guarde en la ruta de sincronización, 
    // o puedes usar fs/promises directamente aquí para mayor control del nombre del archivo.
    const { writeFile } = await import("fs/promises");
    await writeFile(ARCHIVO_SALIDA, JSON.stringify(payloadSalida, null, 4), "utf-8");

    const tiempoFinTotal = performance.now();
    console.log(`💾 [${(tiempoFinTotal - tiempoInicioTotal).toFixed(2)} ms] Datos guardados exitosamente en: ${ARCHIVO_SALIDA}`);
    console.log("🏁 [FIN] Proceso de sincronización completado con éxito.\n");

  } catch (error: unknown) {
    const tiempoFinTotal = performance.now();
    console.log(`🛑 [${(tiempoFinTotal - tiempoInicioTotal).toFixed(2)} ms] Proceso interrumpido por error.`);
    
    // Manejo de errores específico según el tipo
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        registrarError("TIMEOUT", `La petición excedió el tiempo límite de ${TIMEOUT_MS}ms`, error.message);
      } else if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        registrarError("ERROR_DE_RED", "No se pudo conectar con el servidor. Verifica que esté en ejecución (npm run dev) o la URL.", error.message);
      } else {
        registrarError("ERROR_INESPERADO", "Ocurrió un error durante la ejecución del script", error.message);
      }
    } else {
      registrarError("ERROR_DESCONOCIDO", "Se lanzó una excepción no identificada", error);
    }
  }
}

// ============================================================================
// EJECUCIÓN (Si se ejecuta este archivo directamente)
// ============================================================================
if (require.main === module) {
  sincronizarUsuariosDesdeAPI();
}