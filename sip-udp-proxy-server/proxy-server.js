const WebSocket = require("ws");
const dgram = require("dgram");

const WS_PORT = 5066; // Port where WebSocket listens
const UDP_HOST = "192.168.1.26"; // EST tool IP
const UDP_PORT = 9090; // EST tool UDP port
const PROXY_PORT = 5060; // SIP Port used for forwarding via UDP

const PROXY_HOST = "192.168.1.26";

const udpSocket = dgram.createSocket("udp4");
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(
  `Proxy running. WS: ws://${PROXY_HOST}:${WS_PORT}, forwarding to EST UDP ${UDP_HOST}:${UDP_PORT}`
);

wss.on("connection", function connection(ws) {
  console.log("WebSocket client connected");

  ws.on("message", function incoming(message) {
    let msg = message.toString();
    console.log("Incoming WS → SIP:\n", msg);

    msg = msg.replace(
      /Via: SIP\/2.0\/WS\s+.*?(;branch=[^;\r\n]*)/i,
      `Via: SIP/2.0/UDP ${PROXY_HOST}:${PROXY_PORT}$1`
    );

    // Modify the Contact header to use transport=udp
    msg = msg.replace(
      /Contact: <sip:[^;]+;transport=ws[^>]*>/i,
      `Contact: <sip:${PROXY_HOST}:${PROXY_PORT};transport=udp>`
    );

    const udpBuffer = Buffer.from(msg);
    udpSocket.send(udpBuffer, UDP_PORT, UDP_HOST);
  });

  udpSocket.on("message", function (msg, rinfo) {
    let sipMsg = msg.toString();
    console.log("Outgoing UDP → WS:\n", sipMsg);

    // Modify from tel uri to sip uri
    if (/To:\s*<tel:/i.test(sipMsg)) {
      sipMsg = sipMsg.replace(
        /To:\s*<tel:(\+?\d+)[^>]*>/i,
        "To: <sip:$1@ecrio.com>"
      );
    }

    // Modify the Via header from UDP back to WS
    sipMsg = sipMsg.replace(
      /Via: SIP\/2.0\/UDP\s+.*?(;branch=[^;\r\n]*)/i,
      `Via: SIP/2.0/WS js-client.invalid$1`
    );

    // Check if WebSocket is open and forward the message
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(sipMsg);
      console.log("SIP response forwarded to WebSocket client");
    } else {
      console.log("WebSocket not open. Cannot forward message.");
    }
  });

  // WebSocket close event
  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// Bind the UDP socket to listen for incoming messages
udpSocket.bind(5060, () => {
  console.log("Proxy listening on UDP port 5060");
});
