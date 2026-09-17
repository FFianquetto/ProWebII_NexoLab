import { fail } from '../utils/response.js';

function humanizeZodMessage(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  if (/too small/i.test(raw) && /expected string/i.test(raw)) {
    return 'Hay un campo de texto vacío o demasiado corto. Revisa el título.';
  }
  if (/too small/i.test(raw)) {
    return 'Hay un valor demasiado corto o vacío. Revisa el formulario.';
  }
  if (/too big/i.test(raw)) {
    return 'Hay un valor demasiado largo. Revisa el formulario.';
  }
  if (/invalid/i.test(raw) && /date/i.test(raw)) {
    return 'La fecha u hora no es válida.';
  }
  if (/invalid_type|expected/i.test(raw) && /received undefined|received null/i.test(raw)) {
    return 'Faltan campos obligatorios. Completa el formulario.';
  }
  return raw;
}

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const flat = result.error.flatten();
      const firstField = Object.values(flat.fieldErrors || {}).flat()[0];
      const firstForm = (flat.formErrors || [])[0];
      const message =
        humanizeZodMessage(firstField || firstForm) ||
        'Datos inválidos. Revisa el formulario.';
      return fail(res, message, 422, flat);
    }
    req[source] = result.data;
    return next();
  };
}
