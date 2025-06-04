<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import {
    updateMessageStatus,
    messages,
    currentContact,
    sipFormData,
    messageStatusMap,
  } from "../../Store/store";
  import { sendImdnReceipt, sendMessage } from "../../JsSIP/sip";
  import { normalize } from "../../utils/normalize";
  import "./style.css";

  let msg = "";
  let textref, sendref, backref, delref;
  let chats = [];
  let seenMessages = new Set();
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
          ? ($messageStatusMap[m.messageId] || "sent") 
          : ($messageStatusMap[m.messageId] || "delivered"),
          from: m.from,
          to: m.to,
        };
      });
       sendDisplayedReceipts();
  }

  //  Send displayed receipt when message is received and chat screen is open
   function isMessageVisible(messageId) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
  }

  // Function to send displayed receipts for all eligible messages
    function sendDisplayedReceipts() {
    const me = normalize($sipFormData.phoneNum);
    const contact = normalize($currentContact.contact_id);

    chats.forEach(msg => {
      const isIncoming = normalize(msg.from) === contact;
      const isDelivered = msg.status === "delivered";
      const notYetDisplayed = !displayedMessages.has(msg.messageId);
      const isVisible = isMessageVisible(msg.messageId);

      if (isIncoming && isDelivered && notYetDisplayed && isVisible) {
         console.log("[DISPLAYED SENT]", msg.messageId);
        displayedMessages.add(msg.messageId);
        sendImdnReceipt(`sip:${msg.from}@ecrio.com`, msg.messageId, "displayed");
        console.log("[IMDN] Displayed receipt sent:", msg.messageId);
      }
    });
  }

  onMount(() => {
    // Initial check after UI renders
    setTimeout(sendDisplayedReceipts, 300);
    
    // Check when scrolling
    const chatWindow = document.querySelector('.chatwindow');
    if (chatWindow) chatWindow.addEventListener('scroll', sendDisplayedReceipts);
    
    return () => {
      if (chatWindow) chatWindow.removeEventListener('scroll', sendDisplayedReceipts);
    };
  });

  // Check when messages change
  $: if ($messages) {
    setTimeout(sendDisplayedReceipts, 100);
  }

  const handleTextFocus = () => {
    textref?.focus();
  };

  const messageSend = () => {
    if (!msg.trim()) {
      alert("Message can't be empty");
      return handleTextFocus();
    }

    const messageId = sendMessage(
      $currentContact.contact_id,
      msg,
      $sipFormData.phoneNum
    );

    msg = "";
    handleTextFocus();
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") messageSend();
    else if (e.key === "SoftLeft") backref?.click();
    else if (e.key === "SoftRight" && msg) msg = msg.slice(0, -1);
    else if (e.key === "ArrowUp") delref?.click();
  };

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
      id={"msg-" + currentmsg.messageId}
      message={currentmsg.messagebody}
      className={currentmsg.className}
      status={currentmsg.className === "sendBubble" ? (statuses[currentmsg.messageId] || "sent") : ""}
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
