import styles from './Input.module.css'

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  prefix,
  suffix,
  required = false,
  disabled = false,
  min,
  max,
  step,
  className = '',
}) {
  return (
    <div className={[styles.wrapper, className].join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={[styles.inputWrap, error ? styles.hasError : ''].join(' ')}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={styles.input}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
