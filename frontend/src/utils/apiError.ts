/** Extrae un mensaje amigable de errores de Axios / API NexoLab. */
export function getApiErrorMessage(err: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.') {
  if (!err || typeof err !== 'object') return fallback;

  const axiosErr = err as {
    code?: string;
    message?: string;
    response?: {
      status?: number;
      data?: {
        message?: string;
        details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
      };
    };
  };

  if (axiosErr.code === 'ERR_NETWORK' || axiosErr.message === 'Network Error') {
    return 'No hay conexión con el servidor. Verifica que la API esté en ejecución.';
  }

  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;
  let message = data?.message?.trim();

  // Sanitizar fugas técnicas (Prisma / Mongo) por si llegan desde versiones previas del API
  if (
    message &&
    (/prisma/i.test(message) ||
      /mongodb/i.test(message) ||
      /server selection/i.test(message) ||
      /invocation/i.test(message) ||
      message.length > 180)
  ) {
    message =
      status === 503
        ? 'El servicio de datos no está disponible por el momento. Intenta más tarde.'
        : fallback;
  }

  if (!message && data?.details?.fieldErrors) {
    const first = Object.values(data.details.fieldErrors).flat()[0];
    if (first) message = first;
  }

  if (!message && data?.details?.formErrors?.[0]) {
    message = data.details.formErrors[0];
  }

  if (!message) {
    if (status === 401) return 'Correo o contraseña incorrectos.';
    if (status === 403) return 'No tienes permiso para realizar esta acción.';
    if (status === 404) return 'No se encontró el recurso solicitado.';
    if (status === 409) return 'Hay un conflicto con otra reserva o el dato ya existe.';
    if (status === 422) return 'Revisa los datos del formulario; hay campos inválidos.';
    if (status === 503) return 'El servicio no está disponible temporalmente.';
    if (status && status >= 500) return 'Error del servidor. Intenta de nuevo más tarde.';
    return fallback;
  }

  if (/too small/i.test(message)) {
    return 'Hay un campo vacío o demasiado corto (el título necesita al menos 2 caracteres).';
  }

  return message;
}
