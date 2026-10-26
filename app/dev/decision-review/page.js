import {notFound} from 'next/navigation';
import {DecisionReviewClient} from '../../_features/dev/decision-review/DecisionReviewClient';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <DecisionReviewClient/>;}
