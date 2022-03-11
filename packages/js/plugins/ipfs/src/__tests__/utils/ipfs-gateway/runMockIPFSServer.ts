import express from "express";
import fs from "fs";

export const runMockIPFSServer = async (
  port: number
) => {
  const app = express();

  app.get('/api/v0/cat', async (req, res) => {
    const hash = req.query.arg as string;

    const filePath = `${__dirname}/ipfs/${hash}`;

    if(!fs.existsSync(filePath)) {
      res.status(404).send(`File not found: ${hash}`);
      return;
    }

    const buffer = fs.readFileSync(filePath);

    res.send(buffer);
  });

  app.get('/api/v0/resolve', async (req, res) => {
    const pathToResolve = req.query.arg as string; 

    if(pathToResolve !== "QmeiPWHe2ixfitcgjRwP5AaJD5R7DbsGhQNQwT4rFNyxx8/web3api.yaml") {
      res.status(404).send(`File not found: ${pathToResolve}`);
      return;
    }

    res.json({
      path: "QmYvaoynTeKeMJpw1YqCKD75d9JrxaSe5771eXCbtvkELB",
    });
  });

  const server = app.listen(port, () => {
  });

  return () => {
    server.close();
  };
};