import { canUseDisplayFont } from './displayFont';
import { cn } from './cn';

// Semantic heading level is chosen by the caller, independently of visual role.
// Unsupported copy falls back as a whole, avoiding a visibly mixed alphabet.
export function DisplayText({ as: Tag = 'h2', variant = 'display', children, className = '', ...props }) {
  const role = variant === 'celebration' ? 'type-celebration' : 'type-display';
  return <Tag {...props} className={cn(canUseDisplayFont(children) ? `${role} settlex-ui-display` : 'type-page', className)}>{children}</Tag>;
}

export function BrandWordmark() {
  return (
    <span className="settlex-ui-wordmark" aria-label="SettleHex">
      <span aria-hidden="true">
        {[...'SettleHex'].map((letter, index) => <span key={index}>{letter}</span>)}
      </span>
    </span>
  );
}
