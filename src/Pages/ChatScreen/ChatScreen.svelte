<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import { currentContact } from "../../Store/store";
  import "./style.css";

  let msg = "";
  let textref;
  $: chats = [];

  const messageSend = () => {
    if (msg.trim() === "") {
      alert("Message can't be empty");
    } else {
      let mArray = [...chats];
      mArray.push(msg);
      chats = mArray;
      msg = "";
    }
  };

  const voiceRecord = () => {};

  const delMessages = () => {
    chats = [];
  };

  const handleKeyDown = (e) => {
    // if (e.key === "Enter") {
    //   textref.focus();
    // }
  };

  onMount(() => {
    // textref.focus();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<div class="screen">
  <!-- header that has username & number -->
  <div class="header">
    <div class="leftbox">
      <button class="back" tabIndex="0" on:click={() => push("/contacts")}>
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="uname">
        <h4 style={{ color: "#fff" }}>{$currentContact.contact_name}</h4>
        <h6 style={{ color: "#fff" }}>{$currentContact.contact_id}</h6>
      </div>
    </div>
    {#if chats.length > 0}
      <button class="del" on:click={delMessages}>
        <i class="fa-solid fa-trash"></i>
      </button>
    {/if}
  </div>
  <hr style="color: #999;" />

  <!-- chat screen, where the msgs are displayed -->
  <div class="chatwindow">
    {#if chats.length > 0}
      {#each chats as currentmsg, index}
        <ChatBubble
          message={currentmsg}
          className={index % 2 === 0 ? "sendBubble" : "receiveBubble"}
        />
      {/each}
    {/if}
  </div>

  <!-- has input text box & send button -->
  <div class="box">
    <TextBox
      type="text"
      placeholder={"Message..."}
      className="textbox"
      onInput={(e) => (msg = e.target.value)}
      value={msg}
      ref={textref}
    />
    <button
      on:click={msg.trim() === "" ? voiceRecord : messageSend}
      class="sendBtn"
    >
      {#if msg.trim() === ""}
        <i class="fa-solid fa-microphone"></i>
      {:else}
        <i class="fa-solid fa-paper-plane"></i>
      {/if}
    </button>
  </div>
</div>
