import Input from '../Input/Input'
import Button from '../Button/Button'
import styles from './CollaboratorRow.module.css'

export default function CollaboratorRow({ index, collaborator, onChange, onRemove, artistShare }) {
  return (
    <div className={styles.row}>
      <div className={styles.fields}>
        <Input
          placeholder="0x... wallet address"
          value={collaborator.address}
          onChange={(e) => onChange(index, 'address', e.target.value)}
          className={styles.addressInput}
        />
        <div className={styles.shareWrap}>
          <Input
            type="number"
            placeholder="Share %"
            value={collaborator.share}
            onChange={(e) => onChange(index, 'share', e.target.value)}
            suffix="%"
            min={1}
            max={99}
            className={styles.shareInput}
          />
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className={styles.removeBtn}>
        ✕
      </Button>
    </div>
  )
}
