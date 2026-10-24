// Límite de intentos fallidos de login, en memoria y sin dependencias.
// Cuenta solo los FALLOS por clave (IP + usuario): un login correcto limpia el
// contador, así que los visitantes de la demo no se bloquean entre sí.
// Limitación conocida: vive en la memoria de una instancia. Con varias
// instancias haría falta un almacén compartido (Redis o una tabla).

function crearLimitadorLogin({ max = 10, ventanaMs = 15 * 60 * 1000 } = {}) {
  const fallos = new Map(); // clave -> { count, resetAt }

  function vigente(clave, ahora) {
    const e = fallos.get(clave);
    if (!e) return null;
    if (e.resetAt <= ahora) { fallos.delete(clave); return null; }
    return e;
  }

  return {
    // Devuelve los segundos que faltan si la clave está bloqueada; 0 si no.
    bloqueado(clave, ahora = Date.now()) {
      const e = vigente(clave, ahora);
      return e && e.count >= max ? Math.ceil((e.resetAt - ahora) / 1000) : 0;
    },
    fallo(clave, ahora = Date.now()) {
      const e = vigente(clave, ahora);
      if (e) e.count += 1;
      else fallos.set(clave, { count: 1, resetAt: ahora + ventanaMs });
      // Poda simple para que el mapa no crezca sin límite.
      if (fallos.size > 10000) for (const [k, v] of fallos) if (v.resetAt <= ahora) fallos.delete(k);
    },
    limpiar(clave) { fallos.delete(clave); },
  };
}

module.exports = { crearLimitadorLogin };
