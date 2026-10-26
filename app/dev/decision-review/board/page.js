import {notFound} from 'next/navigation';
import {ReviewBoard} from '../../../_features/dev/decision-review/board/ReviewBoard';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <ReviewBoard/>;}
