/**
 * Área de texto y botón para añadir aristas: una línea o varias (origen destino peso por línea).
 */

/**
 * @param {{ value: string, onChange: (v: string) => void, onSubmit: () => void, disabled?: boolean }} props
 */
export function EdgeInput({ value, onChange, onSubmit, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="edge-input-row edge-input-row--stack">
      <textarea
        className="edge-input edge-input--multiline"
        placeholder={
          'Una o varias líneas, por ejemplo:\nS B 4\nS C 2\nB C 1\n\nTambién puedes usar una sola línea: A B 4'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={4}
        aria-label="Entrada de aristas: una línea por conexión (origen destino peso)"
      />
      <button
        type="button"
        className="edge-input-btn"
        onClick={onSubmit}
        disabled={disabled}
      >
        Agregar al grafo
      </button>
      <p className="edge-input-hint">
        Cada línea es una arista. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> envía igual
        que el botón.
      </p>
    </div>
  )
}
