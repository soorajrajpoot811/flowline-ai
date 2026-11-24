export function errorHandler(err, req, res, next) {
  console.error('[API Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'ERR_INTERNAL',
      message: err.message || 'Internal server error.'
    }
  });
}
