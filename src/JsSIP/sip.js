import { get } from "svelte/store";
import { addMessage, updateMessageStatus, sipFormData } from "../Store/store";
import { normalize } from "../utils/normalize.js";
import SparkMD5 from "spark-md5";

let ua;

const ip = "192.168.227.217";

const socket = new JsSIP.WebSocketInterface(`ws://${ip}:5066`);

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

export const sendMessage = (to, message, senderUri, type, image) => {
  if (!ua) {
    console.log("[sendMessage] SIP UA not initialized");
    return;
  }

  const now = new Date().toISOString();
  const contributionId = generateContributionId();
  const content =
    type === "image"
      ? `IMAGE:::-:::${message}###-###`
      : `TEXT:::-:::${message}`;
  const contentLength = message.length + (type === "image" ? 19 : 11);
  const contentType =
    type === "image" ? "application/vnd.3gpp2.sms" : "message/cpim";
  const AcceptContact =
    type === "image"
      ? "*;urn:urn-7:3gpp-service.ims.icsi.oma.cpm.msg"
      : '*;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg";require;explicit';
  const PreferredService =
    type === "image"
      ? "urn:urn-7:3gpp-service.ims.icsi.oma.cpm.msg.group"
      : '+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg';

  const cpimBody =
    `From: <sip:${senderUri}@ecrio.com>\r\n` +
    `To: <sip:${to}@ecrio.com>\r\n` +
    `DateTime: ${now}\r\n` +
    `NS: imdn <urn:ietf:params:imdn>\r\n` +
    `imdn.Message-ID: ${contributionId}\r\n` +
    `imdn.Disposition-Notification: positive-delivery,display\r\n\r\n` +
    `Content-Type: text/plain;charset=UTF-8\r\n` +
    `Content-Length: ${contentLength}\r\n\r\n` +
    `${content}`;

  const messageOptions = {
    contentType: contentType,
    extraHeaders: [
      `Accept-Contact: ${AcceptContact}`,
      `P-Preferred-Identity: <sip:${senderUri}@ecrio.com>`,
      `P-Preferred-Service: ${PreferredService}`,
      "Request-Disposition: no-fork",
      `Route: <sip:${ip}:9090;lr>`,
      `Conversation-ID: ${contributionId}`,
      `Contribution-ID: ${contributionId}`,
    ],
  };

  const target = `sip:${to}@ecrio.com`;

  if (type === "image") {
    ua.sendMessage(target, content, messageOptions);

    addMessage({
      from: normalize(senderUri),
      to: normalize(to),
      content: image,
      datetime: now,
      messageId: contributionId,
      status: "sent",
      type: type,
    });
  } else {
    ua.sendMessage(target, cpimBody, messageOptions);

    addMessage({
      from: normalize(senderUri),
      to: normalize(to),
      content: message,
      datetime: now,
      messageId: contributionId,
      status: "sent",
      type: type,
    });
  }
  setTimeout(() => {
    console.log(`[Mock IMDN] Updating ${contributionId} to 'delivered'`);

    const didUpdate = updateMessageStatus(contributionId, "delivered");
    if (!didUpdate) {
      console.warn(`[Mock IMDN] 'delivered' mock failed for ${contributionId}`);
    }
  }, 2000);

  setTimeout(() => {
    console.log(`[Mock IMDN] Updating ${contributionId} to 'read'`);

    const didUpdate = updateMessageStatus(contributionId, "read");
    if (!didUpdate) {
      console.warn(`[Mock IMDN] 'read' mock failed for ${contributionId}`);
    }
  }, 5000);
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
      `Route: <sip:${ip}:9090;lr>`,
    ],
  };

  ua.sendMessage(toUri, imdnXml, messageOptions);
};

const extractTidfromXML = (xmlbody) => {
  const xmlparser = new DOMParser();
  const xmlDoc = xmlparser.parseFromString(xmlbody, "application/xml");
  const dataTag = xmlDoc.querySelector("data");
  if (dataTag) {
    const responseURL = dataTag.getAttribute("url");
    if (responseURL) {
      const parts = responseURL.split("/");
      return parts[parts.length - 1];
    }
  }
};

const normalizeAndroidDate = (rawDate) => {
  const raw = new Date(rawDate);
  const nowUTC = new Date();

  if (!isNaN(raw.getTime())) {
    const diffInHours = (raw.getTime() - nowUTC.getTime()) / (1000 * 60 * 60);
    if (diffInHours > 1.5 && diffInHours < 6.5) {
      return new Date(raw.getTime() - 5.5 * 60 * 60 * 1000).toISOString();
    } else {
      return raw.toISOString();
    }
  }

  return new Date().toISOString();
};

const parseCpimBody = (body, e) => {
  console.log("reached parse section");

  const imageMatch = body.match(/IMAGE:::-:::\s*([\s\S]*?)###-###/);
  const textMatch = body.match(/TEXT:::-:::(.*)/s);

  let content;
  let type = "text";

  if (imageMatch) {
    content = extractTidfromXML(imageMatch[1].trim());
    console.log(content, imageMatch[1], imageMatch);

    type = "image";
  } else if (textMatch) {
    content = textMatch[1].trim();
  }

  const from = e.request.getHeader("From");

  const to = e.request.getHeader("To");

  const now = new Date().toISOString();
  const dateMatch = body.match(/^DateTime:\s*(.+)$/m);
  const datetime = dateMatch ? normalizeAndroidDate(dateMatch[1].trim()) : now;

  const messageId = e.request.getHeader("Conversation-ID")
    ? e.request.getHeader("Conversation-ID")
    : null;

  return {
    from: normalize(from),
    to: normalize(to),
    datetime,
    content,
    messageId,
    type: type,
  };
};

const downloadFile = async (tid) => {
  const link = `/apiFile/content/File/${tid}`;
  const { phoneNum: usrname, password: pwd } = get(sipFormData);

  try {
    const response = await fetch(link, { method: "GET" });
    if (response.status === 401) {
      const authHeader = response.headers.get("www-authenticate");
      console.warn("Server responded with", response.status);
      console.log("WWW-Authenticate:", authHeader);

      const authRegex = /(\w+)=["]?([^",]+)["]?/g;
      const authParams = {};
      let match;

      while ((match = authRegex.exec(authHeader))) {
        authParams[match[1]] = match[2];
      }

      const uri = `/content/File/${tid}`;
      const realm = authParams.realm;
      const nonce = authParams.nonce;
      const nc = "00000001";
      const qop = authParams.qop;
      const opaque = authParams.opaque;
      const cnonce = Math.random().toString(36).slice(2, 10);

      const ha1 = SparkMD5.hash(`${usrname}:${realm}:${pwd}`);
      const ha2 = SparkMD5.hash(`GET:${uri}`);
      const responseHash = SparkMD5.hash(
        `${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`
      );

      const authString = `Digest username="${usrname}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}", opaque="${opaque}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
      console.log(authString);

      const finalRes = await fetch(link, {
        method: "GET",
        headers: {
          Authorization: authString,
        },
      });
      if (finalRes.ok) {
        const blob = await finalRes.blob();

        const imgURL = URL.createObjectURL(blob);

        return imgURL;
      } else {
        console.error("Final upload failed:", finalRes.status);
      }
    } else {
      console.log("Fetching successful:");
    }
  } catch (error) {
    console.log("Failed to fetch Image:", error);
  }
};

const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", async (e) => {
    if (e.originator !== "remote") return;

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");
    const myUser = uaInstance?.configuration?.uri?.user;

    // In initializeReceive function, modify the IMDN handling:
    if (contentType.includes("application/imdn+xml")) {
      const messageId = rawBody
        .match(/<message-id>([^<]+)<\/message-id>/)?.[1]
        ?.trim();
      const status = rawBody
        .match(/<status>([^<]+)<\/status>/)?.[1]
        ?.trim()
        ?.toLowerCase();

      if (messageId && status) {
        if (status === "delivered") {
          updateMessageStatus(messageId, "delivered");
        } else if (status === "displayed") {
          updateMessageStatus(messageId, "read");
        }
      }
      return; // Skip further processing for IMDN
    }

    const parsed = parseCpimBody(rawBody, e);

    if (parsed.from === myUser) {
      return; // Ignore echo
    }

    const msgId = parsed.messageId || generateContributionId();

    if (parsed.type === "image") {
      const img = await downloadFile(parsed.content);
      addMessage({
        from: parsed.from,
        to: parsed.to,
        content: img,
        datetime: parsed.datetime,
        messageId: msgId,
        status: "received",
        type: parsed.type,
      });
    } else {
      addMessage({
        from: parsed.from,
        to: parsed.to,
        content: parsed.content,
        datetime: parsed.datetime,
        messageId: msgId,
        status: "received",
        type: parsed.type,
      });
    }

    // Auto-send IMDN receipt
    if (parsed.from && msgId) {
      sendImdnReceipt(`sip:${parsed.from}`, msgId);
    }
  });
};
