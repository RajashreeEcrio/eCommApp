<script>
  import { afterUpdate, onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import {
    messages,
    currentContact,
    sipFormData,
    messageStatusMap,
  } from "../../Store/store";
  import { sendImdnReceipt, sendMessage } from "../../JsSIP/sip";
  import { normalize } from "../../utils/normalize";
  import "./style.css";
  import SparkMD5 from "spark-md5";

  $: msg = "";
  let fileref;
  let chatContainerRef;
  $: chats = [];
  let textref, sendref, backref, delref;
  let chats = [];
  let displayedMessages = new Set();

  $: statuses = $messageStatusMap;

  $: {
    const me = normalize($sipFormData.phoneNum);
    const contact = normalize($currentContact.contact_id);

    chats = $messages
      .filter(
        (m) =>
          (normalize(m.from) === contact && normalize(m.to) === me) ||
          (normalize(m.from) === me && normalize(m.to) === contact)
      )
      .map((m) => {
        const isFromMe = normalize(m.from) === me;
        return {
          messagebody: m.content,
          className: isFromMe ? "sendBubble" : "receiveBubble",
          messageId: m.messageId,
          status: isFromMe
            ? $messageStatusMap[m.messageId] || "sent"
            : $messageStatusMap[m.messageId] || "delivered",
          from: m.from,
          to: m.to,
          type: m.type,
          datetime: m.datetime,
        };
      });
    sendDisplayedReceipts();
  }

  //  Send displayed receipt when message is received and chat screen is open
  function isMessageVisible(messageId) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight)
    );
  }

  // Function to send displayed receipts for all eligible messages
  function sendDisplayedReceipts() {
    const me = normalize($sipFormData.phoneNum);
    const contact = normalize($currentContact.contact_id);

    chats.forEach((msg) => {
      const isIncoming = normalize(msg.from) === contact;
      const isDelivered = msg.status === "delivered";
      const notYetDisplayed = !displayedMessages.has(msg.messageId);
      const isVisible = isMessageVisible(msg.messageId);

      if (isIncoming && isDelivered && notYetDisplayed && isVisible) {
        displayedMessages.add(msg.messageId);
        sendImdnReceipt(
          `sip:${msg.from}@ecrio.com`,
          msg.messageId,
          "displayed"
        );
      }
    });
  }

  // Check when messages change
  $: if ($messages) {
    setTimeout(sendDisplayedReceipts, 100);
  }

  const handleTextFocus = () => {
    textref?.focus();
  };

  const generateTid = () => {
    const hex = "0123456789abcdef";
    let tid = "";
    for (let i = 0; i < 16; i++) {
      tid += hex[Math.floor(Math.random() * 16)];
    }
    return tid;
  };

  const messageSend = () => {
    if (!msg.trim()) {
      alert("Message can't be empty");
      return handleTextFocus();
    } else {
      sendMessage(
        $currentContact.contact_id,
        msg,
        $sipFormData.phoneNum,
        "text"
      );
    }

    msg = "";
    handleTextFocus();
  };

  const fileSend = async (e) => {
    const file = e.target.files[0];
    let file64 = URL.createObjectURL(file);
    const link = "/apiFile/api/v1/content";

    const formData = new FormData();
    formData.append("tid", generateTid());
    formData.append("File", file);

    try {
      const response = await fetch(link, {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        const authHeader = response.headers.get("www-authenticate");
        console.warn("Server responded with", response.status);

        const authRegex = /(\w+)=["]?([^",]+)["]?/g;
        const authParams = {};
        let match;

        while ((match = authRegex.exec(authHeader))) {
          authParams[match[1]] = match[2];
        }

        const usrname = $sipFormData.phoneNum;
        const pwd = $sipFormData.password;
        const uri = "http://100.26.110.107:30017/api/v1/content";
        const realm = authParams.realm;
        const nonce = authParams.nonce;
        const nc = "00000001";
        const qop = authParams.qop;
        const opaque = authParams.opaque;
        const cnonce = Math.random().toString(36).slice(2, 16);

        const ha1 = SparkMD5.hash(`${usrname}:${realm}:${pwd}`);
        const ha2 = SparkMD5.hash(`POST:${uri}`);
        const responseHash = SparkMD5.hash(
          `${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`
        );

        const authString = `Digest username="${usrname}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}", opaque="${opaque}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

        const finalRes = await fetch(link, {
          method: "POST",
          headers: {
            Authorization: authString,
          },
          body: formData,
        });
        if (finalRes.ok) {
          const xmltext = await finalRes.text();

          // sending SIP message
          sendMessage(
            $currentContact.contact_id,
            xmltext,
            $sipFormData.phoneNum,
            "image",
            file64
          );
        } else {
          console.error("Final upload failed:", finalRes.status);
        }
      } else {
        console.log("Upload successful:");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const delMessages = () => {
    messages.update((msgs) =>
      msgs.filter(
        (m) =>
          !(
            (normalize(m.from) === normalize($currentContact.contact_id) &&
              normalize(m.to) === normalize($sipFormData.phoneNum)) ||
            (normalize(m.to) === normalize($currentContact.contact_id) &&
              normalize(m.from) === normalize($sipFormData.phoneNum))
          )
      )
    );
  };

  // Handling D-pad navigation
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendref.click();
    } else if (e.key === "SoftLeft") {
      backref.click();
    } else if (e.key === "SoftRight") {
      if (msg.trim !== "") {
        msg = msg.slice(0, msg.length - 1);
      }
    } else if (e.key === "ArrowLeft") {
      fileref.click();
    } else if (e.key === "ArrowUp") {
      delref.click();
    }
  };

  const scrollToBottom = (force = false) => {
    if (!chatContainerRef) return;

    const threshold = 100;
    const distanceFromBottom =
      chatContainerRef.scrollHeight -
      chatContainerRef.scrollTop -
      chatContainerRef.clientHeight;

    if (force || distanceFromBottom <= threshold) {
      chatContainerRef.scrollTo({
        top: chatContainerRef.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Auto Scroll
  afterUpdate(() => {
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  });

  // Autofocus Textbox onload
  onMount(() => {
    // Initial check after UI renders
    setTimeout(sendDisplayedReceipts, 300);

    // Check when scrolling
    const chatWindow = document.querySelector(".chatwindow");
    if (chatWindow) {
      chatWindow.addEventListener("scroll", sendDisplayedReceipts);
    }

    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();

    return () => {
      if (chatWindow) {
        chatWindow.removeEventListener("scroll", sendDisplayedReceipts);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<div class="screen">
  <!-- Header -->
  <div class="header">
    <div class="leftbox">
      <button
        bind:this={backref}
        class="back"
        on:click={() => push("/contacts")}
      >
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="uname">
        <h4>{$currentContact.contact_name}</h4>
        <h6>{$currentContact.contact_id}</h6>
      </div>
    </div>
    {#if chats.length}
      <button bind:this={delref} class="del" on:click={delMessages}>
        <i class="fa-solid fa-trash"></i>
      </button>
    {/if}
  </div>
  <hr />

  <!-- Chat window -->
  <div class="chatwindow">
    {#each chats as currentmsg}
      {#if currentmsg.type === "image"}
        <ChatBubble
          id={"msg-" + currentmsg.messageId}
          message={currentmsg.messagebody}
          className={currentmsg.className === "sendBubble"
            ? "sendImageBubble"
            : "receiveImageBubble"}
          status={currentmsg.className === "sendBubble"
            ? statuses[currentmsg.messageId] || "sent"
            : ""}
          type={currentmsg.type}
          time={currentmsg.datetime}
        />
      {:else}
        <ChatBubble
          id={"msg-" + currentmsg.messageId}
          message={currentmsg.messagebody}
          className={currentmsg.className}
          status={currentmsg.className === "sendBubble"
            ? statuses[currentmsg.messageId] || "sent"
            : ""}
          time={currentmsg.datetime}
        />
      {/if}
    {/each}
  </div>

  <!-- Input box -->
  <div class="box">
    <input
      type="file"
      style="display:none;"
      bind:this={fileref}
      on:change={fileSend}
      accept="image/*"
    />
    <button
      on:click={() => {
        fileref.click();
      }}
      class="fileBtn"
    >
      <i class="fa-solid fa-image"></i>
    </button>
    <TextBox
      type="text"
      placeholder={"Message..."}
      className="textbox"
      onInput={(e) => (msg = e.target.value)}
      value={msg}
      bind:ref={textref}
    />
    <button bind:this={sendref} on:click={messageSend} class="sendBtn">
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </div>
</div>
