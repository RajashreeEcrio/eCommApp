<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import {
    currentContact,
    messages,
    sipFormData,
    messageStatusMap,
    addMessage,
  } from "../../Store/store";
  import { sendMessage } from "../../JsSIP/sip";
  import "./style.css";

  let msg = "";
  let textref, sendref, backref, delref;

  // Reactive subscription to message statuses
  $: statuses = $messageStatusMap;

  // Filter and format messages for current chat contact
  $: chats = $messages
    .filter(
      (m) =>
        (m.from === $currentContact.contact_id && m.to === $sipFormData.phoneNum) ||
        (m.to === $currentContact.contact_id && m.from === $sipFormData.phoneNum)
    )
    .map((m) => {
      const isSend = m.from === $sipFormData.phoneNum;
      return {
        messagebody: m.content,
        className: isSend ? "send" : "receive",
        messageId: m.messageId,
        status: isSend ? (statuses[m.messageId] || "sent") : "received",
      };
    });

  const handleTextFocus = () => {
    if (textref) textref.focus();
  };

  const generateMessageId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Send message via SIP and update local store
  const messageSend = () => {
    if (!msg.trim()) {
      alert("Message can't be empty");
      return handleTextFocus();
    }

    const messageId = sendMessage(
      $currentContact.contact_id,
      msg,
      $sipFormData.phoneNum
    ) || generateMessageId();

    addMessage({
      from: $sipFormData.phoneNum,
      to: $currentContact.contact_id,
      content: msg,
      messageId,
      status: "sent",
    });

    msg = "";
    handleTextFocus();
  };

  // Delete all messages in the current conversation
  const delMessages = () => {
    messages.update((msgs) =>
      msgs.filter(
        (m) =>
          !(
            (m.from === $currentContact.contact_id && m.to === $sipFormData.phoneNum) ||
            (m.to === $currentContact.contact_id && m.from === $sipFormData.phoneNum)
          )
      )
    );
  };

  // Keyboard shortcuts and soft key handling
  const handleKeyDown = (e) => {
    if (e.key === "Enter") messageSend();
    else if (e.key === "SoftLeft") backref?.click();
    else if (e.key === "SoftRight" && msg) msg = msg.slice(0, -1);
    else if (e.key === "ArrowUp") delref?.click();
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="screen">
  <!-- Header -->
  <div class="header">
    <div class="leftbox">
      <button bind:this={backref} class="back" on:click={() => push("/contacts")}>
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
      <ChatBubble
        message={currentmsg.messagebody}
        className={currentmsg.className === "send" ? "sendBubble" : "receiveBubble"}
        status={currentmsg.className === "send" ? (statuses[currentmsg.messageId] || "sent") : ""}
      />
    {/each}
  </div>

  <!-- Input box -->
  <div class="box">
    <TextBox
      placeholder="Message..."
      bind:value={msg}
      bind:ref={textref}
    />
    <button bind:this={sendref} on:click={messageSend} class="sendBtn">
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </div>
</div>
