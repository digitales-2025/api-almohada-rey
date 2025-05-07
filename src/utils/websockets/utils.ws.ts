import { Socket } from 'socket.io';

export function validateClientId(clientId: string, client: Socket): boolean {
  if (!client || !clientId) {
    return false;
  }

  if (clientId !== client.id) {
    return false;
  }
  return true;
}
