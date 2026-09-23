import { Link } from 'react-router-dom';
import Alert from '../ui/Alert';

export default function OverdueReviewsAlert({
  count,
  month,
}: {
  count: number;
  month?: string;
}) {
  if (count <= 0) return null;

  return (
    <Alert tone="warning" className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          <span className="font-semibold">{count}</span> active employee
          {count === 1 ? '' : 's'} missing delivery review
          {month ? ` for ${month}` : ''}.
        </p>
        <Link
          to="/delivery-reviews"
          className="text-sm font-semibold text-primary hover:underline"
        >
          View delivery reviews
        </Link>
      </div>
    </Alert>
  );
}
