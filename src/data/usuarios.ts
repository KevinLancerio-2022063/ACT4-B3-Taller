import { Usuario } from "../models/usuario";
import { Rol } from "../models/rol";

export const usuarios: Usuario[] = [
  {
    id: 1,
    nombre: "Eduardo",
    edad: 20,
    correo: "",
    rol: Rol.ADMIN,
    estado: "activo"
  },

  {
    id: 2,
    nombre: "Ana",
    edad: 22,
    correo: "",
    rol: Rol.USER,
    estado: "inactivo"
  },
  {
    id: 3,
    nombre: "Emilio",
    edad: 24,
    correo: "",
    rol: Rol.USER,
    estado: "nulo"
  }

];