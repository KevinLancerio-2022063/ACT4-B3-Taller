import { rl } from "../utils/readline";

export async function login(): Promise<boolean> {

    console.log("--- Login ---");

    // Credenciales de ejemplo
    const USERNAME = "admin";
    const PASSWORD = "admin123";

    const nombre = await rl.question("Usuario: ");
    const contrasena = await rl.question("Contraseña: ");

    if (nombre === USERNAME && contrasena === PASSWORD) {
        return true;
    }

    return false;

}
