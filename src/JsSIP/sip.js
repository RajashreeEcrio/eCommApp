import { receiveMsg, addMessage, updateMessageStatus } from "../Store/store";

let ua;

// Configure WebSocket interface
const socket = new JsSIP.WebSocketInterface("ws://192.168.1.70:5071");

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

export const isSIPRegistered = () => {
  return ua ? ua.isRegistered() : false;
};

const generateContributionId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const sendMessage = (to, message, senderUri) => {
  if (!ua) {
    console.log("SIP UA not initialized");
    return;
  }

  const now = new Date().toISOString();
  const contributionId = generateContributionId();

  const cpimBody =
    `From: <sip:${senderUri}@ecrio.com>\r\n` +
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

  addMessage({
    from: senderUri,
    to,
    content: message,
    datetime: now,
    messageId: contributionId,
    status: 'sent',
  });
};

// ✅ Send IMDN delivery receipt to sender
const sendImdnReceipt = (toUri, messageId) => {
  const now = new Date().toISOString();

  const imdnXml =
    `<?xml version="1.0" encoding="UTF-8"?>\r\n` +
    `<imdn xmlns="urn:ietf:params:xml:ns:imdn">\r\n` +
    `  <message-id>${messageId}</message-id>\r\n` +
    `  <datetime>${now}</datetime>\r\n` +
    `  <delivery-notification>\r\n` +
    `    <status><delivered/></status>\r\n` +
    `  </delivery-notification>\r\n` +
    `</imdn>`;

  const messageOptions = {
    contentType: "application/imdn+xml",
    extraHeaders: [
      'Accept-Contact: *;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg";require;explicit',
      'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
      "Request-Disposition: no-fork",
      "Route: <sip:192.168.1.70:9090;lr>",
    ],
  };

  ua.sendMessage(toUri, imdnXml, messageOptions);
  console.log("IMDN Delivery Receipt sent to:", toUri);
};

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

const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", (e) => {
    if (e.originator !== "remote") return;

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");

    // If it's an IMDN receipt, update status but DO NOT show message in UI
    if (contentType && contentType.includes("application/imdn+xml")) {
      // Parse the IMDN XML (basic parse)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawBody, "application/xml");
      const messageIdNode = xmlDoc.getElementsByTagName("message-id")[0];
      const statusNode = xmlDoc.getElementsByTagName("status")[0];
      
      if (messageIdNode && statusNode) {
        const messageId = messageIdNode.textContent;
        // Assuming <delivered/> or <display/> inside <status>
        if (statusNode.querySelector("delivered")) {
          updateMessageStatus(messageId, "delivered");
        }
        if (statusNode.querySelector("display")) {
          updateMessageStatus(messageId, "read");
        }
      }
      return; // Exit here so no UI update with receipt message
    }

    if (contentType && contentType.includes("message/cpim")) {
      const parsed = parseCpimBody(rawBody);

      if ((!parsed.content || parsed.content === "") &&
          rawBody.includes("imdn.Disposition-Notification")) {
        // Handle disposition notification if any, but it's unlikely in CPIM body for receipts
        // You can add more logic here if needed
        return;
      }

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

        // Send IMDN receipt for this message
        if (parsed.from && parsed.messageId) {
          const senderUri = `sip:${parsed.from}`;
          sendImdnReceipt(senderUri, parsed.messageId);
        }
      } else {
        console.warn("Failed to parse CPIM body:", rawBody);
      }
    } else {
      // Handle normal plain text or other messages here if any
      const senderUri = e.request.from.uri;
      const message = {
        from: senderUri,
        to: ua.configuration.uri.user,
        content: rawBody,
        datetime: new Date().toISOString(),
        messageId: null,
        status: 'received',
      };
      receiveMsg.set(message.content);
      addMessage(message);
    }
  });
};

