<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import {
    currentContact,
    receiveMsgStore,
    sipFormData,
    addMessage,
    clearMessagesForContact,
  } from "../../Store/store";
  import { sendMessage } from "../../JsSIP/sip";
  import { get } from "svelte/store";
   import { messages,messageStatusMap} from '../../Store/store.js';

  let message = "";
   
  let uaInitialized = false;

  // Register SIP on component mount
  onMount(async () => {
    try {
      const data = get(sipFormData);
      if (!uaInitialized) {
        await import("../../JsSIP/sip.js").then(async ({ registerSIP }) => {
          await registerSIP(data);
          uaInitialized = true;
          console.log("SIP registered in ChatScreen");
        });
      }
    } catch (error) {
      console.error("Error registering SIP:", error);
    }
  });

  // Send message handler
  const handleSendMessage = () => {
    const contact = get(currentContact);
    const data = get(sipFormData);

    if (!contact || !contact.phone) {
      alert("Select a contact to send a message");
      return;
    }

    if (message.trim() === "") {
      alert("Message cannot be empty");
      return;
    }

    sendMessage(contact.phone, message, data.phoneNum);
    addMessage({
      id: Math.random().toString(36).substring(2, 15),
      sender: data.phoneNum,
      text: message,
      timestamp: new Date().toISOString(),
    });
    message = "";
  };

  // Clear chat handler
  const clearChat = () => {
    const contact = get(currentContact);
    if (contact) {
      clearMessagesForContact(contact.phone);
    }
  };

  // Go back handler
  const goBack = () => {
    push("/contacts");
  };
</script>

<style>
  .chatScreen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f0f0f0;
  }
  .chatHeader {
    padding: 10px;
    background-color: #075e54;
    color: white;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .chatMessages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
  }
  .chatInputArea {
    padding: 10px;
    background-color: #ddd;
    display: flex;
    gap: 10px;
  }
</style>

<div class="chatScreen">
  <div class="chatHeader">
    <button on:click={goBack}>Back</button>
    <span>{get(currentContact)?.name || "No Contact Selected"}</span>
    <button on:click={clearChat}>Clear</button>
  </div>

  <div class="chatMessages">
    {#each $messages as msg (msg.id)}
      <ChatBubble
        className={msg.sender === get(sipFormData).phoneNum ? "sendBubble" : "receiveBubble"}
        message={msg.text}
        status={$messageStatusMap[msg.id]}
      />
    {/each}
  </div>

  <div class="chatInputArea">
    <TextBox
      bind:value={message}
      placeholder="Type a message..."
      on:keypress={(e) => e.key === "Enter" && handleSendMessage()}
    />
    <button on:click={handleSendMessage}>Send</button>
  </div>
</div>
