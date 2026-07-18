import { Rol } from "./rol";
import { Estado } from "./estado";

export interface Usuario {
  id: number;
  nombre: string;
  edad: number;
  correo: string;
  rol: Rol;
  estado: Estado;
}