// CommonJS bridge for Vercel Serverless runtime to import the ESM handler from frontend
// This avoids require() of an ES module (ERR_REQUIRE_ESM) by using dynamic import()

let handlerPromise = null;
function getHandler() {
  if (!handlerPromise) {
    // import the built ESM output from the frontend folder at runtime
    handlerPromise = import('../frontend/api/index2.js').then(mod => mod.default || mod.handler || mod);
  }
  return handlerPromise;
}

module.exports = async function (req, res) {
  try {
    const handler = await getHandler();
    // handler may be an async function (req,res) -> void/Response
    return handler(req, res);
  } catch (err) {
    console.error('[proctorx-api] bridge import failed', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
