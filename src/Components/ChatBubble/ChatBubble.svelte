<script>
  export let id = "";
  export let message = "";
  export let className = "";
  export let status = ""; // "sent", "delivered", "read"
</script>

<div id={id} class={"chat-bubble " + className}>
  <div class="content">
    <span class="msg">{message}</span>

    {#if className === "sendBubble" && status}
      <span class="tick">
        {#if status === "sent"}
          ✓
        {:else if status === "delivered"}
          ✓✓
        {:else if status === "read"}
          <span class="blue-ticks">✓✓</span>
        {/if}
      </span>
    {/if}
  </div>
</div>


<style>
  .chat-bubble {
    max-width: 80%;
    margin: 4px;
    padding: 6px 10px;
    border-radius: 12px;
    font-size: 14px;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
  }

  .content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }

  .sendBubble {
    align-self: flex-end;
    background-color: rgba(92, 128, 0, 0.924);
    color: white;
    border-top-right-radius: 0;
  }

  .receiveBubble {
    align-self: flex-start;
    background-color: rgb(54 137 202);
    color: #fff;
    border-top-left-radius: 0;
  }

  .tick {
    font-size: 12px;
    opacity: 0.8;
    white-space: nowrap;
  }

  .blue-ticks {
    color: #00eaff;
  }

  .msg {
    word-break: break-word;
  }
</style>
