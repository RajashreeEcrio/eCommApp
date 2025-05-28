<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import { currentContact, receiveMsgStore, sipFormData, addMessage, clearMessagesForContact } from "../../Store/store";
  import { sendMessage } from "../../JsSIP/sip";
  import { derived } from "svelte/store";

  let msg = "";
  let textref, sendref, backref, delref;

  // Derive chats reactively from receiveMsgStore and currentContact
  const chats = derived(
    [receiveMsgStore, currentContact, sipFormData],
    ([$receiveMsgStore, $currentContact, $sipFormData]) =>
      $receiveMsgStore
        .filter(
          (m) =>
            m.from.includes($currentContact.contact_id) ||
            m.to.includes($currentContact.contact_id)
        )
        .map((m) => ({
          id: m.messageId,
          messagebody: m.content,
          className: m.from.includes($sipFormData.phoneNum) ? "send" : "receive",
          status: m.status,
        }))
  );

  // Subscribe to chats for local updates
  let localChats = [];
  const unsubscribe = chats.subscribe((value) => {
    localChats = value;
  });

  const handleTextFocus = () => {
    textref?.focus();
  };

  const updateMessageTickUI = (messageId, status) => {
    // Update localChats first
    localChats = localChats.map((chat) =>
      chat.id === messageId ? { ...chat, status } : chat
    );

    // Also update the global receiveMsgStore
    receiveMsgStore.update((messages) =>
      messages.map((msg) =>
        msg.messageId === messageId ? { ...msg, status } : msg
      )
    );
  };

  const messageSend = () => {
    if (msg.trim() === "") {
      alert("Message can't be empty");
      return;
    }
    const messageId = Date.now(); // unique ID

    const newMsg = {
      messageId,
      content: msg,
      from: $sipFormData.phoneNum,
      to: $currentContact.contact_id,
      status: "sent",
    };

    // Add message to global store (which updates UI via derived store)
    addMessage(newMsg);

    sendMessage($currentContact.contact_id, msg, $sipFormData.phoneNum);

    updateMessageTickUI(messageId, "sent");

    msg = "";
    handleTextFocus();
  };

  const delMessages = () => {
    // Remove messages for current contact from global store
    clearMessagesForContact($currentContact.contact_id);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && sendref) {
      sendref.click();
    } else if (e.key === "SoftLeft" && backref) {
      backref.click();
    } else if (e.key === "SoftRight") {
      if (msg.trim() !== "") {
        msg = msg.slice(0, -1);
      }
    } else if (e.key === "ArrowUp" && delref) {
      delref.click();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unsubscribe();
    };
  });
</script>

<div class="screen">
  <div class="header">
    <div class="leftbox">
      <button
        bind:this={backref}
        class="back"
        tabIndex="0"
        on:click={() => push("/contacts")}
      >
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="uname">
        <h4 style="color: #fff;">{$currentContact.contact_name}</h4>
        <h6 style="color: #fff;">{$currentContact.contact_id}</h6>
      </div>
    </div>
    {#if localChats.length > 0}
      <button bind:this={delref} class="del" on:click={delMessages}>
        <i class="fa-solid fa-trash"></i>
      </button>
    {/if}
  </div>

  <hr style="color: #999;" />

  <div class="chatwindow">
    {#if localChats.length > 0}
      {#each localChats as currentmsg (currentmsg.id)}
        <ChatBubble
          id={currentmsg.id}
          message={currentmsg.messagebody}
          status={currentmsg.status}
          className={currentmsg.className === "send" ? "sendBubble" : "receiveBubble"}
        />
      {/each}
    {:else}
      <p class="no-messages">No messages yet.</p>
    {/if}
  </div>

  <div class="box">
    <TextBox
      type="text"
      placeholder="Message..."
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
