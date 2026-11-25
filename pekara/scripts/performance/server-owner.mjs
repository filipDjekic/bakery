import net from 'node:net';
import { writeFileSync } from 'node:fs';
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  this.once('listening', () => {
    const address = this.address();
    if (
      address &&
      typeof address !== 'string' &&
      address.port === Number(process.env.PERF_SERVER_PORT)
    )
      writeFileSync(process.env.PERF_SERVER_PID_FILE, String(process.pid));
  });
  return listen.apply(this, args);
};
