export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res, message, status = 400, details = undefined) {
  const body = { success: false, message };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}
