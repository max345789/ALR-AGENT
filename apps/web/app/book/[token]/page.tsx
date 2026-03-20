import { BookingClient } from '../../../components/booking-client';

interface BookingPageProps {
  params: Promise<{ token: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { token } = await params;
  return <BookingClient token={token} />;
}
