/**
 * Este prefijo permite que diferentes sistemas que usan Better Auth
 * no colisionen entre sí en el almacenamiento de cookies.
 *
 * Este valor debe coincidir con el valor utilizado en el frontend,
 * si se utiliza allí.
 */
export const BETTER_AUTH_COOKIE_PREFIX = 'almohada-rey-better-auth';
export const BETTER_AUTH_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? `__Secure-${BETTER_AUTH_COOKIE_PREFIX}.session_token`
    : `${BETTER_AUTH_COOKIE_PREFIX}.session_token`;
