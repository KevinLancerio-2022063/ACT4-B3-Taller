import { menu } from "./menu/menu";
import { login } from "./menu/login";

async function main(){

    let authenticated = false;
    let attempts = 0;

    while(!authenticated && attempts < 3){
        authenticated = await login();

        if(!authenticated){
            console.log("Credenciales incorrectas.");
            attempts++;
        }
    }

    if(!authenticated){
        console.log("Demasiados intentos. Saliendo.");
        process.exit(1);
    }

    console.clear();

    await menu();

}

main();