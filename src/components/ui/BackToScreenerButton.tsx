import { Link } from 'react-router-dom';
import { memo } from 'react';

type Props = {
  to?: string;
  className?: string;
};

function BackToScreenerButtonBase({ to = '/screener', className }: Props) {
  return (
    <Link to={to} className={`btn btn-primary ${className ?? ''}`}>
      Back to Screener
    </Link>
  );
};

export const BackToScreenerButton = memo(BackToScreenerButtonBase);
