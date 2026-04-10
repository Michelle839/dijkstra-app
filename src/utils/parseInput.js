/**
 * Parsea una línea "origen destino peso" y devuelve un objeto plano.
 * Lanza errores descriptivos si la entrada no es válida.
 */

/**
 * Divide un texto en líneas no vacías (soporta pegar varias aristas a la vez).
 * @param {string} text
 * @returns {string[]}
 */
export function splitEdgeLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/**
 * @param {string} line
 * @returns {{ from: string, to: string, weight: number }}
 */
export function parseInput(line) {
  const trimmed = String(line).trim()
  if (!trimmed) {
    throw new Error('La entrada está vacía.')
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length < 3) {
    throw new Error(
      'Formato inválido: se esperan tres campos (origen, destino y peso). Ejemplo: A B 4',
    )
  }

  const from = parts[0]
  const to = parts[1]
  const weightRaw = parts[2]
  const weight = Number(weightRaw)

  if (!Number.isFinite(weight)) {
    throw new Error(`El peso debe ser un número válido. Se recibió: "${weightRaw}"`)
  }
  if (weight < 0) {
    throw new Error('El peso no puede ser negativo.')
  }
  if (from === to) {
    throw new Error('El nodo origen y destino no pueden ser el mismo.')
  }

  return { from, to, weight }
}
