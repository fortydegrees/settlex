import { SegmentedControl } from '../ui/SegmentedControl';

const options = [{ value: 'signIn', label: 'Sign in' }, { value: 'signUp', label: 'Create account' }];

export function EmailAuthModeToggle({ value, onChange }) {
  return <SegmentedControl label="Email auth mode" options={options} value={value} onValueChange={onChange} />;
}
