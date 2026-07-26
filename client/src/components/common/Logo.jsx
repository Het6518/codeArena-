import { APP_NAME } from '../../constants/app';
import logoUrl from '/codearena-logo.svg';

export function Logo({ compact = false }) {
  return (
    <span className={compact ? 'logo-wrap logo-wrap-compact' : 'logo-wrap'}>
      <img className="logo-image" src={logoUrl} alt={APP_NAME} draggable="false" />
    </span>
  );
}
