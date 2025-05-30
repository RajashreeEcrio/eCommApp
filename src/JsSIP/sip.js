import { receiveMsg, addMessage } from "../Store/store";

let ua;

// Configure WebSocket interface
const socket = new JsSIP.WebSocketInterface("ws://192.168.1.70:5066");

// Register SIP user agent
export const registerSIP = (data) => {
  return new Promise((resolve, reject) => {
    const configuration = {
      sockets: [socket],
      uri: `sip:${data.phoneNum}@ecrio.com`,
      password: data.password,
    };

    ua = new JsSIP.UA(configuration);
    initializeReceive(ua); // Setup message listener

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

// Check if SIP is registered
export const isSIPRegistered = () => {
  return ua ? ua.isRegistered() : false;
};

// Generate random Contribution-ID for RCS messages
const generateContributionId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Send a CPIM wrapped SIP MESSAGE
export const sendMessage = (to, message, senderUri) => {
  if (!ua) {
    console.log("SIP UA not initialized");
    return;
  }

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
      "Route: <sip:192.168.1.70:9090;lr>",
      `Conversation-ID: ${contributionId}`,
      `Contribution-ID: ${contributionId}`,
    ],
  };

  const target = `sip:${to}@ecrio.com`;
  ua.sendMessage(target, cpimBody, messageOptions);
  console.log("Message sent:", messageOptions);
};

// Parse CPIM format message body
const parseCpimBody = (body) => {
  const contentMatch = body.match(/TEXT:::-:::(.*)/s);
  const content = contentMatch ? contentMatch[1].trim() : null;

  const fromMatch = body.match(/^From:\s*<sip:([^>]+)>/m);
  const from = fromMatch ? fromMatch[1].trim() : null;

  const toMatch = body.match(/^To:\s*<sip:([^>]+)>/m);
  const to = toMatch ? toMatch[1].trim() : null;

  const dateMatch = body.match(/^DateTime:\s*(.+)$/m);
  const datetime = dateMatch ? dateMatch[1].trim() : null;

  const messageIdMatch = body.match(/^imdn\.Message-ID:\s*(.+)$/m);
  const messageId = messageIdMatch ? messageIdMatch[1].trim() : null;

  return { from, to, datetime, content, messageId };
};

// Setup listener for incoming SIP messages
const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", (e) => {
    if (e.originator !== "remote") {
      console.log("Ignored self message");
      return;
    }

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");

    if (contentType && contentType.includes("message/cpim")) {
      const parsed = parseCpimBody(rawBody);

      if (parsed.content) {
        console.log("Received RCS message:", parsed);
        receiveMsg.set(parsed.content);
        addMessage({
          from: parsed.from,
          to: parsed.to,
          content: parsed.content,
          datetime: parsed.datetime,
          messageId: parsed.messageId,
          status: 'received',
        });
      } else {
        console.warn("Failed to parse CPIM body:", rawBody);
      }
    } else {
      // Handle plain SIP MESSAGE
      const senderUri = e.request.from.uri;
      const message = {
        from: senderUri,
        to: ua.configuration.uri.user,
        content: rawBody,
        datetime: new Date().toISOString(),
        messageId: null,
        status: 'received',
      };
      console.log("Received plain message:", message);
      receiveMsg.set(message.content);
      addMessage(message);
    }
  });
};
