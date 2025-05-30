<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import {
    currentContact,
    receiveMsg,
    sipFormData,
    messageStatusMap
  } from "../../Store/store";
  import { sendMessage } from "../../JsSIP/sip";
  import "./style.css";

  let msg = "";
  let textref, sendref, backref, delref;
  let chats = [];

  // Reactive subscription to message statuses
  $: statuses = $messageStatusMap;

  // Focus text input box
  const handleTextFocus = () => {
    if (textref) textref.focus();
    else console.warn("textref is null, cannot focus");
  };

  const messageSend = () => {
    if (!msg.trim()) {
      alert("Message can't be empty");
      return handleTextFocus();
    }

    // sendMessage returns messageId for tracking read receipts
    const messageId = sendMessage(
      $currentContact.contact_id,
      msg,
      $sipFormData.phoneNum
    );

    // Add sent message to local chat list
    chats = [
      ...chats,
      {
        messagebody: msg,
        className: "send",
        messageId,
         status: 'sent'
      }
    ];

    msg = "";
    handleTextFocus();
  };

  const delMessages = () => {
    chats = [];
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendref.click();
    else if (e.key === "SoftLeft") backref.click();
    else if (e.key === "SoftRight" && msg) msg = msg.slice(0, -1);
    else if (e.key === "ArrowUp") delref.click();
  };

  // Append received messages when receiveMsg store updates
  $: if ($receiveMsg) {
    // Avoid duplicate received messages
    if (
      !$receiveMsg.trim() ||
      chats.some(c => c.messagebody === $receiveMsg && c.className === "receive")
    ) {
      // do nothing
    } else {
      chats = [
        ...chats,
        {
          messagebody: $receiveMsg,
          className: "receive",
          messageId: null,
           status: "received"
        }
      ];
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Watch for messageStatusMap changes and update status in chats
$: {
  chats = chats.map(chat => {
    if (chat.className === "send" && chat.messageId && statuses[chat.messageId]) {
      return {
        ...chat,
        status: statuses[chat.messageId]
      };
    }
    return chat;
  });
}

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
