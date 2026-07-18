import { Usuario } from "../models/usuario";
import { UsuarioRepository } from "../data/usuarioRepository";

export class UsuarioService {
  private repository: UsuarioRepository;

  constructor() {
    this.repository = new UsuarioRepository();
  }

  async obtenerTodosLosUsuarios(): Promise<Usuario[]> {
    return await this.repository.obtenerUsuarios();
  }

  async obtenerUsuarioPorId(id: number): Promise<Usuario | undefined> {
    const usuarios = await this.repository.obtenerUsuarios();
    return usuarios.find((u) => u.id === id);
  }

  async crearUsuario(usuario: Usuario): Promise<Usuario> {
    const usuarios = await this.repository.obtenerUsuarios();
    usuarios.push(usuario);
    await this.repository.guardarUsuarios(usuarios);
    return usuario;
  }

  async actualizarUsuario(usuarioActualizado: Usuario): Promise<boolean> {
    const usuarios = await this.repository.obtenerUsuarios();
    const indice = usuarios.findIndex((u) => u.id === usuarioActualizado.id);
    
    if (indice === -1) {
      return false;
    }
    
    usuarios[indice] = usuarioActualizado;
    await this.repository.guardarUsuarios(usuarios);
    return true;
  }

  async eliminarUsuario(id: number): Promise<boolean> {
    const usuarios = await this.repository.obtenerUsuarios();
    const indice = usuarios.findIndex((u) => u.id === id);
    
    if (indice === -1) {
      return false;
    }
    
    usuarios.splice(indice, 1);
    await this.repository.guardarUsuarios(usuarios);
    return true;
  }
}