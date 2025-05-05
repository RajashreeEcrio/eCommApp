import { receiveMsg,  } from "../Store/store";

let ua;

const socket = new JsSIP.WebSocketInterface("ws://192.168.1.26:5066");

export const registerSIP = (data) => {
  return new Promise((resolve, reject) => {
    const configuration = {
      sockets: [socket],
      uri: `sip:${data.phoneNum}@ecrio.com`,
      password: data.password,
    };

    ua = new JsSIP.UA(configuration);

    // Initializing the receive event
    initializeReceive(ua);

    ua.on("registered", () => {
      console.log("SIP registered");
      resolve(true);
    });

    ua.on("registrationFailed", (e) => {
      console.error("SIP registration failed", e);
      reject(false);
    });

    ua.start();
  });
};

// Generate new dynamic contribution IDs per message
const generateContributionId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const sendMessage = (to, message, senderUri) => {
  if (ua) {
    const now = new Date().toISOString();
    const contributionId = generateContributionId();

    const cpimBody =
      `From: <sip:${senderUri}@ecrio.com?Accept-Contact=+sip.instance%3D%22%3Curn:gsma:imei:01437600-003859-4%3E%22%3Brequire%3Bexplicit>\r\n` +
      `To: <sip:${to}@ecrio.com>\r\n` +
      `DateTime: ${now}\r\n` +
      `NS: imdn <urn:ietf:params:imdn>\r\n` +
      `imdn.Message-ID: ${contributionId}\r\n` +
      `imdn.Disposition-Notification: positive-delivery,display\r\n` +
      `\r\n` +
      `Content-Type: text/plain;charset=UTF-8\r\n` +
      `Content-Length: ${message.length + 11}\r\n` +
      `\r\n` +
      `TEXT:::-:::${message}`;

    const messageOptions = {
      contentType: "message/cpim",
      extraHeaders: [
        'Accept-Contact: *;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg";require;explicit',
        `P-Preferred-Identity: <sip:${senderUri}@ecrio.com>`,
        'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
        "Request-Disposition: no-fork",
        "Route: <sip:192.168.1.26:9090;lr>",
        `Conversation-ID: ${contributionId}`,
        `Contribution-ID: ${contributionId}`,
      ],
    };

    const target = `sip:${to}@ecrio.com`;
    ua.sendMessage(target, cpimBody, messageOptions);
    console.log("Message sent:", messageOptions);
  } else {
    console.log("SIP UA not initialized");
  }
};

const parseCpimBody = (body) => {
  const contentMatch = body.match(/TEXT:::-:::(.*)/s);
  const content = contentMatch ? contentMatch[1].trim() : null;

  const fromMatch = body.match(/^From:\s*(.+)$/m);
  const from = fromMatch ? fromMatch[1].trim() : null;

  const toMatch = body.match(/^To:\s*(.+)$/m);
  const to = toMatch ? toMatch[1].trim() : null;

  const dateMatch = body.match(/^DateTime:\s*(.+)$/m);
  const datetime = dateMatch ? dateMatch[1].trim() : null;

  return {
    from,
    to,
    datetime,
    content,
  };
};

// Initialize the receive event to monitor incoming messages
const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", (e) => {
    console.log("eventobj =>", e);

    if (e.originator === "remote") {
      const rawBody = e.request.body;
      const contentType = e.request.getHeader("Content-Type");

      // If it's RCS (message/cpim), parse it
      if (contentType && contentType.includes("message/cpim")) {
        const parsed = parseCpimBody(rawBody);

        if (parsed.content) {
          console.log("Received RCS message:", parsed);
          receiveMsg.set(parsed.content);
        } else {
          console.warn("Failed to parse CPIM body:", rawBody);
        }
      } else {
        // fallback for plain text SIP MESSAGE
        const message = {
          sender: e.request.from.uri,
          content: rawBody,
        };
        console.log("Received plain message:", message);
        receiveMsg.set(message.content);
      }
    }
  });
};

export const isSIPRegistered = () => {
  return ua ? ua.isRegistered() : false;
};
