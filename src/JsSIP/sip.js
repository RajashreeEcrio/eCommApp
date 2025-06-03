import { messages, addMessage, updateMessageStatus } from "../Store/store";
import { normalize } from "../utils/normalize.js";

let ua;
const socket = new JsSIP.WebSocketInterface("ws://192.168.1.70:5066");

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

    initializeReceive(ua, data.phoneNum);

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
    `imdn.Disposition-Notification: positive-delivery,display\r\n\r\n` +
    `Content-Type: text/plain;charset=UTF-8\r\n` +
    `Content-Length: ${message.length + 11}\r\n\r\n` +
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
    from: normalize(senderUri),
    to: normalize(to),
    content: message,
    datetime: now,
    messageId: contributionId,
    status: "sent",
  });

  return contributionId;
};

export const sendImdnReceipt = (toUri, messageId, status = "delivered") => {
  const now = new Date().toISOString();
  let xmlStatus = "";
  if (status === "displayed") {
    xmlStatus = `<display-notification>
      <status>displayed</status>
    </display-notification>`;
  } else {
    xmlStatus = `<delivery-notification>
      <status>delivered</status>
    </delivery-notification>`;
  }
  const imdnXml =
    `<?xml version="1.0" encoding="UTF-8"?>\r\n` +
    `<imdn xmlns="urn:ietf:params:xml:ns:imdn">\r\n` +
    `  <message-id>${messageId}</message-id>\r\n` +
    `  <datetime>${now}</datetime>\r\n` +
    `  ${xmlStatus}\r\n</imdn>`;

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
  updateMessageStatus(messageId, status);
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

  return {
    from: normalize(from),
    to: normalize(to),
    datetime,
    content,
    messageId,
  };
};

const initializeReceive = (uaInstance, myPhoneNum) => {
  uaInstance.on("newMessage", (e) => {
    if (e.originator !== "remote") return;

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");
    const myUser = uaInstance?.configuration?.uri?.user;

   // In initializeReceive function, modify the IMDN handling:
if (contentType && contentType.includes("application/imdn+xml")) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawBody, "application/xml");
  const messageIdNode = xmlDoc.getElementsByTagName("message-id")[0];
  const statusNode = xmlDoc.getElementsByTagName("status")[0];

  if (messageIdNode && statusNode) {
    const messageId = messageIdNode.textContent.trim();
    const statusText = statusNode.textContent.trim().toLowerCase();

    if (statusText === "delivered") {
      updateMessageStatus(messageId, "delivered");
    } else if (statusText === "displayed") {
      updateMessageStatus(messageId, "read"); // Change to "read" for consistency
    }
  }
  return;
}

    const parsed = parseCpimBody(rawBody);
    const from = parsed.from;
    const to = parsed.to;

    if (from === myUser) {
      return; // Ignore echo
    }

    const msgId = parsed.messageId || generateContributionId();

    addMessage({
      from,
      to,
      content: parsed.content,
      datetime: parsed.datetime,
      messageId: msgId,
      status: "received",
    });

    // Auto-send IMDN receipt
    if (from && msgId) {
      sendImdnReceipt(`sip:${from}`, msgId);
    }
  });
};
