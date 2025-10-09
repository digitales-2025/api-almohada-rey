export interface EventPayloads {
  'user.welcome-admin-first': {
    name: string;
    email: string;
    password: string;
    webAdmin: string;
  };
  'user.new-password': {
    name: string;
    email: string;
    password: string;
    webAdmin: string;
  };
  'user.reset-password': { name: string; email: string; link: string };
  'user.verify-email': { name: string; email: string; otp: string };
  'reservation.confirmation': {
    guestName: string;
    guestEmail: string;
    reservationId: string;
    roomName: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
    guestNumber: number;
    specialRequests?: string;
  };
}
