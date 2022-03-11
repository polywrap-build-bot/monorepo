import { PluginRegistration, Uri, Web3ApiClient } from "@web3api/client-js";
import { ipfsPlugin } from "..";
import { runMockIPFSServer } from "./utils/ipfs-gateway/runMockIPFSServer";

describe("Content verification", () => {
  let polywrapClient: Web3ApiClient;

  beforeAll(async () => {
   
  });

  afterAll(async () => {
  });

  it("content ver", async () => {
     // get client
     polywrapClient = new Web3ApiClient();
     polywrapClient["_config"].plugins = polywrapClient["_config"].plugins.filter((x: PluginRegistration<Uri>) => x.uri.uri !== "w3://ens/ipfs.web3api.eth");
 
     polywrapClient["_config"].plugins.push(
       {
         uri: new Uri("ens/ipfs.web3api.eth"),
         plugin: ipfsPlugin({
           provider: "http://localhost:5005"
         })
       }
     );
    const apiPromise = runMockIPFSServer(5005);
    const promise = polywrapClient.getManifest("ipfs/QmeiPWHe2ixfitcgjRwP5AaJD5R7DbsGhQNQwT4rFNyxx8", { type: "web3api",  });

    const responses = await Promise.all([apiPromise, promise]);
    const stopIPFSServer = responses[0];
    const manifest = responses[1];
    console.log(manifest);

    stopIPFSServer();
  });
});
