const cors = require('cors');
const express = require('express');
const { Noco } = require('nocodb');

const app = express();
app.use(cors());

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log('HTTP listening on ' + port);
});

Noco.init({}, server, app)
  .then((ncApp) => {
    app.use('/', ncApp);
    console.log('NocoDB ready -> http://localhost:' + port + '/dashboard');
  })
  .catch((e) => {
    console.error('Noco.init failed:', e);
    process.exit(1);
  });
