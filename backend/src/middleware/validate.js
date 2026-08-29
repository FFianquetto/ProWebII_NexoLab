import { fail } from '../utils/response.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return fail(res, 'Datos inválidos', 422, result.error.flatten());
    }
    req[source] = result.data;
    return next();
  };
}
