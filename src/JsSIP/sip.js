import { addMessage, updateMessageStatus } from "../Store/store";

let ua;

const socket = new JsSIP.WebSocketInterface("ws://192.168.1.71:5066");

export const registerSIP = (data) => {
  return new Promise((resolve, reject) => {
    console.log("[registerSIP] Starting registration with data:", data);
    
    const configuration = {
      sockets: [socket],
      uri: `sip:${data.phoneNum}@ecrio.com`,
      password: data.password,
    };

    ua = new JsSIP.UA(configuration);
    console.log("[registerSIP] Created UA with config:", configuration);

    initializeReceive(ua);

    ua.on("registered", () => {
      console.log("[registerSIP] SIP registered successfully");
      resolve(true);
    });

    ua.on("registrationFailed", (e) => {
      console.error("[registerSIP] SIP registration failed", e);
      reject(false);
    });

    ua.start();
    console.log("[registerSIP] UA.start() called");
  });
};

export const isSIPRegistered = () => {
  const status = ua ? ua.isRegistered() : false;
  console.log("[isSIPRegistered] UA registered status:", status);
  return status;
};

const generateContributionId = () => {
  const id = Math.random().toString(36).substring(2, 15);
  console.log("[generateContributionId] Generated ID:", id);
  return id;
};

export const sendMessage = (to, message, senderUri) => {
  console.log("[sendMessage] Sending message to:", to, "from:", senderUri, "message:", message);

  if (!ua) {
    console.log("[sendMessage] SIP UA not initialized");
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
      "Route: <sip:192.168.1.71:9090;lr>",
      `Conversation-ID: ${contributionId}`,
      `Contribution-ID: ${contributionId}`,
    ],
  };

  const target = `sip:${to}@ecrio.com`;
  console.log("[sendMessage] Sending CPIM message with options:", messageOptions);
  ua.sendMessage(target, cpimBody, messageOptions);

  addMessage({
    from: senderUri,
    to,
    content: message,
    datetime: now,
    messageId: contributionId,
    status: 'sent',
  });
  console.log("[sendMessage] Message added to store with messageId:", contributionId);
};

const sendImdnReceipt = (toUri, messageId) => {
  console.log("[sendImdnReceipt] Sending IMDN receipt to:", toUri, "for messageId:", messageId);

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
      "Route: <sip:192.168.1.71:9090;lr>",
    ],
  };

  ua.sendMessage(toUri, imdnXml, messageOptions);
  console.log("[sendImdnReceipt] IMDN Delivery Receipt sent successfully");
};

const parseCpimBody = (body) => {
  console.log("[parseCpimBody] Parsing CPIM body");
  
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

  console.log("[parseCpimBody] Parsed:", { from, to, datetime, content, messageId });

  return { from, to, datetime, content, messageId };
};

const initializeReceive = (uaInstance) => {
  console.log("[initializeReceive] Setting up newMessage event handler");

  uaInstance.on("newMessage", (e) => {
    console.log("[newMessage event] Received:", {
      originator: e.originator,
      from: e.request.from.uri.user,
      to: e.request.to.uri.user,
      contentType: e.request.getHeader("Content-Type"),
      bodyPreview: e.request.body?.substring(0, 50) || "",
    });

   const sender = e.request.from.uri.user;
const myUserId = uaInstance.configuration.uri.user;

function normalize(uri) {
  return uri.replace(/^sip:/, '').replace(/@.*$/, '');
}

const normalizedSender = normalize(sender);
const normalizedMyUserId = normalize(myUserId);

if (normalizedSender === normalizedMyUserId) {
  console.log("Skipping message from self or non-remote originator");
  return;
}


    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");

    if (contentType && contentType.includes("application/imdn+xml")) {
      console.log("[newMessage event] Received IMDN XML:", rawBody);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawBody, "application/xml");
      const messageIdNode = xmlDoc.getElementsByTagName("message-id")[0];
      const statusNode = xmlDoc.getElementsByTagName("status")[0];

      if (messageIdNode && statusNode) {
        const messageId = messageIdNode.textContent;
        if (statusNode.querySelector("delivered")) {
          console.log(`[newMessage event] Updating messageId=${messageId} with status='delivered'`);
          updateMessageStatus(messageId, "delivered");
        }
        if (statusNode.querySelector("display")) {
          console.log(`[newMessage event] Updating messageId=${messageId} with status='read'`);
          updateMessageStatus(messageId, "read");
        }
      } else {
        console.warn("[newMessage event] IMDN receipt missing message-id or status:", rawBody);
      }
      return;
    }

    if (contentType && contentType.includes("message/cpim")) {
      const parsed = parseCpimBody(rawBody);

      if ((!parsed.content || parsed.content === "") && rawBody.includes("imdn.Disposition-Notification")) {
        console.log("[newMessage event] Empty content with imdn.Disposition-Notification, ignoring.");
        return;
      }

      if (parsed.content) {
        console.log("[newMessage event] Received RCS message:", parsed);

        addMessage({
          from: parsed.from,
          to: parsed.to,
          content: parsed.content,
          datetime: parsed.datetime,
          messageId: parsed.messageId || generateContributionId(),
          status: 'received',
        });

        if (parsed.from && parsed.messageId) {
          const senderUri = `sip:${parsed.from}`;
          sendImdnReceipt(senderUri, parsed.messageId);
        }
      } else {
        console.warn("[newMessage event] Failed to parse CPIM body:", rawBody);
      }
    } else {
      // Plain text or unknown content type fallback
      if (!uaInstance || !uaInstance.configuration || !uaInstance.configuration.uri) {
        console.warn("[newMessage event] UA not initialized properly for plain text message handling");
        return;
      }

      const fromUser = e.request.from.uri.user || e.request.from.uri.toString();
      console.log("[newMessage event] Adding plain text message to store", { fromUser, rawBody });
      addMessage({
        from: fromUser,
        to: uaInstance.configuration.uri.user,
        content: rawBody,
        datetime: new Date().toISOString(),
        messageId: generateContributionId(),
        status: 'received',
      });
    }
  });
};
